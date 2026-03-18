use std::{
    ffi::OsStr,
    fs,
    path::{Path, PathBuf},
};

use chrono::Utc;
use regex::Regex;
use uuid::Uuid;
use walkdir::WalkDir;

use crate::models::{Note, NoteMetadata};

const APP_DIR_NAME: &str = "siriuspad";
const DEFAULT_WORKSPACE: &str = "geral";

fn frontmatter_regex() -> Regex {
    Regex::new(r"(?s)\A---\r?\n(.*?)\r?\n---\r?\n?").expect("valid frontmatter regex")
}

fn now_iso() -> String {
    Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
}

pub fn build_excerpt(content: &str) -> String {
    let normalized = content.split_whitespace().collect::<Vec<_>>().join(" ");
    if normalized.chars().count() <= 160 {
        return normalized;
    }

    let excerpt = normalized.chars().take(157).collect::<String>();
    format!("{excerpt}...")
}

fn sanitize_workspace_name(name: &str) -> Result<String, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Workspace name cannot be empty.".into());
    }

    if trimmed == "." || trimmed == ".." {
        return Err("Workspace name is invalid.".into());
    }

    if trimmed.contains('/') || trimmed.contains('\\') {
        return Err("Workspace name cannot contain path separators.".into());
    }

    Ok(trimmed.to_string())
}

fn app_data_dir() -> Result<PathBuf, String> {
    let base = dirs::data_dir().ok_or_else(|| "Unable to resolve data directory.".to_string())?;
    Ok(base.join(APP_DIR_NAME))
}

pub fn notes_dir() -> Result<PathBuf, String> {
    Ok(app_data_dir()?.join("notes"))
}

pub fn trash_dir() -> Result<PathBuf, String> {
    Ok(app_data_dir()?.join("trash"))
}

fn default_workspace_dir() -> Result<PathBuf, String> {
    Ok(notes_dir()?.join(DEFAULT_WORKSPACE))
}

fn note_path_for(workspace: &str, id: &str) -> Result<PathBuf, String> {
    Ok(notes_dir()?.join(workspace).join(format!("{id}.md")))
}

fn parse_note_from_file(path: &Path, content: &str) -> Note {
    let workspace = path
        .parent()
        .and_then(Path::file_name)
        .and_then(OsStr::to_str)
        .unwrap_or(DEFAULT_WORKSPACE)
        .to_string();

    let base = Note {
        id: Uuid::new_v4().to_string(),
        title: "Untitled note".into(),
        workspace,
        language: "markdown".into(),
        tags: vec![],
        created_at: now_iso(),
        updated_at: now_iso(),
        pinned: false,
        content: content.to_string(),
    };

    let regex = frontmatter_regex();
    let Some(captures) = regex.captures(content) else {
        return base;
    };

    let Some(frontmatter_match) = captures.get(1) else {
        return base;
    };

    let Some(full_match) = captures.get(0) else {
        return base;
    };

    let body = content[full_match.end()..].to_string();

    #[derive(Debug, Default, serde::Deserialize)]
    struct Frontmatter {
        id: Option<String>,
        title: Option<String>,
        workspace: Option<String>,
        language: Option<String>,
        tags: Option<Vec<String>>,
        created_at: Option<String>,
        updated_at: Option<String>,
        pinned: Option<bool>,
    }

    match serde_yaml::from_str::<Frontmatter>(frontmatter_match.as_str()) {
        Ok(frontmatter) => Note {
            id: frontmatter.id.unwrap_or(base.id),
            title: frontmatter.title.unwrap_or(base.title),
            workspace: frontmatter.workspace.unwrap_or(base.workspace),
            language: frontmatter.language.unwrap_or(base.language),
            tags: frontmatter.tags.unwrap_or_default(),
            created_at: frontmatter.created_at.unwrap_or(base.created_at),
            updated_at: frontmatter.updated_at.unwrap_or(base.updated_at),
            pinned: frontmatter.pinned.unwrap_or(false),
            content: body,
        },
        Err(_) => base,
    }
}

fn serialize_note(note: &Note) -> Result<String, String> {
    #[derive(serde::Serialize)]
    struct Frontmatter<'a> {
        id: &'a str,
        title: &'a str,
        workspace: &'a str,
        language: &'a str,
        tags: &'a [String],
        created_at: &'a str,
        updated_at: &'a str,
        pinned: bool,
    }

    let frontmatter = serde_yaml::to_string(&Frontmatter {
        id: &note.id,
        title: &note.title,
        workspace: &note.workspace,
        language: &note.language,
        tags: &note.tags,
        created_at: &note.created_at,
        updated_at: &note.updated_at,
        pinned: note.pinned,
    })
    .map_err(|error| error.to_string())?;

    let body = note.content.trim_start_matches('\n');
    Ok(format!("---\n{}---\n\n{}", frontmatter, body))
}

