/**
 * Slash Commands Extension for SiriusPad Editor
 * Triggered when user types "/" at the start of a word.
 * Inserts Markdown snippets for common blocks.
 */
import {
  autocompletion,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete'
import type { EditorView } from '@codemirror/view'

interface SlashCommand {
  label: string
  detail: string
  apply: (view: EditorView, from: number, to: number) => void
}

const SLASH_COMMANDS: SlashCommand[] = [
  {
    label: '/h1',
    detail: 'Título nível 1',
    apply(view, from, to) {
      view.dispatch({
        changes: { from, to, insert: '# ' },
        selection: { anchor: from + 2 },
      })
    },
  },
  {
    label: '/h2',
    detail: 'Título nível 2',
    apply(view, from, to) {
      view.dispatch({
        changes: { from, to, insert: '## ' },
        selection: { anchor: from + 3 },
      })
    },
  },
  {
    label: '/h3',
    detail: 'Título nível 3',
    apply(view, from, to) {
      view.dispatch({
        changes: { from, to, insert: '### ' },
        selection: { anchor: from + 4 },
      })
    },
  },
  {
    label: '/code',
    detail: 'Bloco de código',
    apply(view, from, to) {
      const snippet = '```\n\n```'
      view.dispatch({
        changes: { from, to, insert: snippet },
        selection: { anchor: from + 4 },
      })
    },
  },
  {
    label: '/table',
    detail: 'Tabela Markdown',
    apply(view, from, to) {
      const snippet = '| Coluna 1 | Coluna 2 | Coluna 3 |\n| --- | --- | --- |\n| Dado | Dado | Dado |'
      view.dispatch({
        changes: { from, to, insert: snippet },
        selection: { anchor: from + 2 },
      })
    },
  },
  {
    label: '/callout-note',
    detail: 'Callout de nota',
    apply(view, from, to) {
      const snippet = '> [!NOTE] Contexto\n> Adicione sua observação aqui.'
      view.dispatch({
        changes: { from, to, insert: snippet },
        selection: { anchor: from + snippet.length },
      })
    },
  },
  {
    label: '/callout-tip',
    detail: 'Callout de dica',
    apply(view, from, to) {
      const snippet = '> [!TIP] Dica rápida\n> Adicione sua dica aqui.'
      view.dispatch({
        changes: { from, to, insert: snippet },
        selection: { anchor: from + snippet.length },
      })
    },
  },
  {
    label: '/callout-warning',
    detail: 'Callout de atenção',
    apply(view, from, to) {
      const snippet = '> [!WARNING] Atenção\n> Descreva o ponto de atenção aqui.'
      view.dispatch({
        changes: { from, to, insert: snippet },
        selection: { anchor: from + snippet.length },
      })
    },
  },
  {
    label: '/callout-danger',
    detail: 'Callout de perigo',
    apply(view, from, to) {
      const snippet = '> [!DANGER] Ponto crítico\n> Descreva o impacto aqui.'
      view.dispatch({
        changes: { from, to, insert: snippet },
        selection: { anchor: from + snippet.length },
      })
    },
  },
  {
    label: '/task',
    detail: 'Item de tarefa',
    apply(view, from, to) {
      view.dispatch({
        changes: { from, to, insert: '- [ ] ' },
        selection: { anchor: from + 6 },
      })
    },
  },
  {
    label: '/hr',
    detail: 'Linha horizontal',
    apply(view, from, to) {
      view.dispatch({
        changes: { from, to, insert: '\n---\n' },
        selection: { anchor: from + 5 },
      })
    },
  },
  {
    label: '/bold',
    detail: 'Texto em negrito',
    apply(view, from, to) {
      view.dispatch({
        changes: { from, to, insert: '****' },
        selection: { anchor: from + 2 },
      })
    },
  },
  {
    label: '/italic',
    detail: 'Texto em itálico',
    apply(view, from, to) {
      view.dispatch({
        changes: { from, to, insert: '**' },
        selection: { anchor: from + 1 },
      })
    },
  },
  {
    label: '/link',
    detail: 'Link Markdown',
    apply(view, from, to) {
      const snippet = '[texto](url)'
      view.dispatch({
        changes: { from, to, insert: snippet },
        selection: { anchor: from + 1, head: from + 6 },
      })
    },
  },
  {
    label: '/wikilink',
    detail: 'Link para outra nota [[Nome]]',
    apply(view, from, to) {
      view.dispatch({
        changes: { from, to, insert: '[[]]' },
        selection: { anchor: from + 2 },
      })
    },
  },
]

function slashCompletionSource(context: CompletionContext): CompletionResult | null {
  // Only trigger if user typed '/' preceded by start-of-line or whitespace
  const match = context.matchBefore(/\/\S*/)
  if (!match) return null

  // Don't trigger in the middle of a URL or existing markdown link
  const before = context.state.doc.sliceString(
    Math.max(0, match.from - 1),
    match.from,
  )
  if (before === ':' || before === '(') return null

  const typed = match.text.toLowerCase()

  const options = SLASH_COMMANDS.filter((cmd) =>
    cmd.label.startsWith(typed),
  ).map((cmd) => ({
    label: cmd.label,
    detail: cmd.detail,
    type: 'keyword',
    boost: 99,
    apply(view: EditorView, _completion: unknown, from: number, to: number) {
      cmd.apply(view, from, to)
    },
  }))

  if (!options.length) return null

  return {
    from: match.from,
    to: match.to,
    options,
    validFor: /^\/\S*$/,
  }
}

export function slashCommandCompletion() {
  return autocompletion({
    override: [slashCompletionSource],
    activateOnTyping: true,
    closeOnBlur: true,
    maxRenderedOptions: 12,
    icons: false,
  })
}
