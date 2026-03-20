import { format, formatDistanceToNow } from 'date-fns'
import { Pin, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { withAlpha } from '@/lib/color'
import { getDateFnsLocale } from '@/lib/date'
import { PriorityDot } from '@/components/ui/PriorityDot'
import { TagPill } from '@/components/ui/TagPill'
import type { NoteMetadata } from '@/types'

interface NoteListProps {
  notes: NoteMetadata[]
  activeNoteId: string | null
  activeTag: string | null
  onOpenNote: (noteId: string) => Promise<void>
  onDuplicateNote: (noteId: string) => Promise<void>
  onTogglePinNote: (noteId: string) => Promise<void>
  onDeleteNote: (noteId: string) => Promise<void>
  onCreateNote: () => Promise<void>
  onTagClick: (tag: string | null) => void
}

interface ContextMenuState {
  note: NoteMetadata
  x: number
  y: number
}

export function NoteList({
  notes,
  activeNoteId,
  activeTag,
  onOpenNote,
  onDuplicateNote,
  onTogglePinNote,
  onDeleteNote,
  onCreateNote,
  onTagClick,
}: NoteListProps) {
  const { t, i18n } = useTranslation()
  const [menu, setMenu] = useState<ContextMenuState | null>(null)

  const runMenuAction = (action: () => Promise<void>) => {
    setMenu(null)
    void action()
  }

  useEffect(() => {
    if (!menu) {
      return
    }

    const closeMenu = () => setMenu(null)
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenu(null)
      }
    }

    window.addEventListener('click', closeMenu)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('click', closeMenu)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [menu])

  return (
    <section className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
          {t('sidebar.notes')}
        </h2>
        <button
          type="button"
          className="interactive-lift rounded-md border border-border bg-[#161616] p-1.5 text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
          onClick={() => void onCreateNote()}
          title={t('sidebar.newNote')}
          aria-label={t('sidebar.newNote')}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid gap-2">
        {notes.map((note, index) => {
          const isActive = note.id === activeNoteId
          return (
            <button
              key={note.id}
              type="button"
              className={`motion-fade-up surface-hover relative overflow-hidden rounded-md border px-3 py-3 text-left transition ${
                isActive
                  ? 'border-focus bg-[#161616]'
                  : 'border-border bg-[#111111] hover:border-focus hover:bg-hover'
              }`}
              style={{
                boxShadow: note.color ? `inset 2px 0 0 ${note.color}` : undefined,
                backgroundImage:
                  withAlpha(note.color, isActive ? 0.11 : 0.06)
                    ? `linear-gradient(180deg, ${withAlpha(note.color, isActive ? 0.11 : 0.06)}, transparent 80%)`
                    : undefined,
                animationDelay: `${Math.min(index * 28, 180)}ms`,
              }}
              onClick={() => void onOpenNote(note.id)}
              onContextMenu={(event) => {
                event.preventDefault()
                setMenu({
                  note,
                  x: event.clientX,
                  y: event.clientY,
                })
              }}
            >
              <span
                className={`absolute inset-y-0 left-0 w-0.5 ${
                  isActive ? 'bg-accent' : 'bg-transparent'
                }`}
              />
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {note.color ? (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full border border-white/10"
                        style={{ backgroundColor: note.color }}
                      />
                    ) : null}
                    <p className="truncate text-[12px] font-medium text-text-primary">
                      {note.title || t('common.untitled')}
                    </p>
                  </div>
                </div>
                {note.pinned ? (
                  <Pin
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow"
                    aria-label={t('note.pinned')}
                  />
                ) : null}
              </div>

              <div
                className="mt-2 flex items-center gap-2 text-[10px] text-text-secondary"
                title={format(new Date(note.updated_at), 'PPPpp', {
                  locale: getDateFnsLocale(i18n.language),
                })}
              >
                <PriorityDot priority={note.priority} />
                {note.tags[0] ? (
                  <TagPill
                    tag={note.tags[0]}
                    compact
                    active={activeTag === note.tags[0]}
                    onClick={() => onTagClick(activeTag === note.tags[0] ? null : note.tags[0])}
                  />
                ) : null}
                <span className="truncate">
                  {formatDistanceToNow(new Date(note.updated_at), {
                    addSuffix: true,
                    locale: getDateFnsLocale(i18n.language),
                  })}
                </span>
              </div>
            </button>
          )
        })}
        {!notes.length ? (
          <div className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-text-secondary">
            <p>{t('sidebar.noNotes')}</p>
            <button
              type="button"
              className="mt-3 rounded-md border border-border bg-[#161616] px-3 py-2 text-sm font-medium text-text-primary transition hover:border-focus hover:bg-hover"
              onClick={() => void onCreateNote()}
            >
              {t('sidebar.newNote')}
            </button>
          </div>
        ) : null}
      </div>

      {menu ? (
        <div
          className="fixed z-[65] w-52 rounded-md border border-border bg-[#161616] p-1"
          style={{ left: menu.x, top: menu.y }}
        >
          <button
            type="button"
            className="workspace-menu-item"
            onClick={() => runMenuAction(() => onOpenNote(menu.note.id))}
          >
            {t('common.open')}
          </button>
          <button
            type="button"
            className="workspace-menu-item"
            onClick={() => runMenuAction(() => onDuplicateNote(menu.note.id))}
          >
            {t('commands.duplicateNote')}
          </button>
          <button
            type="button"
            className="workspace-menu-item"
            onClick={() => runMenuAction(() => onTogglePinNote(menu.note.id))}
          >
            {menu.note.pinned ? t('commands.unpinNote') : t('commands.pinNote')}
          </button>
          <button
            type="button"
            className="workspace-menu-item text-red hover:bg-red/10"
            onClick={() => runMenuAction(() => onDeleteNote(menu.note.id))}
          >
            {t('common.delete')}
          </button>
        </div>
      ) : null}
    </section>
  )
}