fn to_metadata(note: &Note) -> NoteMetadata {
    NoteMetadata {
        id: note.id.clone(),
        title: note.title.clone(),
        workspace: note.workspace.clone(),
        language: note.language.clone(),
        tags: note.tags.clone(),
        created_at: note.created_at.clone(),
        updated_at: note.updated_at.clone(),
        pinned: note.pinned,
        excerpt: build_excerpt(&note.content),
    }
}

fn is_markdown_file(path: &Path) -> bool {
    path.extension()
        .and_then(OsStr::to_str)
        .map(|extension| extension.eq_ignore_ascii_case("md"))
        .unwrap_or(false)
}

fn list_note_paths(workspace: Option<&str>) -> Result<Vec<PathBuf>, String> {
    let root = notes_dir()?;
    let target = match workspace {
        Some(name) => root.join(name),
        None => root,
    };

    if !target.exists() {
        return Ok(vec![]);
    }

    let walker = WalkDir::new(target).into_iter();
    let mut paths = Vec::new();

    for entry in walker.filter_map(Result::ok) {
        let path = entry.path();
        if entry.file_type().is_file() && is_markdown_file(path) {
            paths.push(path.to_path_buf());
        }
    }

    Ok(paths)
}

fn find_note_path(id: &str) -> Result<Option<PathBuf>, String> {
    for path in list_note_paths(None)? {
        if path
            .file_stem()
            .and_then(OsStr::to_str)
            .map(|stem| stem == id)
            .unwrap_or(false)
        {
            return Ok(Some(path));
        }
    }

    Ok(None)
}

pub fn load_all_notes() -> Result<Vec<Note>, String> {
    let mut notes = Vec::new();

    for path in list_note_paths(None)? {
        let content = fs::read_to_string(&path).map_err(|error| error.to_string())?;
        let note = parse_note_from_file(&path, &content);
        notes.push(note);
    }

    Ok(notes)
}

pub fn ensure_directories() -> Result<(), String> {
    fs::create_dir_all(notes_dir()?).map_err(|error| error.to_string())?;
    fs::create_dir_all(trash_dir()?).map_err(|error| error.to_string())?;
    fs::create_dir_all(default_workspace_dir()?).map_err(|error| error.to_string())?;

    if list_note_paths(None)?.is_empty() {
        let now = now_iso();
        let note = Note {
      id: Uuid::new_v4().to_string(),
      title: "Welcome to SiriusPad".into(),
      workspace: DEFAULT_WORKSPACE.into(),
      language: "markdown".into(),
      tags: vec!["welcome".into(), "shortcuts".into()],
      created_at: now.clone(),
      updated_at: now,
      pinned: true,
      content: "# Welcome to SiriusPad\n\nSiriusPad is your technical scratchpad for notes, snippets, bugs, and quick commands.\n\n## Shortcuts\n\n- `Ctrl+N` new note\n- `Ctrl+K` command palette\n- `Ctrl+F` focus search\n- `Ctrl+S` save\n- `Ctrl+Enter` run snippet\n- `Ctrl+Shift+C` copy with variables\n- `Ctrl+Shift+G` export Gist\n\n```bash\necho \"SiriusPad is ready\"\n```\n".into(),
    };
        write_note(note)?;
    }

    Ok(())
}

pub fn list_workspace_names() -> Result<Vec<String>, String> {
    ensure_directories()?;
    let mut workspaces = vec![DEFAULT_WORKSPACE.to_string()];

    for entry in fs::read_dir(notes_dir()?).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        if entry.path().is_dir() {
            let name = entry.file_name().to_string_lossy().to_string();
            if !workspaces.contains(&name) {
                workspaces.push(name);
            }
        }
    }

    workspaces.sort();
    Ok(workspaces)
}

pub fn create_workspace(name: &str) -> Result<(), String> {
    ensure_directories()?;
    let workspace = sanitize_workspace_name(name)?;
    fs::create_dir_all(notes_dir()?.join(workspace)).map_err(|error| error.to_string())
}

