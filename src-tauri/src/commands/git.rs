#[cfg(desktop)]
use std::process::Command;
use std::path::{Path, PathBuf};

use crate::storage;

#[derive(Debug, Clone, serde::Serialize)]
pub struct GitResult {
    pub success: bool,
    pub output: String,
    pub error: Option<String>,
}

#[cfg(desktop)]
#[derive(Debug)]
struct GitCommandOutput {
    success: bool,
    stdout: String,
    stderr: String,
}

#[cfg(desktop)]
fn repo_dir() -> Result<PathBuf, String> {
    storage::ensure_directories()?;
    storage::notes_dir()
}

#[cfg(desktop)]
fn format_output(stdout: &str, stderr: &str) -> String {
    let stdout = stdout.trim();
    let stderr = stderr.trim();

    match (stdout.is_empty(), stderr.is_empty()) {
        (false, false) => format!("{stdout}\n{stderr}"),
        (false, true) => stdout.to_string(),
        (true, false) => stderr.to_string(),
        (true, true) => String::new(),
    }
}

#[cfg(desktop)]
fn run_git(repo: &Path, args: &[&str]) -> Result<GitCommandOutput, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(repo)
        .output()
        .map_err(|error| format!("Falha ao executar git {}: {error}", args.join(" ")))?;

    Ok(GitCommandOutput {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
        stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
    })
}

#[cfg(desktop)]
fn result_from_output(output: GitCommandOutput) -> GitResult {
    GitResult {
        success: output.success,
        output: format_output(&output.stdout, &output.stderr),
        error: (!output.success).then(|| {
            if output.stderr.trim().is_empty() {
                "Git retornou um erro.".to_string()
            } else {
                output.stderr.trim().to_string()
            }
        }),
    }
}

#[cfg(desktop)]
fn ensure_local_identity(repo: &Path) -> Result<(), String> {
    let name = run_git(repo, &["config", "--get", "user.name"])?;
    if !name.success || name.stdout.trim().is_empty() {
        let result = run_git(repo, &["config", "user.name", "SiriusPad"])?;
        if !result.success {
            return Err(format_output(&result.stdout, &result.stderr));
        }
    }

    let email = run_git(repo, &["config", "--get", "user.email"])?;
    if !email.success || email.stdout.trim().is_empty() {
        let result = run_git(repo, &["config", "user.email", "local@siriuspad.invalid"])?;
        if !result.success {
            return Err(format_output(&result.stdout, &result.stderr));
        }
    }

    Ok(())
}

#[cfg(desktop)]
fn ensure_main_branch(repo: &Path) -> Result<(), String> {
    let result = run_git(repo, &["branch", "-M", "main"])?;
    if result.success {
        Ok(())
    } else {
        Err(format_output(&result.stdout, &result.stderr))
    }
}

#[cfg(desktop)]
fn remote_has_main(repo: &Path) -> Result<bool, String> {
    let result = run_git(repo, &["ls-remote", "--heads", "origin", "main"])?;
    if !result.success {
        return Ok(false);
    }

    Ok(!result.stdout.trim().is_empty())
}

#[tauri::command]
#[cfg(desktop)]
pub fn git_is_installed() -> bool {
    which::which("git").is_ok()
}

#[tauri::command]
#[cfg(mobile)]
pub fn git_is_installed() -> bool {
    false
}

#[tauri::command]
#[cfg(desktop)]
pub fn git_is_repo() -> Result<bool, String> {
    let repo = repo_dir()?;
    if !repo.exists() {
        return Ok(false);
    }

    let result = run_git(&repo, &["rev-parse", "--is-inside-work-tree"])?;
    Ok(result.success && result.stdout.trim() == "true")
}

#[tauri::command]
#[cfg(mobile)]
pub fn git_is_repo() -> Result<bool, String> {
    Ok(false)
}

#[tauri::command]
#[cfg(desktop)]
pub fn git_init() -> Result<GitResult, String> {
    let repo = repo_dir()?;

    if !git_is_installed() {
        return Ok(GitResult {
            success: false,
            output: String::new(),
            error: Some("Git não encontrado no sistema.".to_string()),
        });
    }

    let init = run_git(&repo, &["init"])?;
    if !init.success {
        return Ok(result_from_output(init));
    }

    if let Err(error) = ensure_main_branch(&repo) {
        return Ok(GitResult {
            success: false,
            output: init.stdout,
            error: Some(error),
        });
    }

    if let Err(error) = ensure_local_identity(&repo) {
        return Ok(GitResult {
            success: false,
            output: init.stdout,
            error: Some(error),
        });
    }

    Ok(GitResult {
        success: true,
        output: "Repositório Git iniciado na pasta das notas.".to_string(),
        error: None,
    })
}

