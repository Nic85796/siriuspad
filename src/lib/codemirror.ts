import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete'
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands'
import { css } from '@codemirror/lang-css'
import { go } from '@codemirror/lang-go'
import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { python } from '@codemirror/lang-python'
import { rust } from '@codemirror/lang-rust'
import {
  HighlightStyle,
  LanguageDescription,
  LanguageSupport,
  StreamLanguage,
  bracketMatching,
  foldGutter,
  syntaxHighlighting,
} from '@codemirror/language'
import { ruby } from '@codemirror/legacy-modes/mode/ruby'
import { shell } from '@codemirror/legacy-modes/mode/shell'
import {
  Compartment,
  EditorState,
  RangeSetBuilder,
  type Extension,
} from '@codemirror/state'
import {
  closeSearchPanel,
  openSearchPanel,
  search,
} from '@codemirror/search'
import {
  Decoration,
  EditorView,
  MatchDecorator,
  ViewPlugin,
  WidgetType,
  drawSelection,
  highlightActiveLine,
  highlightSpecialChars,
  keymap,
  lineNumbers,
} from '@codemirror/view'
import { tags } from '@lezer/highlight'

import { withAlpha } from '@/lib/color'
import type { CursorInfo, Settings } from '@/types'

const variableDecoration = Decoration.mark({
  class: 'cm-variable-token',
})

const hiddenMarkerDecoration = Decoration.replace({
  inclusive: false,
})

const inlineCodeDecoration = Decoration.mark({
  class: 'cm-md-inline-code',
})

const variableMatcher = new MatchDecorator({
  regexp: /\{\{[A-Z0-9_]+\}\}/g,
  decoration: () => variableDecoration,
})

const variableDecorations = ViewPlugin.fromClass(
  class {
    decorations

    constructor(view: EditorView) {
      this.decorations = variableMatcher.createDeco(view)
    }

    update(update: Parameters<typeof variableMatcher.updateDeco>[0]) {
      this.decorations = variableMatcher.updateDeco(update, this.decorations)
    }
  },
  {
    decorations: (instance) => instance.decorations,
  },
)

const inlineCodeDecorations = ViewPlugin.fromClass(
  class {
    decorations

    constructor(view: EditorView) {
      this.decorations = createInlineCodeDecorations(view)
    }

    update(update: { docChanged: boolean; viewportChanged: boolean; view: EditorView }) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = createInlineCodeDecorations(update.view)
      }
    }
  },
  {
    decorations: (instance) => instance.decorations,
  },
)

const CALLOUT_STYLES = {
  note: {
    accent: '#a78bfa',
    background: 'rgba(124,58,237,0.06)',
  },
  tip: {
    accent: '#34d399',
    background: 'rgba(16,185,129,0.06)',
  },
  warning: {
    accent: '#fbbf24',
    background: 'rgba(245,158,11,0.07)',
  },
  danger: {
    accent: '#f87171',
    background: 'rgba(239,68,68,0.07)',
  },
  success: {
    accent: '#60a5fa',
    background: 'rgba(59,130,246,0.06)',
  },
} as const

const CALLOUT_ALIASES: Record<string, keyof typeof CALLOUT_STYLES> = {
  NOTE: 'note',
  INFO: 'note',
  TIP: 'tip',
  HINT: 'tip',
  WARNING: 'warning',
  CAUTION: 'warning',
  IMPORTANT: 'warning',
  BUG: 'danger',
  DANGER: 'danger',
  ERROR: 'danger',
  SUCCESS: 'success',
  DONE: 'success',
}

