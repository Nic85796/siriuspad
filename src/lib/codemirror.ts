import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
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
import { EditorState, type Extension } from '@codemirror/state'
import {
  Decoration,
  EditorView,
  MatchDecorator,
  ViewPlugin,
  drawSelection,
  highlightActiveLine,
  highlightSpecialChars,
  keymap,
  lineNumbers,
} from '@codemirror/view'
import { tags } from '@lezer/highlight'

import type { Settings } from '@/types'

const variableDecoration = Decoration.mark({
  class: 'cm-variable-token',
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

const codeLanguages = [
  LanguageDescription.of({
    name: 'JavaScript',
    alias: ['javascript', 'js', 'node'],
    support: javascript(),
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
  },
  '.cm-scroller': {
    fontFamily: 'var(--editor-font-family)',
    lineHeight: '1.65',
    overflow: 'auto',
  },
  '.cm-content': {
    minHeight: '100%',
    caretColor: 'var(--accent)',
    padding: '24px 32px 96px',
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
  { tag: [tags.heading2, tags.heading3], color: 'var(--text-primary)', fontWeight: '600' },
  { tag: [tags.keyword, tags.modifier], color: '#c792ea' },
  { tag: [tags.name, tags.deleted], color: '#f07178' },
  { tag: [tags.character, tags.macroName], color: '#c3e88d' },
  { tag: [tags.propertyName], color: '#82aaff' },
  { tag: [tags.processingInstruction, tags.string, tags.inserted], color: '#c3e88d' },
  { tag: [tags.function(tags.variableName), tags.labelName], color: '#82aaff' },
  { tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)], color: '#ffcb6b' },
  { tag: [tags.definition(tags.name), tags.separator], color: '#ffcb6b' },
  { tag: [tags.className], color: '#ffcb6b' },
  { tag: [tags.number, tags.changed, tags.annotation, tags.bool], color: '#f78c6c' },
  { tag: [tags.typeName], color: '#f78c6c' },
  { tag: [tags.operator, tags.operatorKeyword], color: '#89ddff' },
  { tag: [tags.url, tags.escape, tags.regexp, tags.link], color: '#60a5fa' },
  { tag: [tags.meta, tags.comment], color: 'var(--text-muted)', fontStyle: 'italic' },
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
}

export function createEditorExtensions(
  settings: Settings,
  handlers: EditorHandlers,
): Extension[] {
  const extensions: Extension[] = [
    history(),
    drawSelection(),
    highlightSpecialChars(),
    EditorState.tabSize.of(settings.tabSize),
    markdown({
      base: markdownLanguage,
      codeLanguages,
    }),
    autocompletion(),
    closeBrackets(),
    bracketMatching(),
    highlightActiveLine(),
    foldGutter(),
    syntaxHighlighting(siriusPadHighlightStyle, { fallback: true }),
    siriusPadEditorTheme,
    variableDecorations,
    keymap.of([
      { key: 'Mod-s', run: () => (handlers.onSave(), true), preventDefault: true },
      { key: 'Ctrl-Enter', run: () => (handlers.onRun?.(), true), preventDefault: true },
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
    }),
  ]

  if (settings.showLineNumbers) {
    extensions.push(lineNumbers())
  }

  if (settings.wordWrap) {
    extensions.push(EditorView.lineWrapping)
  }

  return extensions
}
