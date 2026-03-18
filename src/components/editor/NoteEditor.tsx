import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { useEffect, useRef, type CSSProperties } from 'react'

import { createEditorExtensions } from '@/lib/codemirror'
import type { Settings } from '@/types'

interface NoteEditorProps {
  noteId: string
  value: string
  settings: Settings
  onChange: (value: string) => void
  onSave: () => void | Promise<void>
  onRun: () => void | Promise<void>
}

export function NoteEditor({
  noteId,
  value,
  settings,
  onChange,
  onSave,
  onRun,
}: NoteEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const handlersRef = useRef({ onChange, onSave, onRun })

  handlersRef.current = { onChange, onSave, onRun }

  useEffect(() => {
    if (!hostRef.current) {
      return
    }

    viewRef.current?.destroy()
    hostRef.current.innerHTML = ''

    const state = EditorState.create({
      doc: value,
      extensions: createEditorExtensions(settings, {
        onChange: (nextValue) => handlersRef.current.onChange(nextValue),
        onSave: () => handlersRef.current.onSave(),
        onRun: () => handlersRef.current.onRun(),
      }),
    })

    const view = new EditorView({
      state,
      parent: hostRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
    }
  }, [
    noteId,
    settings.fontFamily,
    settings.fontSize,
    settings.showLineNumbers,
    settings.tabSize,
    settings.wordWrap,
  ])

  useEffect(() => {
    const view = viewRef.current
    if (!view) {
      return
    }

    const currentValue = view.state.doc.toString()
    if (currentValue === value) {
      return
    }

    view.dispatch({
      changes: {
        from: 0,
        to: currentValue.length,
        insert: value,
      },
    })
  }, [value])

  return (
    <div
      className="relative min-h-0 flex-1 overflow-hidden bg-base"
      style={
        {
          '--editor-font-family': `"${settings.fontFamily}", monospace`,
          '--editor-font-size': `${settings.fontSize}px`,
        } as CSSProperties
      }
    >
      <div ref={hostRef} className="h-full" />
    </div>
  )
}
