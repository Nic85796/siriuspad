import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import {
  Clock3,
  Pin,
  PinOff,
  Search,
  Trash2,
} from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'

import {
  NOTE_LANGUAGES,
} from '@/lib/constants'
import { withAlpha } from '@/lib/color'
import { getWorkspaceDisplayName } from '@/lib/workspaceLabel'
import {
  createEditorCompartments,
  createEditorExtensions,
  getCursorInfo,
  openEditorSearchPanel,
  reconfigureLineNumbers,
  reconfigureTabSize,
  reconfigureWordWrap,
} from '@/lib/codemirror'
import { TagPill } from '@/components/ui/TagPill'
import type {
  CursorInfo,
  Note,
  PreviewMode,
  Settings,
  Workspace,
} from '@/types'

interface NoteEditorHeaderProps {
  note: Note
  workspaces: Workspace[]
  allTags: string[]
  previewMode: PreviewMode
  compact?: boolean
  onChange: (patch: Partial<Note>) => void
  onDelete: () => Promise<void>
  onTogglePin: () => Promise<void>
  onPreviewModeChange: (mode: PreviewMode) => void
  onOpenFindReplace: () => void
  onOpenHistory: () => void
}

interface NoteEditorProps {
  noteId: string
  value: string
  accentColor?: string
  compact?: boolean
  settings: Settings
  findReplaceNonce?: number
  onChange: (value: string) => void
  onSave: () => void | Promise<void>
  onRun: () => void | Promise<void>
  onCursorChange?: (cursorInfo: CursorInfo) => void
}

function controlClassName() {
  return 'h-8 rounded-md border border-border bg-[#161616] px-2.5 text-[11px] text-text-secondary outline-none transition hover:border-focus hover:bg-hover hover:text-text-primary focus:border-focus'
}

