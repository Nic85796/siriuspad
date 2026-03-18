use std::{collections::HashMap, fs, process::Stdio, time::Duration};

use tempfile::tempdir;
use tokio::{process::Command, time::timeout};

use crate::models::RunResult;

struct InterpreterCommand {
    program: String,
    args: Vec<String>,
}

fn resolve_interpreter(language: &str) -> Result<InterpreterCommand, String> {
    let candidates = match language.to_lowercase().as_str() {
        "python" | "python3" => vec![
            ("python3", Vec::<&str>::new()),
            ("python", Vec::<&str>::new()),
        ],
        "javascript" | "node" => vec![("node", Vec::<&str>::new())],
        "typescript" | "ts" => vec![
            ("deno", vec!["run"]),
            ("ts-node", Vec::<&str>::new()),
            ("npx", vec!["ts-node"]),
        ],
        "bash" => vec![("bash", Vec::<&str>::new())],
        "sh" | "shell" => vec![("sh", Vec::<&str>::new()), ("bash", Vec::<&str>::new())],
        "ruby" => vec![("ruby", Vec::<&str>::new())],
        "go" => vec![("go", vec!["run"])],
        "lua" => vec![
            ("lua", Vec::<&str>::new()),
            ("lua5.4", Vec::<&str>::new()),
            ("lua5.3", Vec::<&str>::new()),
        ],
        other => return Err(format!("Unsupported language: {other}")),
    };

    for (program, args) in candidates {
        if which::which(program).is_ok() {
            return Ok(InterpreterCommand {
                program: program.to_string(),
                args: args.into_iter().map(str::to_string).collect(),
            });
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
        "typescript" | "ts" => "ts",
        "bash" | "sh" | "shell" => "sh",
        "ruby" => "rb",
        "go" => "go",
        "lua" => "lua",
        _ => "txt",
    }
}

fn prepare_script(language: &str, code: &str) -> String {
    if !language.eq_ignore_ascii_case("go") || code.contains("package main") {
        return code.to_string();
    }

    format!("package main\n\nfunc main() {{\n{code}\n}}\n")
}

#[tauri::command]
pub async fn run_snippet(
    code: String,
    language: String,
    env_vars: HashMap<String, String>,
    timeout_secs: Option<u64>,
) -> Result<RunResult, String> {
    let started_at = std::time::Instant::now();
    let interpreter = resolve_interpreter(&language)?;
    let extension = script_extension(&language);
    let temp_dir = tempdir().map_err(|error| error.to_string())?;
    let script_path = temp_dir.path().join(format!("snippet.{extension}"));
    let timeout_duration = Duration::from_secs(timeout_secs.unwrap_or(10));

    fs::write(&script_path, prepare_script(&language, &code)).map_err(|error| error.to_string())?;

    let mut command = Command::new(&interpreter.program);
    command.kill_on_drop(true);
    command.envs(env_vars);
    command.stdout(Stdio::piped());
    command.stderr(Stdio::piped());
    command.args(&interpreter.args);
    command.arg(&script_path);

    let output = timeout(timeout_duration, command.output()).await;
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
            stderr: format!(
                "Execution timed out after {} seconds.",
                timeout_duration.as_secs()
            ),
            exit_code: -1,
            duration_ms,
            timed_out: true,
        }),
    }
}
