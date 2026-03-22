mod commands;
mod models;
mod storage;

use commands::{ai, fs, history, platform, runner, search, terminal, updater};
#[cfg(mobile)]
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(updater::UpdateCache::default())
        .manage(terminal::TerminalState::default())
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        );

    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build());

    builder
        .setup(|app| {
            #[cfg(not(mobile))]
            let _ = app;

            #[cfg(mobile)]
            storage::set_app_data_dir({
                let path_api = app.path();
                path_api
                    .app_data_dir()
                    .or_else(|_| path_api.app_local_data_dir())
                    .map_err(|error| std::io::Error::new(std::io::ErrorKind::Other, error))?
            })
            .map_err(|error| std::io::Error::new(std::io::ErrorKind::Other, error))?;

            storage::ensure_directories()
                .map_err(|error| std::io::Error::new(std::io::ErrorKind::Other, error))?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ai::ai_chat,
            fs::ensure_dirs,
            fs::list_notes,
            fs::read_note,
            fs::get_note_directory,
            fs::write_note,
            fs::delete_note,
            fs::trash_note,
            fs::list_workspaces,
            fs::create_workspace,
            fs::rename_workspace,
            fs::delete_workspace,
            history::list_note_history,
            history::read_note_version,
            history::restore_note_version,
            platform::get_platform,
            runner::run_snippet,
            search::search_notes,
            terminal::terminal_create_session,
            terminal::terminal_write,
            terminal::terminal_interrupt,
            terminal::terminal_resize,
            terminal::terminal_close_session,
            updater::check_for_update,
            updater::download_update,
            updater::install_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
