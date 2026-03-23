/**
 * MobileFormatBar — Barra de formatação Markdown fixa para mobile
 * Aparece acima do teclado virtual quando o usuário está editando.
 * Contém botões para formatação rápida (negrito, itálico, código, lista, etc.)
 */

import {
  Bold,
  Italic,
  Code,
  List,
  ListOrdered,
  Link,
  Hash,
  Quote,
  Code2,
  Minus,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import { useState, useRef } from 'react'
import type { EditorView } from '@codemirror/view'

// ─── Tipos ──────────────────────────────────────────────

interface FormatAction {
  id: string
  icon: typeof Bold
  label: string
  title: string
  wrap?: [string, string]
  line?: string
  block?: string
}

// ─── Definição das ações ────────────────────────────────

const FORMAT_GROUPS: FormatAction[][] = [
  // Grupo 1: formatação de texto
  [
    {
      id: 'bold',
      icon: Bold,
      label: 'B',
      title: 'Negrito',
      wrap: ['**', '**'],
    },
    {
      id: 'italic',
      icon: Italic,
      label: 'I',
      title: 'Itálico',
      wrap: ['*', '*'],
    },
    {
      id: 'code',
      icon: Code,
      label: '`',
      title: 'Código inline',
      wrap: ['`', '`'],
    },
    {
      id: 'codeblock',
      icon: Code2,
      label: '</\u003e',
      title: 'Bloco de código',
      wrap: ['```\n', '\n```'],
    },
  ],
  // Grupo 2: estrutura
  [
    {
      id: 'h1',
      icon: Hash,
      label: 'H1',
      title: 'Título 1',
      line: '# ',
    },
    {
      id: 'h2',
      icon: Hash,
      label: 'H2',
      title: 'Título 2',
      line: '## ',
    },
    {
      id: 'quote',
      icon: Quote,
      label: '"',
      title: 'Citação',
      line: '> ',
    },
    {
      id: 'hr',
      icon: Minus,
      label: '--',
      title: 'Separador',
      block: '\n---\n',
    },
  ],
  // Grupo 3: listas e links
  [
    {
      id: 'ul',
      icon: List,
      label: '•',
      title: 'Lista não-ordenada',
      line: '- ',
    },
    {
      id: 'ol',
      icon: ListOrdered,
      label: '1.',
      title: 'Lista numerada',
      line: '1. ',
    },
    {
      id: 'task',
      icon: List,
      label: '[ ]',
      title: 'Checklist',
      line: '- [ ] ',
    },
    {
      id: 'link',
      icon: Link,
      label: '[]',
      title: 'Link',
      wrap: ['[', '](url)'],
    },
  ],
]

// ─── Aplicar formatação ao CodeMirror ─────────────────

function applyFormat(view: EditorView, action: FormatAction) {
  const { state } = view
  const { selection } = state
  const mainRange = selection.main
  const selectedText = state.sliceDoc(mainRange.from, mainRange.to)

  let newText: string
  let newFrom = mainRange.from
  let newTo: number

  if (action.block) {
    // Insere um bloco na posição atual
    newText = action.block
    view.dispatch({
      changes: { from: mainRange.from, to: mainRange.to, insert: newText },
      selection: { anchor: mainRange.from + newText.length },
    })
    view.focus()
    return
  }

  if (action.wrap) {
    const [pre, suf] = action.wrap
    if (selectedText) {
      if (selectedText.startsWith(pre) && selectedText.endsWith(suf)) {
        newText = selectedText.slice(pre.length, selectedText.length - suf.length)
      } else {
        newText = `${pre}${selectedText}${suf}`
      }
    } else {
      // Sem seleção: insere o wrapper e posiciona o cursor no meio
      newText = `${pre}${suf}`
      view.dispatch({
        changes: { from: mainRange.from, to: mainRange.to, insert: newText },
        selection: { anchor: mainRange.from + pre.length },
      })
      view.focus()
      return
    }
    newTo = newFrom + newText.length
  } else if (action.line) {
    const pre = action.line
    // Aplica ao início da linha atual
    const line = state.doc.lineAt(mainRange.from)
    const lineText = line.text
    if (lineText.startsWith(pre)) {
      newText = lineText.slice(pre.length)
      newFrom = line.from
      newTo = line.from + newText.length
    } else {
      newText = `${pre}${lineText}`
      newFrom = line.from
      newTo = line.from + newText.length
    }
  } else {
    return
  }

  view.dispatch({
    changes: { from: newFrom, to: newFrom + (action.wrap ? selectedText.length : state.doc.lineAt(mainRange.from).text.length), insert: newText },
    selection: { anchor: newFrom, head: newTo },
  })
  view.focus()
}

// ─── Componente ────────────────────────────────────────

interface MobileFormatBarProps {
  editorView: EditorView | null
  visible: boolean
}

export function MobileFormatBar({ editorView, visible }: MobileFormatBarProps) {
  const [groupIndex, setGroupIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  if (!visible) return null

  const currentGroup = FORMAT_GROUPS[groupIndex] ?? FORMAT_GROUPS[0]!

  const prevGroup = () => setGroupIndex((g) => Math.max(0, g - 1))
  const nextGroup = () => setGroupIndex((g) => Math.min(FORMAT_GROUPS.length - 1, g + 1))

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[150] flex items-center gap-1 border-t border-border bg-elevated px-2 py-1.5"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 4px)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Navegação de grupos */}
      <button
        type="button"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-muted transition active:bg-hover disabled:opacity-30"
        onClick={prevGroup}
        disabled={groupIndex === 0}
        aria-label="Grupo anterior"
      >
        <ChevronLeft size={16} />
      </button>

      {/* Botões de formato */}
      <div
        ref={scrollRef}
        className="flex flex-1 items-center justify-around gap-1 overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        {currentGroup.map((action) => {
          const Icon = action.icon
          const isMono = action.id === 'code' || action.id === 'codeblock' || action.id === 'hr' || action.id === 'task' || action.id === 'h1' || action.id === 'h2' || action.id === 'ul' || action.id === 'ol' || action.id === 'link' || action.id === 'quote'

          return (
            <button
              key={action.id}
              type="button"
              title={action.title}
              className="flex h-10 min-w-[2.5rem] flex-1 items-center justify-center rounded-lg border border-transparent text-text-secondary transition active:scale-90 active:border-border active:bg-hover active:text-text-primary"
              onPointerDown={(e) => {
                // Previne que o teclado virtual feche
                e.preventDefault()
                if (editorView) applyFormat(editorView, action)
              }}
            >
              {action.id === 'bold' || action.id === 'italic' || action.id === 'code' || action.id === 'quote' ? (
                <Icon size={16} className={action.id === 'bold' ? 'stroke-[2.5]' : ''} />
              ) : (
                <span
                  className="text-[11px] font-semibold leading-none"
                  style={{ fontFamily: isMono ? 'monospace' : undefined }}
                >
                  {action.label}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* paginação / pontos */}
      <div className="flex shrink-0 items-center gap-1 px-1">
        {FORMAT_GROUPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === groupIndex ? 'w-3 bg-accent' : 'w-1.5 bg-border'
            }`}
          />
        ))}
      </div>

      {/* Navegação de grupos */}
      <button
        type="button"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-muted transition active:bg-hover disabled:opacity-30"
        onClick={nextGroup}
        disabled={groupIndex === FORMAT_GROUPS.length - 1}
        aria-label="Próximo grupo"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