const HEADING_PATTERN = /^(#{1,6})\s+.+$/
const UNORDERED_LIST_PATTERN = /^(\s*)([-*+])\s+/
const ORDERED_LIST_PATTERN = /^(\s*)(\d+\.)\s+/
const TASK_PATTERN = /^\s*(?:[-*+]|\d+\.)\s+\[( |x|X)\]\s+/
const CODE_FENCE_PATTERN = /^\s*```([\w-]+)?\s*$/
const CALLOUT_START_PATTERN =
  /^\s*>\s*\[!([A-Z]+)\](?:\{(#[0-9a-fA-F]{3,6})\})?(?:\s+.*)?$/
const CALLOUT_PREFIX_PATTERN =
  /^\s*>\s*\[!([A-Z]+)\](?:\{(#[0-9a-fA-F]{3,6})\})?\s*/
const CALLOUT_LINE_PATTERN = /^\s*>\s?.*$/
const BLOCKQUOTE_PREFIX_PATTERN = /^\s*>\s?/

class TaskMarkerWidget extends WidgetType {
  private readonly done: boolean

  constructor(done: boolean) {
    super()
    this.done = done
  }

  toDOM() {
    const element = document.createElement('span')
    element.className = `cm-md-task-widget${this.done ? ' is-done' : ''}`
    element.dataset.done = this.done ? 'true' : 'false'
    element.setAttribute('aria-hidden', 'true')
    return element
  }

  eq(other: TaskMarkerWidget) {
    return other.done === this.done
  }

  ignoreEvent() {
    return false
  }
}

class ListMarkerWidget extends WidgetType {
  private readonly label: string

  constructor(label: string) {
    super()
    this.label = label
  }

  toDOM() {
    const element = document.createElement('span')
    element.className = 'cm-md-list-widget'
    element.textContent = this.label
    element.setAttribute('aria-hidden', 'true')
    return element
  }

  eq(other: ListMarkerWidget) {
    return other.label === this.label
  }
}

function taskMarkerDecoration(done: boolean) {
  return Decoration.replace({
    widget: new TaskMarkerWidget(done),
    inclusive: false,
  })
}

function listMarkerDecoration(label: string) {
  return Decoration.replace({
    widget: new ListMarkerWidget(label),
    inclusive: false,
  })
}

function toggleTaskAtPosition(view: EditorView, pos: number) {
  const line = view.state.doc.lineAt(pos)
  const match = line.text.match(TASK_PATTERN)

  if (!match) {
    return false
  }

  const nextPrefix = match[0].replace(/\[( |x|X)\]/, match[1].toLowerCase() === 'x' ? '[ ]' : '[x]')
  view.dispatch({
    changes: {
      from: line.from,
      to: line.from + match[0].length,
      insert: nextPrefix,
    },
  })
  return true
}

function createInlineCodeDecorations(view: EditorView) {
  const builder = new RangeSetBuilder<Decoration>()
  let activeCodeFence = false

  for (let lineNumber = 1; lineNumber <= view.state.doc.lines; lineNumber += 1) {
    const line = view.state.doc.line(lineNumber)
    const text = line.text

    if (CODE_FENCE_PATTERN.test(text)) {
      activeCodeFence = !activeCodeFence
      continue
    }

    if (activeCodeFence) {
      continue
    }

    for (const match of text.matchAll(/`([^`\n]+?)`/g)) {
      const fullMatch = match[0]
      const index = match.index ?? 0
      const from = line.from + index
      const to = from + fullMatch.length

      builder.add(from, from + 1, hiddenMarkerDecoration)
      builder.add(from + 1, to - 1, inlineCodeDecoration)
      builder.add(to - 1, to, hiddenMarkerDecoration)
    }
  }

  return builder.finish()
}

