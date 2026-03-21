export type NotePriority = 'urgente' | 'alta' | 'media' | 'baixa'

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface BaseNote {
  id: string
  title: string
  workspace: string
  language: string
  tags: string[]
  created_at: string
  updated_at: string
  pinned: boolean
  priority?: NotePriority
  color?: string
}

export interface NoteMetadata extends BaseNote {
  excerpt: string
}

export interface Note extends BaseNote {
  content: string
  checklist?: ChecklistItem[]
}

export interface SearchResult {
  note_id: string
  title: string
  excerpt: string
  score: number
}

export interface RunResult {
  stdout: string
  stderr: string
  exit_code: number
  duration_ms: number
  timed_out?: boolean
}

export interface NoteHistoryEntry {
  timestamp: string
  size_bytes: number
}

export interface UpdateInfo {
  version: string
  body: string | null
  date: string | null
}

export interface NoteTab {
  id: string
  title: string
  isDirty: boolean
  color?: string
}

export interface Workspace {
  id: string
  name: string
  color: string
  icon: string
  createdAt: string
}

export type AppLanguage = 'en' | 'pt-BR' | 'es'
export type AppTheme = 'dark' | 'dark-dimmed' | 'midnight'
export type AppPlatform = 'linux' | 'windows' | 'macos' | 'android' | 'ios'

export interface ThemeDefinition {
  id: AppTheme
  name: string
  vars: Record<string, string>
}

export interface Settings {
  theme: AppTheme
  uiZoom: number
  fontSize: number
  fontFamily: string
  tabSize: 2 | 4
  wordWrap: boolean
  autosave: boolean
  autosaveDelay: number
  showLineNumbers: boolean
  defaultWorkspace: string
  githubToken: string
  variables: Record<string, string>
  language: AppLanguage
}

export type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error'

export type ToastKind = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: string
  kind: ToastKind
  title: string
  description?: string
  actionLabel?: string
  actionHref?: string
}

export interface CursorInfo {
  line: number
  col: number
  wordCount: number
  charCount: number
}

export interface ConfirmDialogOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  secondaryLabel?: string
  danger?: boolean
  onConfirm: () => void | Promise<void>
  onSecondary?: () => void | Promise<void>
}

export interface PromptDialogOptions {
  title: string
  placeholder?: string
  defaultValue?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: (value: string) => void | Promise<void>
}

export interface CommandItem {
  id: string
  label: string
  group: string
  description?: string
  keywords?: string[]
  shortcut?: string
  perform: () => void | Promise<void>
}
