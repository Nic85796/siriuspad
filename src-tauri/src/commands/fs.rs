use crate::{
    models::{Note, NoteMetadata},
    storage,
};

#[tauri::command]
pub fn ensure_dirs() -> Result<(), String> {
    storage::ensure_directories()
}

#[tauri::command]
pub fn list_notes(workspace: Option<String>) -> Result<Vec<NoteMetadata>, String> {
    storage::list_note_metadata(workspace)
}

#[tauri::command]
pub fn read_note(id: String) -> Result<Note, String> {
    storage::read_note(&id)
}

#[tauri::command]
pub fn write_note(note: Note) -> Result<(), String> {
    storage::write_note(note)
}

#[tauri::command]
pub fn delete_note(id: String) -> Result<(), String> {
    storage::delete_note(&id)
}

#[tauri::command]
pub fn trash_note(id: String) -> Result<(), String> {
    storage::move_note_to_trash(&id)
}

#[tauri::command]
pub fn list_workspaces() -> Result<Vec<String>, String> {
    storage::list_workspace_names()
}

#[tauri::command]
pub fn create_workspace(name: String) -> Result<(), String> {
    storage::create_workspace(&name)
}

#[tauri::command]
pub fn rename_workspace(current_name: String, next_name: String) -> Result<(), String> {
    storage::rename_workspace(&current_name, &next_name)
}

#[tauri::command]
pub fn delete_workspace(name: String, fallback_workspace: String) -> Result<(), String> {
    storage::delete_workspace(&name, &fallback_workspace)
}
