import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { EXECUTABLE_LANGUAGES } from '@/lib/constants'
import { NoteEnhancements } from '@/components/editor/NoteEnhancements'
import { MarkdownPreview } from '@/components/editor/MarkdownPreview'
import { NoteEditor, NoteEditorHeader } from '@/components/editor/NoteEditor'
import { Terminal } from '@/components/editor/Terminal'
import type {
  AppPlatform,
  CursorInfo,
  Note,
  PreviewMode,
  RunResult,
  Settings,
  Workspace,
} from '@/types'

type CalloutTemplateTone = 'note' | 'tip' | 'warning' | 'danger'

interface EditorPaneProps {
  platform: AppPlatform
  note: Note | null
  noteDirectory: string | null
  settings: Settings
  workspaces: Workspace[]
  allTags: string[]
  previewMode: PreviewMode
  previewSplitRatio: number
  findReplaceNonce: number
  toggleTerminalNonce: number
  runner: {
    result: RunResult | null
    running: boolean
    timeoutSeconds: number
    lastRun: {
      id: string
      label: string
      language: string
      source: 'note' | 'block'
    } | null
    run: () => Promise<void>
    runSnippet: (input: {
      code: string
      language: string
      label?: string
      source?: 'note' | 'block'
      cwd?: string | null
    }) => Promise<void>
    clear: () => void
    setTimeoutSeconds: (value: number) => void
  }
  onNoteChange: (patch: Partial<Note>) => void
  onContentChange: (value: string) => void
  onSave: () => Promise<void>
  onDelete: () => Promise<void>
  onTogglePin: () => Promise<void>
  onCreateNote: () => Promise<void>
  onCursorChange: (cursorInfo: CursorInfo) => void
  onPreviewModeChange: (mode: PreviewMode) => void
  onPreviewSplitRatioChange: (ratio: number) => void
  onOpenFindReplace: () => void
  onOpenHistory: () => void
}