#[tauri::command]
#[cfg(mobile)]
pub fn git_init() -> Result<GitResult, String> {
    Ok(GitResult {
        success: false,
        output: String::new(),
        error: Some("Git Sync está disponível apenas no desktop.".to_string()),
    })
}

#[tauri::command]
#[cfg(desktop)]
pub fn git_set_remote(url: String) -> Result<GitResult, String> {
    let repo = repo_dir()?;
    let remote_url = url.trim();

    if remote_url.is_empty() {
        return Ok(GitResult {
            success: false,
            output: String::new(),
            error: Some("URL do repositório Git está vazia.".to_string()),
        });
    }

    let existing = run_git(&repo, &["remote", "get-url", "origin"])?;
    if existing.success {
        if existing.stdout.trim() == remote_url {
            return Ok(GitResult {
                success: true,
                output: "Remote origin já configurado.".to_string(),
                error: None,
            });
        }

        let result = run_git(&repo, &["remote", "set-url", "origin", remote_url])?;
        return Ok(result_from_output(result));
    }

    let result = run_git(&repo, &["remote", "add", "origin", remote_url])?;
    Ok(result_from_output(result))
}

#[tauri::command]
#[cfg(mobile)]
pub fn git_set_remote(_url: String) -> Result<GitResult, String> {
    Ok(GitResult {
        success: false,
        output: String::new(),
        error: Some("Git Sync está disponível apenas no desktop.".to_string()),
    })
}

#[tauri::command]
#[cfg(desktop)]
pub fn git_sync() -> Result<GitResult, String> {
    let repo = repo_dir()?;

    if !git_is_installed() {
        return Ok(GitResult {
            success: false,
            output: String::new(),
            error: Some("Git não encontrado no sistema.".to_string()),
        });
    }

    ensure_main_branch(&repo)?;
    ensure_local_identity(&repo)?;

    let mut messages = Vec::new();

    let status = run_git(&repo, &["status", "--porcelain"])?;
    if !status.success {
        return Ok(result_from_output(status));
    }

    if !status.stdout.trim().is_empty() {
        let add = run_git(&repo, &["add", "-A"])?;
        if !add.success {
            return Ok(result_from_output(add));
        }
        if !add.stdout.trim().is_empty() || !add.stderr.trim().is_empty() {
            messages.push(format_output(&add.stdout, &add.stderr));
        }

        let commit_message = format!("SiriusPad sync {}", chrono::Utc::now().to_rfc3339());
        let commit = run_git(&repo, &["commit", "-m", &commit_message])?;
        if !commit.success {
            return Ok(result_from_output(commit));
        }
        if !commit.stdout.trim().is_empty() || !commit.stderr.trim().is_empty() {
            messages.push(format_output(&commit.stdout, &commit.stderr));
        }
    } else {
        messages.push("Nenhuma mudança local para commit.".to_string());
    }

    if remote_has_main(&repo)? {
        let pull = run_git(&repo, &["pull", "--rebase", "origin", "main"])?;
        if !pull.success {
            return Ok(result_from_output(pull));
        }
        if !pull.stdout.trim().is_empty() || !pull.stderr.trim().is_empty() {
            messages.push(format_output(&pull.stdout, &pull.stderr));
        }
    }

    let push = run_git(&repo, &["push", "-u", "origin", "main"])?;
    if !push.success {
        return Ok(result_from_output(push));
    }
    if !push.stdout.trim().is_empty() || !push.stderr.trim().is_empty() {
        messages.push(format_output(&push.stdout, &push.stderr));
    }

    Ok(GitResult {
        success: true,
        output: messages
            .into_iter()
            .filter(|message| !message.trim().is_empty())
            .collect::<Vec<_>>()
            .join("\n\n"),
        error: None,
    })
}

#[tauri::command]
#[cfg(mobile)]
pub fn git_sync() -> Result<GitResult, String> {
    Ok(GitResult {
        success: false,
        output: String::new(),
        error: Some("Git Sync está disponível apenas no desktop.".to_string()),
    })
}
