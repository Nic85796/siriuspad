import type { Settings, Workspace } from '@/types'

export const APP_VERSION = '1.0.0'
export const DEFAULT_WORKSPACE_ID = 'geral'

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  fontSize: 14,
  fontFamily: 'JetBrains Mono',
  tabSize: 2,
  wordWrap: true,
  autosave: true,
  autosaveDelay: 800,
  showLineNumbers: true,
  defaultWorkspace: DEFAULT_WORKSPACE_ID,
  githubToken: '',
  variables: {},
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
  'bash',
  'sh',
  'ruby',
  'go',
  'rust',
  'json',
  'html',
  'css',
] as const

export const EXECUTABLE_LANGUAGES = new Set([
  'python',
  'python3',
  'javascript',
  'node',
  'bash',
  'sh',
  'ruby',
  'go',
])

export const FONT_OPTIONS = [
  'JetBrains Mono',
  'Fira Code',
  'Cascadia Code',
] as const

export const INITIAL_COMMAND_HISTORY_LIMIT = 5

export const WELCOME_NOTE_CONTENT = `# Welcome to SiriusPad

SiriusPad is your fast scratchpad for technical notes, commands, snippets, and architecture ideas.

## Shortcuts

- \`Ctrl+N\` new note
- \`Ctrl+K\` command palette
- \`Ctrl+F\` focus search
- \`Ctrl+S\` save
- \`Ctrl+Enter\` run snippet
- \`Ctrl+Shift+C\` copy with variables
- \`Ctrl+Shift+G\` export gist

\`\`\`bash
echo "SiriusPad is ready"
\`\`\`
`
