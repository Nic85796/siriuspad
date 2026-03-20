use std::{
    ffi::OsStr,
    fs,
    path::{Path, PathBuf},
};

use chrono::Utc;
use regex::Regex;
use uuid::Uuid;
use walkdir::WalkDir;

use crate::models::{ChecklistItem, Note, NoteHistoryEntry, NoteMetadata};

const APP_DIR_NAME: &str = "siriuspad";
const DEFAULT_WORKSPACE: &str = "general";
const LEGACY_DEFAULT_WORKSPACE: &str = "geral";

fn is_default_workspace_alias(name: &str) -> bool {
    matches!(name, DEFAULT_WORKSPACE | LEGACY_DEFAULT_WORKSPACE)
}

fn normalize_workspace_name(name: &str) -> String {
    if is_default_workspace_alias(name.trim()) {
        DEFAULT_WORKSPACE.to_string()
    } else {
        name.trim().to_string()
    }
}

fn frontmatter_regex() -> Regex {
    Regex::new(r"(?s)\A---\r?\n(.*?)\r?\n---\r?\n?").expect("valid frontmatter regex")
}

fn now_iso() -> String {
    Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
}

fn system_language() -> String {
    std::env::var("LC_ALL")
        .or_else(|_| std::env::var("LANGUAGE"))
        .or_else(|_| std::env::var("LANG"))
        .unwrap_or_default()
        .to_lowercase()
}

fn welcome_note_seed() -> (&'static str, Vec<String>, &'static str) {
    let lang = system_language();

    if lang.starts_with("pt") {
        (
            "Bem-vindo ao SiriusPad",
            vec!["bem-vindo".into(), "atalhos".into()],
            "# Bem-vindo ao SiriusPad\n\nSeu bloco rápido para notas técnicas, snippets, checklists e comandos.\n\n## Teste rápido\n\n- [ ] Criar uma nova nota\n- [ ] Adicionar um item na checklist da nota\n- [ ] Inserir um callout com os blocos rápidos\n- [ ] Abrir o terminal com Ctrl+`\n\n> [!TIP] Callouts funcionam no preview\n> Use blocos como `> [!NOTE]` e `> [!WARNING]` para destacar contexto importante na nota.\n\n## Atalhos\n\n- `Ctrl+N` nova nota\n- `Ctrl+K` paleta de comandos\n- `Ctrl+F` focar busca\n- `Ctrl+S` salvar\n- `Ctrl+Enter` executar snippet\n- `Ctrl+Shift+C` copiar com variáveis\n- `Ctrl+Shift+G` exportar Gist\n\n```bash\necho \"SiriusPad está pronto\"\n```\n",
        )
    } else if lang.starts_with("es") {
        (
            "Bienvenido a SiriusPad",
            vec!["bienvenida".into(), "atajos".into()],
            "# Bienvenido a SiriusPad\n\nTu bloc rápido para notas técnicas, snippets, checklists y comandos.\n\n## Prueba rápida\n\n- [ ] Crear una nota nueva\n- [ ] Añadir un ítem al checklist de la nota\n- [ ] Insertar un callout con los bloques rápidos\n- [ ] Abrir el terminal con Ctrl+`\n\n> [!TIP] Los callouts funcionan en la vista previa\n> Usa bloques como `> [!NOTE]` y `> [!WARNING]` para destacar contexto importante en la nota.\n\n## Atajos\n\n- `Ctrl+N` nueva nota\n- `Ctrl+K` paleta de comandos\n- `Ctrl+F` enfocar búsqueda\n- `Ctrl+S` guardar\n- `Ctrl+Enter` ejecutar snippet\n- `Ctrl+Shift+C` copiar con variables\n- `Ctrl+Shift+G` exportar Gist\n\n```bash\necho \"SiriusPad está listo\"\n```\n",
        )
    } else {
        (
            "Welcome to SiriusPad",
            vec!["welcome".into(), "shortcuts".into()],
            "# Welcome to SiriusPad\n\nYour fast scratchpad for technical notes, snippets, checklists, and commands.\n\n## Quick test\n\n- [ ] Create a new note\n- [ ] Add an item to the note checklist\n- [ ] Insert a callout with the quick blocks\n- [ ] Open the terminal with Ctrl+`\n\n> [!TIP] Callouts work in preview\n> Use blocks like `> [!NOTE]` and `> [!WARNING]` to highlight important context in a note.\n\n## Shortcuts\n\n- `Ctrl+N` new note\n- `Ctrl+K` command palette\n- `Ctrl+F` focus search\n- `Ctrl+S` save\n- `Ctrl+Enter` run snippet\n- `Ctrl+Shift+C` copy with variables\n- `Ctrl+Shift+G` export Gist\n\n```bash\necho \"SiriusPad is ready\"\n```\n",
        )
    }
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

    Ok(normalize_workspace_name(trimmed))
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

pub fn history_dir() -> Result<PathBuf, String> {
    Ok(app_data_dir()?.join("history"))
}

fn default_workspace_dir() -> Result<PathBuf, String> {
    Ok(notes_dir()?.join(DEFAULT_WORKSPACE))
}

fn legacy_default_workspace_dir() -> Result<PathBuf, String> {
    Ok(notes_dir()?.join(LEGACY_DEFAULT_WORKSPACE))
}

fn note_path_for(workspace: &str, id: &str) -> Result<PathBuf, String> {
    Ok(notes_dir()?
        .join(normalize_workspace_name(workspace))
        .join(format!("{id}.md")))
}

fn note_history_dir(note_id: &str) -> Result<PathBuf, String> {
    Ok(history_dir()?.join(note_id))
}

fn version_path_for(note_id: &str, timestamp: &str) -> Result<PathBuf, String> {
    Ok(note_history_dir(note_id)?.join(format!("{timestamp}.md")))
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
        title: "Untitled".into(),
        workspace: normalize_workspace_name(&workspace),
        language: "markdown".into(),
        tags: vec![],
        created_at: now_iso(),
        updated_at: now_iso(),
        pinned: false,
        priority: Some("media".into()),
        color: None,
        checklist: vec![],
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
        priority: Option<String>,
        color: Option<String>,
        checklist: Option<Vec<ChecklistItem>>,
    }

    match serde_yaml::from_str::<Frontmatter>(frontmatter_match.as_str()) {
        Ok(frontmatter) => Note {
            id: frontmatter.id.unwrap_or(base.id),
            title: frontmatter.title.unwrap_or(base.title),
            workspace: normalize_workspace_name(
                frontmatter.workspace.as_deref().unwrap_or(&base.workspace),
            ),
            language: frontmatter.language.unwrap_or(base.language),
            tags: frontmatter.tags.unwrap_or_default(),
            created_at: frontmatter.created_at.unwrap_or(base.created_at),
            updated_at: frontmatter.updated_at.unwrap_or(base.updated_at),
            pinned: frontmatter.pinned.unwrap_or(false),
            priority: frontmatter.priority.or(base.priority),
            color: frontmatter.color.or(base.color),
            checklist: frontmatter.checklist.unwrap_or_default(),
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
        priority: Option<&'a str>,
        color: Option<&'a str>,
        checklist: Option<&'a [ChecklistItem]>,
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
        priority: note.priority.as_deref(),
        color: note.color.as_deref(),
        checklist: (!note.checklist.is_empty()).then_some(note.checklist.as_slice()),
    })
    .map_err(|error| error.to_string())?;

    let body = note.content.trim_start_matches('\n');
    Ok(format!("---\n{}---\n\n{}", frontmatter, body))
}

