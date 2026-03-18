export interface BaseNote {
  id: string
  title: string
  workspace: string
  language: string
  tags: string[]
  created_at: string
  updated_at: string
  pinned: boolean
}

export interface NoteMetadata extends BaseNote {
  excerpt: string
}

export interface Note extends BaseNote {
  content: string
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

export interface Workspace {
  id: string
  name: string
  color: string
  icon: string
  createdAt: string
}

export interface Settings {
  theme: 'dark'
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

export interface CommandItem {
  id: string
  label: string
  group: 'Notas' | 'Navegacao' | 'Acoes' | 'App'
  keywords?: string[]
  perform: () => void | Promise<void>
}