function createMarkdownLineDecorations(view: EditorView) {
  const builder = new RangeSetBuilder<Decoration>()
  let activeCallout:
    | {
        tone: keyof typeof CALLOUT_STYLES
        color?: string
      }
    | null = null
  let activeCodeFence:
    | {
        language: string
      }
    | null = null

  for (let lineNumber = 1; lineNumber <= view.state.doc.lines; lineNumber += 1) {
    const line = view.state.doc.line(lineNumber)
    const text = line.text
    const nextText =
      lineNumber < view.state.doc.lines
        ? view.state.doc.line(lineNumber + 1).text
        : null

    const fenceMatch = text.match(CODE_FENCE_PATTERN)
    if (fenceMatch) {
      if (!activeCodeFence) {
        activeCodeFence = {
          language: (fenceMatch[1] ?? 'code').toLowerCase(),
        }
        builder.add(
          line.from,
          line.from,
          Decoration.line({
            attributes: {
              class: 'cm-md-code-fence cm-md-code-fence-start',
              'data-code-language': activeCodeFence.language,
            },
          }),
        )
      } else {
        builder.add(
          line.from,
          line.from,
          Decoration.line({
            attributes: {
              class: 'cm-md-code-fence cm-md-code-fence-end',
            },
          }),
        )
        activeCodeFence = null
      }

      builder.add(line.from, line.to, hiddenMarkerDecoration)

      activeCallout = null
      continue
    }

    if (activeCodeFence) {
      builder.add(
        line.from,
        line.from,
        Decoration.line({
          attributes: {
            class: 'cm-md-code-block',
          },
        }),
      )
      continue
    }

    const headingMatch = text.match(HEADING_PATTERN)
    if (headingMatch) {
      builder.add(
        line.from,
        line.from,
        Decoration.line({
          attributes: {
            class: `cm-md-heading cm-md-heading-${Math.min(6, headingMatch[1].length)}`,
          },
        }),
      )
      builder.add(line.from, line.from + headingMatch[1].length + 1, hiddenMarkerDecoration)
    }

    const taskMatch = text.match(TASK_PATTERN)
    if (taskMatch) {
      builder.add(
        line.from,
        line.from,
        Decoration.line({
          attributes: {
            class: `cm-md-task ${taskMatch[1].toLowerCase() === 'x' ? 'cm-md-task-done' : 'cm-md-task-open'}`,
          },
        }),
      )
      builder.add(
        line.from,
        line.from + taskMatch[0].length,
        taskMarkerDecoration(taskMatch[1].toLowerCase() === 'x'),
      )
    } else {
      const unorderedListMatch = text.match(UNORDERED_LIST_PATTERN)
      if (unorderedListMatch) {
        builder.add(
          line.from,
          line.from,
          Decoration.line({
            attributes: {
              class: 'cm-md-list-item',
            },
          }),
        )
        builder.add(
          line.from,
          line.from + unorderedListMatch[0].length,
          listMarkerDecoration('•'),
        )
      }

      const orderedListMatch = text.match(ORDERED_LIST_PATTERN)
      if (orderedListMatch) {
        builder.add(
          line.from,
          line.from,
          Decoration.line({
            attributes: {
              class: 'cm-md-ordered-item',
              'data-list-number': orderedListMatch[2],
            },
          }),
        )
        builder.add(
          line.from,
          line.from + orderedListMatch[0].length,
          listMarkerDecoration(orderedListMatch[2]),
        )
      }
    }

    const startMatch = text.match(CALLOUT_START_PATTERN)
    if (startMatch) {
      const tone = CALLOUT_ALIASES[startMatch[1]] ?? 'note'
      const color = startMatch[2] ?? CALLOUT_STYLES[tone].accent
      const background = withAlpha(color, 0.06) ?? CALLOUT_STYLES[tone].background
      const continues = nextText ? CALLOUT_LINE_PATTERN.test(nextText) : false

      builder.add(
        line.from,
        line.from,
        Decoration.line({
          attributes: {
            class: `cm-md-callout cm-md-callout-${tone} cm-md-callout-start${continues ? '' : ' cm-md-callout-end cm-md-callout-single'}`,
            'data-callout-label': startMatch[1],
            style: `--callout-accent:${color}; --callout-bg:${background};`,
          },
        }),
      )
      const calloutPrefixMatch = text.match(CALLOUT_PREFIX_PATTERN)
      if (calloutPrefixMatch) {
        builder.add(
          line.from,
          line.from + calloutPrefixMatch[0].length,
          hiddenMarkerDecoration,
        )
      }

      activeCallout = continues ? { tone, color } : null
      continue
    }

    if (activeCallout && CALLOUT_LINE_PATTERN.test(text)) {
      const continues = nextText ? CALLOUT_LINE_PATTERN.test(nextText) : false
      const accent = activeCallout.color ?? CALLOUT_STYLES[activeCallout.tone].accent
      const background =
        withAlpha(accent, 0.06) ?? CALLOUT_STYLES[activeCallout.tone].background

      builder.add(
        line.from,
        line.from,
        Decoration.line({
          attributes: {
            class: `cm-md-callout cm-md-callout-${activeCallout.tone}${continues ? '' : ' cm-md-callout-end'}`,
            style: `--callout-accent:${accent}; --callout-bg:${background};`,
          },
        }),
      )
      const blockquotePrefixMatch = text.match(BLOCKQUOTE_PREFIX_PATTERN)
      if (blockquotePrefixMatch) {
        builder.add(
          line.from,
          line.from + blockquotePrefixMatch[0].length,
          hiddenMarkerDecoration,
        )
      }

      if (!continues) {
        activeCallout = null
      }
      continue
    }

    activeCallout = null
  }

  return builder.finish()
}

const markdownLineDecorations = ViewPlugin.fromClass(
  class {
    decorations

    constructor(view: EditorView) {
      this.decorations = createMarkdownLineDecorations(view)
    }

    update(update: { docChanged: boolean; viewportChanged: boolean; view: EditorView }) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = createMarkdownLineDecorations(update.view)
      }
    }
  },
  {
    decorations: (instance) => instance.decorations,
  },
)

