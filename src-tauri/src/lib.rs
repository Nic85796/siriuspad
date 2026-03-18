mod commands;
mod models;
mod storage;

use commands::{fs, runner, search};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        );

    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_global_shortcut::Builder::new().build());

    builder
        .setup(|_| {
            storage::ensure_directories()
                .map_err(|error| std::io::Error::new(std::io::ErrorKind::Other, error))?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            fs::ensure_dirs,
            fs::list_notes,
            fs::read_note,
            fs::write_note,
            fs::delete_note,
            fs::trash_note,
            fs::list_workspaces,
            fs::create_workspace,
            fs::rename_workspace,
            fs::delete_workspace,
            runner::run_snippet,
            search::search_notes,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