export function EditorPane({
  platform,
  note,
  noteDirectory,
  settings,
  workspaces,
  allTags,
  previewMode,
  previewSplitRatio,
  findReplaceNonce,
  toggleTerminalNonce,
  runner,
  onNoteChange,
  onContentChange,
  onSave,
  onDelete,
  onTogglePin,
  onCreateNote,
  onCursorChange,
  onPreviewModeChange,
  onPreviewSplitRatioChange,
  onOpenFindReplace,
  onOpenHistory,
}: EditorPaneProps) {
  const { t } = useTranslation()
  const resizeStateRef = useRef<{
    width: number
    startX: number
    startRatio: number
  } | null>(null)
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [terminalHeight, setTerminalHeight] = useState(280)
  const [terminalSeed, setTerminalSeed] = useState<
    | {
        id: number
        kind: 'command'
        value: string
      }
    | {
        id: number
        kind: 'snippet'
        code: string
        language: string | null
      }
    | null
  >(null)

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (!resizeStateRef.current) {
        return
      }

      const delta = event.clientX - resizeStateRef.current.startX
      const ratio =
        (resizeStateRef.current.width * resizeStateRef.current.startRatio + delta) /
        resizeStateRef.current.width
      onPreviewSplitRatioChange(ratio)
    }

    const onMouseUp = () => {
      resizeStateRef.current = null
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [onPreviewSplitRatioChange])

  useEffect(() => {
    if (!toggleTerminalNonce) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setTerminalOpen((current) => !current)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [toggleTerminalNonce])

  useEffect(() => {
    if (!runner.running && !runner.result) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setTerminalOpen(true)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [runner.result, runner.running])

  if (!note) {
    return (
      <main className="flex min-h-0 flex-1 items-center justify-center bg-base">
        <div className="max-w-md rounded-lg border border-dashed border-border bg-[#111111] px-6 py-10 text-center">
          <p className="text-sm font-semibold text-text-primary">
            {t('note.noActive')}
          </p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            {t('note.noActiveDescription')}
          </p>
          <button
            type="button"
            className="mt-5 rounded-md border border-border bg-[#161616] px-4 py-2 text-sm font-medium text-text-primary transition hover:border-focus hover:bg-hover"
            onClick={() => void onCreateNote()}
          >
            {t('note.createFirstAction')}
          </button>
        </div>
      </main>
    )
  }

  const canRunSnippet = EXECUTABLE_LANGUAGES.has(note.language.toLowerCase())
  const appendTemplate = (template: string) => {
    const trimmedTemplate = template.trimEnd()
    const nextContent = note.content.trim()
      ? `${note.content.trimEnd()}\n\n${trimmedTemplate}\n`
      : `${trimmedTemplate}\n`

    onContentChange(nextContent)
    onPreviewModeChange('split')
  }

  const insertCalloutTemplate = (tone: CalloutTemplateTone) => {
    const templates: Record<CalloutTemplateTone, string> = {
      note: `> [!NOTE] ${t('note.calloutTemplateNoteTitle')}\n> ${t('note.calloutTemplateNoteBody')}`,
      tip: `> [!TIP] ${t('note.calloutTemplateTipTitle')}\n> ${t('note.calloutTemplateTipBody')}`,
      warning: `> [!WARNING] ${t('note.calloutTemplateWarningTitle')}\n> ${t('note.calloutTemplateWarningBody')}`,
      danger: `> [!BUG] ${t('note.calloutTemplateDangerTitle')}\n> ${t('note.calloutTemplateDangerBody')}`,
    }

    appendTemplate(templates[tone])
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-base">
      <NoteEditorHeader
        note={note}
        workspaces={workspaces}
        allTags={allTags}
        previewMode={previewMode}
        onChange={onNoteChange}
        onDelete={onDelete}
        onTogglePin={onTogglePin}
        onPreviewModeChange={onPreviewModeChange}
        onOpenFindReplace={onOpenFindReplace}
        onOpenHistory={onOpenHistory}
      />

      <NoteEnhancements
        key={note.id}
        note={note}
        onChecklistChange={(checklist) => onNoteChange({ checklist })}
        onInsertCallout={insertCalloutTemplate}
      />

      <div className="relative flex min-h-0 flex-1">
        {previewMode !== 'preview' ? (
          <div
            className="min-w-0"
            style={{
              width: previewMode === 'split' ? `${previewSplitRatio * 100}%` : '100%',
            }}
          >
            <NoteEditor
              noteId={note.id}
              value={note.content}
              accentColor={note.color}
              settings={settings}
              findReplaceNonce={findReplaceNonce}
              onChange={onContentChange}
              onSave={onSave}
              onRun={async () => {
                setTerminalOpen(true)
                await runner.run()
              }}
              onCursorChange={onCursorChange}
            />
          </div>
        ) : null}

        {previewMode === 'split' ? (
          <div
            className="w-1 cursor-col-resize bg-border hover:bg-[var(--accent-subtle)]"
            onMouseDown={(event) => {
              const container = event.currentTarget.parentElement
              if (!container) {
                return
              }

              resizeStateRef.current = {
                width: container.getBoundingClientRect().width,
                startX: event.clientX,
                startRatio: previewSplitRatio,
              }
            }}
          />
        ) : null}

        {previewMode !== 'editor' ? (
          <div
            className="min-w-0 border-l border-border"
            style={{
              width: previewMode === 'split' ? `${(1 - previewSplitRatio) * 100}%` : '100%',
            }}
          >
            <MarkdownPreview
              content={note.content}
              accentColor={note.color}
              onRunCodeInTerminal={({ code, language }) => {
                setTerminalOpen(true)
                setTerminalSeed({
                  id: Date.now(),
                  kind: 'snippet',
                  code,
                  language,
                })
              }}
            />
          </div>
        ) : null}
      </div>

      <Terminal
        platform={platform}
        noteDirectory={noteDirectory}
        open={terminalOpen}
        height={terminalHeight}
        canRunSnippet={canRunSnippet}
        seedCommand={terminalSeed}
        runner={runner}
        onOpenChange={setTerminalOpen}
        onHeightChange={setTerminalHeight}
      />
    </main>
  )
}