fn write_note_to_path(note: &Note, path: &Path) -> Result<(), String> {
    let serialized = serialize_note(note)?;
    fs::write(path, serialized).map_err(|error| error.to_string())
}

fn record_note_history(note: &Note) -> Result<(), String> {
    let history_dir = note_history_dir(&note.id)?;
    fs::create_dir_all(&history_dir).map_err(|error| error.to_string())?;

    let timestamp = Utc::now().format("%Y%m%dT%H%M%S%.3fZ").to_string();
    let history_path = history_dir.join(format!("{timestamp}.md"));
    write_note_to_path(note, &history_path)?;

    let mut entries = fs::read_dir(&history_dir)
        .map_err(|error| error.to_string())?
        .filter_map(Result::ok)
        .filter(|entry| entry.path().is_file())
        .collect::<Vec<_>>();

    entries.sort_by_key(|entry| entry.file_name());

    let excess = entries.len().saturating_sub(20);
    if excess > 0 {
        for entry in entries.into_iter().take(excess) {
            let _ = fs::remove_file(entry.path());
        }
    }

    Ok(())
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
        priority: note.priority.clone(),
        color: note.color.clone(),
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
        Some(name) => root.join(normalize_workspace_name(name)),
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

pub fn note_directory(id: &str) -> Result<PathBuf, String> {
    ensure_directories()?;
    let path = find_note_path(id)?.ok_or_else(|| "Note not found.".to_string())?;
    path.parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "Unable to resolve note directory.".to_string())
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
    fs::create_dir_all(history_dir()?).map_err(|error| error.to_string())?;

    let legacy_default_dir = legacy_default_workspace_dir()?;
    let default_dir = default_workspace_dir()?;

    if legacy_default_dir.exists() {
        if !default_dir.exists() {
            fs::rename(&legacy_default_dir, &default_dir).map_err(|error| error.to_string())?;
        } else {
            for entry in fs::read_dir(&legacy_default_dir).map_err(|error| error.to_string())? {
                let entry = entry.map_err(|error| error.to_string())?;
                let source = entry.path();
                let destination = default_dir.join(entry.file_name());

                if !destination.exists() {
                    fs::rename(&source, destination).map_err(|error| error.to_string())?;
                }
            }

            fs::remove_dir_all(&legacy_default_dir).map_err(|error| error.to_string())?;
        }
    }

    fs::create_dir_all(default_workspace_dir()?).map_err(|error| error.to_string())?;

    if list_note_paths(None)?.is_empty() {
        let now = now_iso();
        let (title, tags, content) = welcome_note_seed();
        let lang = system_language();
        let checklist = if lang.starts_with("pt") {
            vec![
                ChecklistItem {
                    id: "welcome-check-1".into(),
                    text: "Criar uma nova nota".into(),
                    done: true,
                },
                ChecklistItem {
                    id: "welcome-check-2".into(),
                    text: "Inserir um callout e abrir o preview".into(),
                    done: false,
                },
            ]
        } else if lang.starts_with("es") {
            vec![
                ChecklistItem {
                    id: "welcome-check-1".into(),
                    text: "Crear una nota nueva".into(),
                    done: true,
                },
                ChecklistItem {
                    id: "welcome-check-2".into(),
                    text: "Insertar un callout y abrir la vista previa".into(),
                    done: false,
                },
            ]
        } else {
            vec![
                ChecklistItem {
                    id: "welcome-check-1".into(),
                    text: "Create a new note".into(),
                    done: true,
                },
                ChecklistItem {
                    id: "welcome-check-2".into(),
                    text: "Insert a callout and open preview".into(),
                    done: false,
                },
            ]
        };
        let note = Note {
            id: Uuid::new_v4().to_string(),
            title: title.into(),
            workspace: DEFAULT_WORKSPACE.into(),
            language: "markdown".into(),
            tags,
            created_at: now.clone(),
            updated_at: now,
            pinned: true,
            priority: Some("media".into()),
            color: None,
            checklist,
            content: content.into(),
        };
        let welcome_note_path = note_path_for(DEFAULT_WORKSPACE, &note.id)?;
        write_note_to_path(&note, &welcome_note_path)?;
    }

    Ok(())
}