const codeLanguages = [
  LanguageDescription.of({
    name: 'JavaScript',
    alias: ['javascript', 'js', 'node', 'typescript', 'ts'],
    support: javascript({ typescript: true }),
  }),
  LanguageDescription.of({
    name: 'Python',
    alias: ['python', 'python3', 'py'],
    support: python(),
  }),
  LanguageDescription.of({
    name: 'Rust',
    alias: ['rust', 'rs'],
    support: rust(),
  }),
  LanguageDescription.of({
    name: 'HTML',
    alias: ['html'],
    support: html(),
  }),
  LanguageDescription.of({
    name: 'CSS',
    alias: ['css'],
    support: css(),
  }),
  LanguageDescription.of({
    name: 'JSON',
    alias: ['json'],
    support: json(),
  }),
  LanguageDescription.of({
    name: 'Go',
    alias: ['go'],
    support: go(),
  }),
  LanguageDescription.of({
    name: 'Shell',
    alias: ['bash', 'sh', 'shell'],
    support: new LanguageSupport(StreamLanguage.define(shell)),
  }),
  LanguageDescription.of({
    name: 'Ruby',
    alias: ['ruby', 'rb'],
    support: new LanguageSupport(StreamLanguage.define(ruby)),
  }),
]

export const siriusPadEditorTheme = EditorView.theme({
  '&': {
    color: 'var(--text-primary)',
    backgroundColor: 'transparent',
    fontFamily: 'var(--editor-font-family)',
    fontSize: 'var(--editor-font-size)',
    height: '100%',
    minHeight: '0',
  },
  '.cm-scroller': {
    flex: '1 1 auto',
    fontFamily: 'var(--editor-font-family)',
    lineHeight: '1.65',
    height: '100%',
    minHeight: '0',
    overflowY: 'auto',
    overflowX: 'hidden',
    overscrollBehavior: 'contain',
    scrollbarGutter: 'stable',
    touchAction: 'pan-y',
  },
  '.cm-content': {
    minHeight: '100%',
    caretColor: 'var(--accent)',
    boxSizing: 'border-box',
    padding:
      'var(--editor-padding-top, 1.4em) var(--editor-padding-side, 1.7em) var(--editor-padding-bottom, 5.2em)',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--accent)',
  },
  '.cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'rgba(124, 106, 247, 0.22) !important',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    borderRight: '1px solid transparent',
    paddingRight: '12px',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    paddingLeft: '0',
    paddingRight: '8px',
  },
  '.cm-tooltip': {
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
  },
  '.cm-tooltip-autocomplete': {
    '& > ul > li[aria-selected]': {
      backgroundColor: 'var(--bg-active)',
      color: 'var(--text-primary)',
    },
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
  },
})

export const siriusPadHighlightStyle = HighlightStyle.define([
  { tag: tags.heading1, color: 'var(--text-primary)', fontWeight: '700' },
  {
    tag: [tags.heading2, tags.heading3],
    color: 'var(--text-primary)',
    fontWeight: '600',
  },
  { tag: [tags.keyword, tags.modifier], color: '#c792ea' },
  { tag: [tags.name, tags.deleted], color: '#f07178' },
  { tag: [tags.character, tags.macroName], color: '#c3e88d' },
  { tag: [tags.propertyName], color: '#82aaff' },
  {
    tag: [tags.processingInstruction, tags.string, tags.inserted],
    color: '#c3e88d',
  },
  {
    tag: [tags.function(tags.variableName), tags.labelName],
    color: '#82aaff',
  },
  {
    tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)],
    color: '#ffcb6b',
  },
  { tag: [tags.definition(tags.name), tags.separator], color: '#ffcb6b' },
  { tag: [tags.className], color: '#ffcb6b' },
  {
    tag: [tags.number, tags.changed, tags.annotation, tags.bool],
    color: '#f78c6c',
  },
  { tag: [tags.typeName], color: '#f78c6c' },
  { tag: [tags.operator, tags.operatorKeyword], color: '#89ddff' },
  { tag: [tags.url, tags.escape, tags.regexp, tags.link], color: '#60a5fa' },
  {
    tag: [tags.meta, tags.comment],
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
  { tag: [tags.emphasis], fontStyle: 'italic' },
  { tag: [tags.strong], fontWeight: '700' },
  { tag: [tags.strikethrough], textDecoration: 'line-through' },
  { tag: [tags.atom, tags.special(tags.variableName)], color: '#f78c6c' },
  { tag: [tags.monospace], color: '#c3e88d' },
])

