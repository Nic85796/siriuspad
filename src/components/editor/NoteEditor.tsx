import { EditorState } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { EditorView as EditorViewClass } from '@codemirror/view'
import {
  SlidersHorizontal,
  Clock3,
  Pin,
  PinOff,
  Search,
  Trash2,
} from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { FormatToolbar } from '@/components/ui/FormatToolbar'
import { MobileFormatBar } from '@/components/ui/MobileFormatBar'
import { useUiStore } from '@/store/ui'

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
  reconfigureReadOnly,
  reconfigureTabSize,
  reconfigureVimMode,
  reconfigureWordWrap,
} from '@/lib/codemirror'
import { TagPill } from '@/components/ui/TagPill'
import type {
  CursorInfo,
  Note,
  Settings,
  Workspace,
} from '@/types'

interface NoteEditorHeaderProps {
  note: Note
  workspaces: Workspace[]
  allTags: string[]
  compact?: boolean
  showCompactMeta?: boolean
  onChange: (patch: Partial<Note>) => void
  onDelete: () => Promise<void>
  onTogglePin: () => Promise<void>
  onOpenFindReplace: () => void
  onOpenHistory: () => void
  onToggleCompactMeta?: () => void
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
  onWikiLinkClick?: (title: string) => void
}

function controlClassName() {
  return 'h-8 rounded-md border border-border bg-elevated px-2.5 text-[11px] text-text-secondary outline-none transition hover:border-focus hover:bg-hover hover:text-text-primary focus:border-focus'
}

function compactMetaFieldClassName() {
  return 'grid gap-1.5 rounded-md border border-border bg-elevated p-2.5'
}