pub fn rename_workspace(current_name: &str, next_name: &str) -> Result<(), String> {
    ensure_directories()?;

    let current = sanitize_workspace_name(current_name)?;
    let next = sanitize_workspace_name(next_name)?;

    if current == DEFAULT_WORKSPACE {
        return Err("The default workspace cannot be renamed.".into());
    }

    let current_path = notes_dir()?.join(&current);
    let next_path = notes_dir()?.join(&next);

    if !current_path.exists() {
        return Err("Workspace not found.".into());
    }

    if next_path.exists() {
        return Err("A workspace with that name already exists.".into());
    }

    fs::rename(&current_path, &next_path).map_err(|error| error.to_string())?;

    for note_path in list_note_paths(Some(&next))? {
        let content = fs::read_to_string(&note_path).map_err(|error| error.to_string())?;
        let mut note = parse_note_from_file(&note_path, &content);
        note.workspace = next.clone();
        let serialized = serialize_note(&note)?;
        fs::write(&note_path, serialized).map_err(|error| error.to_string())?;
    }

    Ok(())
}

pub fn delete_workspace(name: &str, fallback_workspace: &str) -> Result<(), String> {
    ensure_directories()?;

    let workspace = sanitize_workspace_name(name)?;
    let fallback = sanitize_workspace_name(fallback_workspace)?;

    if workspace == DEFAULT_WORKSPACE {
        return Err("The default workspace cannot be deleted.".into());
    }

    create_workspace(&fallback)?;

    for note_path in list_note_paths(Some(&workspace))? {
        let content = fs::read_to_string(&note_path).map_err(|error| error.to_string())?;
        let mut note = parse_note_from_file(&note_path, &content);
        note.workspace = fallback.clone();
        write_note(note)?;
        fs::remove_file(&note_path).map_err(|error| error.to_string())?;
    }

    let workspace_path = notes_dir()?.join(&workspace);
    if workspace_path.exists() {
        fs::remove_dir_all(workspace_path).map_err(|error| error.to_string())?;
    }

    Ok(())
}

pub fn list_note_metadata(workspace: Option<String>) -> Result<Vec<NoteMetadata>, String> {
    ensure_directories()?;
    let workspace_filter = workspace.map(|value| value.trim().to_string());
    let notes = load_all_notes()?;
    let mut metadata = notes
        .into_iter()
        .filter(|note| {
            workspace_filter
                .as_ref()
                .map(|workspace| note.workspace == *workspace)
                .unwrap_or(true)
        })
        .map(|note| to_metadata(&note))
        .collect::<Vec<_>>();

    metadata.sort_by(|left, right| right.updated_at.cmp(&left.updated_at));
    Ok(metadata)
}

pub fn read_note(id: &str) -> Result<Note, String> {
    ensure_directories()?;
    let path = find_note_path(id)?.ok_or_else(|| "Note not found.".to_string())?;
    let content = fs::read_to_string(&path).map_err(|error| error.to_string())?;
    Ok(parse_note_from_file(&path, &content))
}

pub fn write_note(mut note: Note) -> Result<(), String> {
    ensure_directories()?;
    note.workspace = sanitize_workspace_name(&note.workspace)?;
    let previous_path = find_note_path(&note.id)?;

    if note.id.trim().is_empty() {
        note.id = Uuid::new_v4().to_string();
    }

    if note.title.trim().is_empty() {
        note.title = "Untitled note".into();
    }

    if note.language.trim().is_empty() {
        note.language = "markdown".into();
    }

    if note.created_at.trim().is_empty() {
        note.created_at = now_iso();
    }

    if note.updated_at.trim().is_empty() {
        note.updated_at = now_iso();
    }

    let target_workspace_dir = notes_dir()?.join(&note.workspace);
    fs::create_dir_all(&target_workspace_dir).map_err(|error| error.to_string())?;

    let target_path = note_path_for(&note.workspace, &note.id)?;
    let serialized = serialize_note(&note)?;
    fs::write(&target_path, serialized).map_err(|error| error.to_string())?;

    if let Some(previous_path) = previous_path {
        if previous_path != target_path {
            let _ = fs::remove_file(previous_path);
        }
    }

    Ok(())
}

pub fn delete_note(id: &str) -> Result<(), String> {
    let Some(path) = find_note_path(id)? else {
        return Err("Note not found.".into());
    };

    fs::remove_file(path).map_err(|error| error.to_string())
}

pub fn move_note_to_trash(id: &str) -> Result<(), String> {
    ensure_directories()?;
    let Some(path) = find_note_path(id)? else {
        return Err("Note not found.".into());
    };

    let note = read_note(id)?;
    let trash_workspace_dir = trash_dir()?.join(&note.workspace);
    fs::create_dir_all(&trash_workspace_dir).map_err(|error| error.to_string())?;

    let timestamp = Utc::now().timestamp();
    let destination = trash_workspace_dir.join(format!("{}-{}.md", timestamp, note.id));
    fs::rename(path, destination).map_err(|error| error.to_string())
}