interface EditorHandlers {
  onChange: (value: string) => void
  onSave: () => void | Promise<void>
  onRun?: () => void | Promise<void>
  onCursorChange?: (cursorInfo: CursorInfo) => void
}

export interface EditorCompartments {
  lineNumbers: Compartment
  wordWrap: Compartment
  tabSize: Compartment
}

export function createEditorCompartments(): EditorCompartments {
  return {
    lineNumbers: new Compartment(),
    wordWrap: new Compartment(),
    tabSize: new Compartment(),
  }
}

function createCursorInfo(view: EditorView): CursorInfo {
  const pos = view.state.selection.main.head
  const line = view.state.doc.lineAt(pos)
  const text = view.state.doc.toString()

  return {
    line: line.number,
    col: pos - line.from + 1,
    wordCount: text.trim() ? text.trim().split(/\s+/).length : 0,
    charCount: text.length,
  }
}

function lineNumberExtension(showLineNumbers: boolean): Extension {
  return showLineNumbers ? lineNumbers() : []
}

function wordWrapExtension(wordWrap: boolean): Extension {
  return wordWrap ? EditorView.lineWrapping : []
}

function tabSizeExtension(tabSize: Settings['tabSize']): Extension {
  return EditorState.tabSize.of(tabSize)
}

function taskToggleExtension(): Extension {
  return EditorView.domEventHandlers({
    mousedown(event, view) {
      const target = event.target
      if (!(target instanceof HTMLElement)) {
        return false
      }

      const marker = target.closest('.cm-md-task-widget')
      if (!(marker instanceof HTMLElement)) {
        return false
      }

      const lineElement = marker.closest('.cm-line')
      if (!(lineElement instanceof HTMLElement)) {
        return false
      }

      const position = view.posAtDOM(lineElement, 0)
      if (position === null || position === undefined) {
        return false
      }

      const toggled = toggleTaskAtPosition(view, position)
      if (!toggled) {
        return false
      }

      event.preventDefault()
      view.focus()
      return true
    },
  })
}

export function createEditorExtensions(
  settings: Settings,
  handlers: EditorHandlers,
  compartments: EditorCompartments,
): Extension[] {
  return [
    history(),
    drawSelection(),
    highlightSpecialChars(),
    compartments.tabSize.of(tabSizeExtension(settings.tabSize)),
    markdown({
      base: markdownLanguage,
      codeLanguages,
    }),
    autocompletion(),
    closeBrackets(),
    bracketMatching(),
    highlightActiveLine(),
    foldGutter(),
    search({ top: true }),
    syntaxHighlighting(siriusPadHighlightStyle, { fallback: true }),
    siriusPadEditorTheme,
    taskToggleExtension(),
    variableDecorations,
    inlineCodeDecorations,
    markdownLineDecorations,
    compartments.lineNumbers.of(lineNumberExtension(settings.showLineNumbers)),
    compartments.wordWrap.of(wordWrapExtension(settings.wordWrap)),
    keymap.of([
      { key: 'Mod-s', run: () => (handlers.onSave(), true), preventDefault: true },
      { key: 'Ctrl-Enter', run: () => (handlers.onRun?.(), true), preventDefault: true },
      { key: 'Mod-h', run: (view) => (openSearchPanel(view), true), preventDefault: true },
      { key: 'Escape', run: (view) => closeSearchPanel(view) },
      indentWithTab,
      ...defaultKeymap,
      ...historyKeymap,
      ...closeBracketsKeymap,
      ...completionKeymap,
    ]),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        handlers.onChange(update.state.doc.toString())
      }

      if (update.docChanged || update.selectionSet) {
        handlers.onCursorChange?.(createCursorInfo(update.view))
      }
    }),
  ]
}

export function reconfigureLineNumbers(
  compartments: EditorCompartments,
  showLineNumbers: boolean,
) {
  return compartments.lineNumbers.reconfigure(lineNumberExtension(showLineNumbers))
}

export function reconfigureWordWrap(
  compartments: EditorCompartments,
  wordWrap: boolean,
) {
  return compartments.wordWrap.reconfigure(wordWrapExtension(wordWrap))
}

export function reconfigureTabSize(
  compartments: EditorCompartments,
  tabSize: Settings['tabSize'],
) {
  return compartments.tabSize.reconfigure(tabSizeExtension(tabSize))
}

export function getCursorInfo(view: EditorView) {
  return createCursorInfo(view)
}

export function openEditorSearchPanel(view: EditorView) {
  openSearchPanel(view)
}