pub fn list_workspace_names() -> Result<Vec<String>, String> {
    ensure_directories()?;
    let mut workspaces = vec![DEFAULT_WORKSPACE.to_string()];

    for entry in fs::read_dir(notes_dir()?).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        if entry.path().is_dir() {
            let name = normalize_workspace_name(&entry.file_name().to_string_lossy());
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
        note.title = "Untitled".into();
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

    note.priority = note
        .priority
        .map(|value| value.trim().to_lowercase())
        .filter(|value| matches!(value.as_str(), "urgente" | "alta" | "media" | "baixa"))
        .or_else(|| Some("media".into()));

    note.color = note.color.and_then(|value| {
        let normalized = value.trim().to_string();
        Regex::new(r"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")
            .ok()
            .and_then(|expression| expression.is_match(&normalized).then_some(normalized))
    });

    let target_workspace_dir = notes_dir()?.join(&note.workspace);
    fs::create_dir_all(&target_workspace_dir).map_err(|error| error.to_string())?;

    let target_path = note_path_for(&note.workspace, &note.id)?;
    write_note_to_path(&note, &target_path)?;
    record_note_history(&note)?;

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

pub fn list_note_history(note_id: &str) -> Result<Vec<NoteHistoryEntry>, String> {
    ensure_directories()?;
    let history_dir = note_history_dir(note_id)?;

    if !history_dir.exists() {
        return Ok(Vec::new());
    }

    let mut entries = fs::read_dir(&history_dir)
        .map_err(|error| error.to_string())?
        .filter_map(Result::ok)
        .filter(|entry| entry.path().is_file())
        .filter_map(|entry| {
            let path = entry.path();
            let timestamp = path.file_stem()?.to_str()?.to_string();
            let metadata = entry.metadata().ok()?;

            Some(NoteHistoryEntry {
                timestamp,
                size_bytes: metadata.len(),
            })
        })
        .collect::<Vec<_>>();

    entries.sort_by(|left, right| right.timestamp.cmp(&left.timestamp));
    Ok(entries)
}

pub fn read_note_version(note_id: &str, timestamp: &str) -> Result<String, String> {
    ensure_directories()?;
    let version_path = version_path_for(note_id, timestamp)?;
    fs::read_to_string(version_path).map_err(|error| error.to_string())
}

pub fn restore_note_version(note_id: &str, timestamp: &str) -> Result<Note, String> {
    ensure_directories()?;
    let version_path = version_path_for(note_id, timestamp)?;
    let content = fs::read_to_string(&version_path).map_err(|error| error.to_string())?;
    let mut note = parse_note_from_file(&version_path, &content);

    if note.id.trim().is_empty() {
        note.id = note_id.to_string();
    }

    note.updated_at = now_iso();
    write_note(note.clone())?;
    Ok(note)
}
