import type { AppLanguage, Settings, Workspace } from '@/types'

export const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? '0.0.0'
export const APP_MAINTAINER = 'SiriusX'
export const APP_REPOSITORY_URL = 'https://github.com/SiriusXofc/siriuspad'
export const APP_CHANGELOG_URL = `${APP_REPOSITORY_URL}/blob/main/CHANGELOG.md`
export const APP_LICENSE_URL = `${APP_REPOSITORY_URL}/blob/main/LICENSE`
export const APP_SECURITY_URL = `${APP_REPOSITORY_URL}/blob/main/SECURITY.md`
export const APP_SECURITY_ADVISORY_URL = `${APP_REPOSITORY_URL}/security/advisories/new`
export const DEFAULT_WORKSPACE_ID = 'general'

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  useSystemTheme: true,
  uiZoom: 1,
  fontSize: 13,
  fontFamily: 'JetBrains Mono',
  tabSize: 2,
  wordWrap: true,
  autosave: true,
  autosaveDelay: 800,
  showLineNumbers: true,
  defaultWorkspace: DEFAULT_WORKSPACE_ID,
  githubToken: '',
  aiApiKey: '',
  aiBaseUrl: 'https://api.groq.com/openai/v1',
  aiModel: 'llama-3.1-8b-instant',
  variables: {},
  initialSyncDone: false,
  language: 'pt-BR',
  useSystemLanguage: true,
  supabaseUrl: '',
  supabaseAnonKey: '',
}

export const DEFAULT_WORKSPACE: Workspace = {
  id: DEFAULT_WORKSPACE_ID,
  name: DEFAULT_WORKSPACE_ID,
  color: '#7c6af7',
  icon: 'star',
  createdAt: new Date().toISOString(),
}

export const WORKSPACE_COLORS = [
  '#7c6af7',
  '#60a5fa',
  '#4ade80',
  '#fbbf24',
  '#f87171',
  '#22d3ee',
  '#fb7185',
  '#a78bfa',
  '#34d399',
]

export const WORKSPACE_ICONS = [
  'star',
  'terminal',
  'code',
  'database',
  'wrench',
  'bug',
  'network',
  'rocket',
  'brain',
]

export const NOTE_LANGUAGES = [
  'markdown',
  'text',
  'python',
  'python3',
  'javascript',
  'node',
  'typescript',
  'ts',
  'bash',
  'sh',
  'ruby',
  'go',
  'rust',
  'lua',
  'json',
  'html',
  'css',
  'sql',
] as const

export const EXECUTABLE_LANGUAGES = new Set([
  'python',
  'python3',
  'javascript',
  'node',
  'typescript',
  'ts',
  'bash',
  'sh',
  'ruby',
  'go',
  'lua',
])

export const FONT_OPTIONS = [
  'JetBrains Mono',
  'Fira Code',
  'Cascadia Code',
] as const

export const UI_ZOOM_MIN = 0.65
export const UI_ZOOM_MAX = 1.6
export const UI_ZOOM_STEP = 0.05
export const UI_ZOOM_BASELINE = 0.92

export const LANGUAGE_OPTIONS: Array<{ value: AppLanguage; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'pt-BR', label: 'Português (BR)' },
  { value: 'es', label: 'Español' },
]

export const INITIAL_COMMAND_HISTORY_LIMIT = 5

export const NOTE_COLOR_SWATCHES = [
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#7c3aed',
  '#374151',
] as const