export function NoteEditorHeader({
  note,
  workspaces,
  allTags,
  previewMode,
  compact = false,
  onChange,
  onDelete,
  onTogglePin,
  onPreviewModeChange,
  onOpenFindReplace,
  onOpenHistory,
}: NoteEditorHeaderProps) {
  const { t } = useTranslation()
  const [tagValue, setTagValue] = useState('')
  const headerBackground = withAlpha(note.color, 0.06)
  const previewModes = compact
    ? (['editor', 'preview'] as PreviewMode[])
    : (['editor', 'split', 'preview'] as PreviewMode[])

  return (
    <div
      className={`motion-fade-up border-b border-border bg-[#111111] ${
        compact ? 'px-3 py-3' : 'px-4 py-3'
      }`}
      style={{
        backgroundImage: headerBackground
          ? `linear-gradient(180deg, ${headerBackground}, transparent 80%)`
          : undefined,
        boxShadow: note.color ? `inset 3px 0 0 ${note.color}` : undefined,
      }}
    >
      <div className={`flex ${compact ? 'flex-col gap-3' : 'flex-wrap items-start gap-3'}`}>
        <div className="min-w-0 flex-1">
          <input
            className={`w-full bg-transparent font-semibold tracking-tight text-text-primary outline-none placeholder:text-text-muted ${
              compact ? 'text-[18px]' : 'text-[20px]'
            }`}
            placeholder={t('note.titlePlaceholder')}
            title={t('note.titlePlaceholder')}
            value={note.title}
            onChange={(event) => onChange({ title: event.target.value })}
          />

          <div
            className={`mt-3 flex items-center gap-2 ${
              compact ? 'overflow-x-auto pb-1' : 'flex-wrap'
            }`}
          >
            {note.tags.map((tag) => (
              <TagPill
                key={tag}
                tag={tag}
                onRemove={() =>
                  onChange({
                    tags: note.tags.filter((item) => item !== tag),
                  })
                }
              />
            ))}

            <input
              className={`h-8 rounded-md border border-dashed border-border bg-transparent px-2 text-[11px] text-text-primary outline-none placeholder:text-text-muted focus:border-focus ${
                compact ? 'min-w-[132px] shrink-0' : 'min-w-[96px]'
              }`}
              list="note-tag-suggestions"
              placeholder={t('note.addTag')}
              value={tagValue}
              onChange={(event) => setTagValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') {
                  return
                }

                event.preventDefault()
                const nextTag = tagValue.trim()

                if (!nextTag || note.tags.includes(nextTag)) {
                  setTagValue('')
                  return
                }

                onChange({
                  tags: [...note.tags, nextTag],
                })
                setTagValue('')
              }}
            />
            <datalist id="note-tag-suggestions">
              {allTags.map((tag) => (
                <option key={tag} value={tag} />
              ))}
            </datalist>
          </div>
        </div>

        <div
          className={`flex items-center gap-2 ${
            compact ? 'w-full flex-wrap' : 'flex-wrap justify-end'
          }`}
        >
          <div className="flex items-center rounded-md border border-border bg-[#161616] p-1">
            {previewModes.map((mode) => (
              <button
                key={mode}
                type="button"
                className={`interactive-lift rounded-md px-2.5 py-1 text-[11px] transition ${
                  previewMode === mode
                    ? 'bg-[#222222] text-text-primary'
                    : 'text-text-secondary hover:bg-hover hover:text-text-primary'
                }`}
                onClick={() => onPreviewModeChange(mode)}
              >
                {t(`preview.${mode}`)}
              </button>
            ))}
          </div>

          <button
            type="button"
            className={`interactive-lift inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-[#161616] text-[11px] text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary ${
              compact ? 'w-8 justify-center px-0' : 'px-2.5'
            }`}
            onClick={onOpenFindReplace}
            title={t('commands.findReplace')}
            aria-label={t('commands.findReplace')}
          >
            <Search className="h-3.5 w-3.5" />
            {!compact ? t('commands.findReplace') : null}
          </button>

          <button
            type="button"
            className={`interactive-lift inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-[#161616] text-[11px] text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary ${
              compact ? 'w-8 justify-center px-0' : 'px-2.5'
            }`}
            onClick={onOpenHistory}
            title={t('history.title')}
            aria-label={t('history.title')}
          >
            <Clock3 className="h-3.5 w-3.5" />
            {!compact ? t('history.title') : null}
          </button>

          <button
            type="button"
            className="interactive-lift inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-[#161616] text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
            onClick={() => void onTogglePin()}
            title={note.pinned ? t('commands.unpinNote') : t('commands.pinNote')}
          >
            {note.pinned ? (
              <PinOff className="h-3.5 w-3.5" />
            ) : (
              <Pin className="h-3.5 w-3.5" />
            )}
          </button>

          <button
            type="button"
            className="interactive-lift inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-[#161616] text-text-secondary transition hover:border-[#4a2020] hover:bg-[#2d1515] hover:text-[#f87171]"
            onClick={() => void onDelete()}
            title={t('commands.deleteNote')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div
        className={`mt-3 ${
          compact
            ? 'grid grid-cols-1 gap-2'
            : 'flex flex-wrap items-center justify-between gap-3'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-text-muted">
            <span>{t('note.priorityLabel')}</span>
            <select
              className={controlClassName()}
              value={note.priority ?? 'media'}
              onChange={(event) =>
                onChange({
                  priority: event.target.value as Note['priority'],
                })
              }
            >
              <option value="urgente">{t('priority.urgente')}</option>
              <option value="alta">{t('priority.alta')}</option>
              <option value="media">{t('priority.media')}</option>
              <option value="baixa">{t('priority.baixa')}</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-text-muted">
            <span>{t('note.workspaceLabel')}</span>
            <select
              className={controlClassName()}
              value={note.workspace}
              onChange={(event) => onChange({ workspace: event.target.value })}
            >
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {getWorkspaceDisplayName(workspace, t)}
                </option>
              ))}
            </select>
          </label>

          <label className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-text-muted">
            <span>{t('note.languageLabel')}</span>
            <select
              className={controlClassName()}
              value={note.language}
              onChange={(event) => onChange({ language: event.target.value })}
            >
              {NOTE_LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  )
}

export function NoteEditor({
  noteId,
  value,
  accentColor,
  compact = false,
  settings,
  findReplaceNonce = 0,
  onChange,
  onSave,
  onRun,
  onCursorChange,
}: NoteEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const compartmentsRef = useRef(createEditorCompartments())
  const handlersRef = useRef({ onChange, onSave, onRun, onCursorChange })

  useEffect(() => {
    handlersRef.current = { onChange, onSave, onRun, onCursorChange }
  }, [onChange, onCursorChange, onRun, onSave])

  useEffect(() => {
    if (!hostRef.current) {
      return
    }

    viewRef.current?.destroy()
    hostRef.current.innerHTML = ''

    const state = EditorState.create({
      doc: value,
      extensions: createEditorExtensions(
        settings,
        {
          onChange: (nextValue) => handlersRef.current.onChange(nextValue),
          onSave: () => handlersRef.current.onSave(),
          onRun: () => handlersRef.current.onRun(),
          onCursorChange: (cursorInfo) => handlersRef.current.onCursorChange?.(cursorInfo),
        },
        compartmentsRef.current,
      ),
    })

    const view = new EditorView({
      state,
      parent: hostRef.current,
    })

    viewRef.current = view
    handlersRef.current.onCursorChange?.(getCursorInfo(view))

    return () => {
      view.destroy()
    }
  }, [noteId])

  useEffect(() => {
    const view = viewRef.current
    if (!view) {
      return
    }

    view.dispatch({
      effects: reconfigureLineNumbers(
        compartmentsRef.current,
        compact ? false : settings.showLineNumbers,
      ),
    })
  }, [compact, settings.showLineNumbers])

  useEffect(() => {
    const view = viewRef.current
    if (!view) {
      return
    }

    view.dispatch({
      effects: reconfigureWordWrap(compartmentsRef.current, settings.wordWrap),
    })
  }, [settings.wordWrap])

  useEffect(() => {
    const view = viewRef.current
    if (!view) {
      return
    }

    view.dispatch({
      effects: reconfigureTabSize(compartmentsRef.current, settings.tabSize),
    })
  }, [settings.tabSize])

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

  useEffect(() => {
    const view = viewRef.current
    if (!view || !findReplaceNonce) {
      return
    }

    openEditorSearchPanel(view)
  }, [findReplaceNonce])

  return (
    <div
      className="relative min-h-0 flex-1 overflow-hidden bg-[#111111]"
      style={
        {
          '--editor-font-family': `"${settings.fontFamily}", monospace`,
          '--editor-font-size': `${settings.fontSize}px`,
          boxShadow: accentColor ? `inset 3px 0 0 ${accentColor}` : undefined,
          backgroundImage: withAlpha(accentColor, 0.05)
            ? `linear-gradient(180deg, ${withAlpha(accentColor, 0.05)}, transparent 55%)`
            : undefined,
        } as CSSProperties
      }
    >
      <div ref={hostRef} className="h-full" />
    </div>
  )
}