export function NoteEditorHeader({
  note,
  workspaces,
  allTags,
  compact = false,
  showCompactMeta = true,
  onChange,
  onDelete,
  onTogglePin,
  onOpenFindReplace,
  onOpenHistory,
  onToggleCompactMeta,
}: NoteEditorHeaderProps) {
  const { t } = useTranslation()
  const [tagValue, setTagValue] = useState('')
  const headerBackground = withAlpha(note.color, 0.06)
  const isWelcome = ["Bem-vindo ao SiriusPad", "Bienvenido a SiriusPad", "Welcome to SiriusPad"].includes(note.title.trim());

  return (
    <div
      className={`motion-fade-up border-b border-border bg-surface ${
        compact ? 'px-3 py-3' : 'px-4 py-3'
      }`}
      style={{
        backgroundImage: headerBackground
          ? `linear-gradient(180deg, ${headerBackground}, transparent 80%)`
          : undefined,
        boxShadow: note.color ? `inset 3px 0 0 ${note.color}` : undefined,
      }}
    >
      <div className={`flex ${compact ? 'flex-col gap-3' : 'flex-wrap items-start gap-4'}`}>
        <div className="min-w-0 flex-1">
          <input
            className={`w-full bg-transparent font-semibold tracking-tight text-text-primary outline-none placeholder:text-text-muted ${
              compact ? 'text-[18px]' : 'text-[20px]'
            } ${isWelcome ? 'cursor-default opacity-80' : ''}`}
            placeholder={t('note.titlePlaceholder')}
            title={t('note.titlePlaceholder')}
            value={note.title}
            readOnly={isWelcome}
            onChange={(event) => !isWelcome && onChange({ title: event.target.value })}
          />

          <div className={`mt-3 flex gap-2 ${compact ? 'flex-wrap' : 'flex-wrap items-center'}`}>
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

            {!isWelcome && (
              <input
                className={`h-8 rounded-md border border-dashed border-border bg-transparent px-2 text-[11px] text-text-primary outline-none placeholder:text-text-muted focus:border-focus ${
                  compact ? 'min-w-[128px] flex-1' : 'min-w-[96px]'
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
            )}
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
          <button
            type="button"
            className={`interactive-lift inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-elevated text-[11px] text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary ${
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
            className={`interactive-lift inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-elevated text-[11px] text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary ${
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
            className="interactive-lift inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-elevated text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
            onClick={() => void onTogglePin()}
            title={note.pinned ? t('commands.unpinNote') : t('commands.pinNote')}
          >
            {note.pinned ? (
              <PinOff className="h-3.5 w-3.5" />
            ) : (
              <Pin className="h-3.5 w-3.5" />
            )}
          </button>

          {!isWelcome && (
            <button
              type="button"
              className="interactive-lift inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-elevated text-text-secondary transition hover:border-red/30 hover:bg-red/10 hover:text-red"
              onClick={() => void onDelete()}
              title={t('commands.deleteNote')}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {compact ? (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-elevated px-3 text-[11px] uppercase tracking-[0.12em] text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
            onClick={onToggleCompactMeta}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {showCompactMeta ? t('note.hideMetaAction') : t('note.showMetaAction')}
          </button>
        </div>
      ) : null}

      {(!compact || showCompactMeta) ? (
      <div
        className={`mt-3 ${
          compact
            ? 'grid grid-cols-1 gap-2 sm:grid-cols-3'
            : 'flex flex-wrap items-center justify-between gap-3'
        }`}
      >
        <div className={compact ? compactMetaFieldClassName() : 'flex flex-wrap items-center gap-2'}>
          <label className={`${compact ? 'grid gap-1.5' : 'inline-flex items-center gap-2'} text-[10px] uppercase tracking-[0.16em] text-text-muted`}>
            <span>{t('note.priorityLabel')}</span>
            <select
              className={`${controlClassName()} ${compact ? 'w-full' : ''}`}
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

        <div className={compact ? 'contents' : 'flex flex-wrap items-center gap-2'}>
          <div className={compact ? compactMetaFieldClassName() : ''}>
            <label className={`${compact ? 'grid gap-1.5' : 'inline-flex items-center gap-2'} text-[10px] uppercase tracking-[0.16em] text-text-muted`}>
            <span>{t('note.workspaceLabel')}</span>
            <select
              className={`${controlClassName()} ${compact ? 'w-full' : ''}`}
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
          </div>

          <div className={compact ? compactMetaFieldClassName() : ''}>
            <label className={`${compact ? 'grid gap-1.5' : 'inline-flex items-center gap-2'} text-[10px] uppercase tracking-[0.16em] text-text-muted`}>
            <span>{t('note.languageLabel')}</span>
            <select
              className={`${controlClassName()} ${compact ? 'w-full' : ''}`}
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
      ) : null}
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
  onWikiLinkClick,
}: NoteEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const compartmentsRef = useRef(createEditorCompartments())
  const handlersRef = useRef({ onChange, onSave, onRun, onCursorChange, onWikiLinkClick })
  const [editorView, setEditorView] = useState<EditorView | null>(null)
  const [editorFocused, setEditorFocused] = useState(false)
  const platform = useUiStore((s) => s.platform)
  const isMobile = platform === 'android' || platform === 'ios'

  useEffect(() => {
    handlersRef.current = { onChange, onSave, onRun, onCursorChange, onWikiLinkClick }
  }, [onChange, onCursorChange, onRun, onSave, onWikiLinkClick])

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
          onWikiLinkClick: (title) => handlersRef.current.onWikiLinkClick?.(title),
        },
        compartmentsRef.current,
      ),
    })

    const view = new EditorViewClass({
      state,
      parent: hostRef.current,
    })

    viewRef.current = view
    setEditorView(view)
    handlersRef.current.onCursorChange?.(getCursorInfo(view))

    return () => {
      view.destroy()
      setEditorView(null)
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

    view.dispatch({
      effects: reconfigureVimMode(compartmentsRef.current, settings.vimMode ?? false),
    })
  }, [settings.vimMode])

  useEffect(() => {
    const view = viewRef.current
    if (!view) {
      return
    }

    const contentTitle = value.split('\n')[0].replace(/^#\s+/, '').trim()
    const isNoteReadonly = ["Bem-vindo ao SiriusPad", "Bienvenido a SiriusPad", "Welcome to SiriusPad"].includes(contentTitle)

    view.dispatch({
      effects: reconfigureReadOnly(compartmentsRef.current, isNoteReadonly),
    })
  }, [value])

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

  // Detectar foco/blur do editor para exibir MobileFormatBar
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const onFocus = () => setEditorFocused(true)
    const onBlur = () => setEditorFocused(false)
    container.addEventListener('focusin', onFocus)
    container.addEventListener('focusout', onBlur)
    return () => {
      container.removeEventListener('focusin', onFocus)
      container.removeEventListener('focusout', onBlur)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative h-full min-h-0 overflow-hidden bg-surface"
      style={
        {
          '--editor-font-family': `"${settings.fontFamily}", monospace`,
          '--editor-font-size': `${settings.fontSize}px`,
          '--editor-padding-top': compact ? '1rem' : '1.2rem',
          '--editor-padding-side': compact ? '1rem' : '1.7rem',
          '--editor-padding-bottom': compact
            ? isMobile && editorFocused
              ? 'calc(env(safe-area-inset-bottom, 0px) + 5rem)'
              : 'calc(env(safe-area-inset-bottom, 0px) + 8rem)'
            : isMobile && editorFocused
              ? 'calc(env(safe-area-inset-bottom, 0px) + 4.5rem)'
              : '5.6rem',
          boxShadow: accentColor ? `inset 3px 0 0 ${accentColor}` : undefined,
          backgroundImage: withAlpha(accentColor, 0.05)
            ? `linear-gradient(180deg, ${withAlpha(accentColor, 0.05)}, transparent 55%)`
            : undefined,
        } as CSSProperties
      }
    >
      <div ref={hostRef} className="h-full min-h-0 overflow-hidden" />
      {!isMobile && <FormatToolbar editorView={editorView} containerRef={containerRef} />}
      {isMobile && <MobileFormatBar editorView={editorView} visible={editorFocused} />}
    </div>
  )
}
