use std::{collections::HashMap, fs, process::Stdio, time::Duration};

use tempfile::tempdir;
use tokio::{process::Command, time::timeout};

use crate::models::RunResult;

fn resolve_interpreter(language: &str) -> Result<String, String> {
    let candidates = match language.to_lowercase().as_str() {
        "python" | "python3" => vec!["python3", "python"],
        "javascript" | "node" => vec!["node"],
        "bash" => vec!["bash"],
        "sh" | "shell" => vec!["sh", "bash"],
        "ruby" => vec!["ruby"],
        "go" => vec!["go"],
        other => return Err(format!("Unsupported language: {other}")),
    };

    for candidate in candidates {
        if which::which(candidate).is_ok() {
            return Ok(candidate.to_string());
        }
    }

    Err(format!(
        "No interpreter found for language '{}'. Install it and try again.",
        language
    ))
}

fn script_extension(language: &str) -> &'static str {
    match language.to_lowercase().as_str() {
        "python" | "python3" => "py",
        "javascript" | "node" => "js",
        "bash" | "sh" | "shell" => "sh",
        "ruby" => "rb",
        "go" => "go",
        _ => "txt",
    }
}

#[tauri::command]
pub async fn run_snippet(
    code: String,
    language: String,
    env_vars: HashMap<String, String>,
) -> Result<RunResult, String> {
    let started_at = std::time::Instant::now();
    let interpreter = resolve_interpreter(&language)?;
    let extension = script_extension(&language);
    let temp_dir = tempdir().map_err(|error| error.to_string())?;
    let script_path = temp_dir.path().join(format!("snippet.{extension}"));

    fs::write(&script_path, code).map_err(|error| error.to_string())?;

    let mut command = Command::new(&interpreter);
    command.kill_on_drop(true);
    command.envs(env_vars);
    command.stdout(Stdio::piped());
    command.stderr(Stdio::piped());

    if language.eq_ignore_ascii_case("go") {
        command.arg("run").arg(&script_path);
    } else {
        command.arg(&script_path);
    }

    let output = timeout(Duration::from_secs(10), command.output()).await;
    let duration_ms = started_at.elapsed().as_millis() as u64;

    match output {
        Ok(result) => {
            let output = result.map_err(|error| error.to_string())?;
            Ok(RunResult {
                stdout: String::from_utf8_lossy(&output.stdout).to_string(),
                stderr: String::from_utf8_lossy(&output.stderr).to_string(),
                exit_code: output.status.code().unwrap_or(-1),
                duration_ms,
                timed_out: false,
            })
        }
        Err(_) => Ok(RunResult {
            stdout: String::new(),
            stderr: "Execution timed out after 10 seconds.".into(),
            exit_code: -1,
            duration_ms,
            timed_out: true,
        }),
    }
}
