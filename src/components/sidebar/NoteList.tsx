import { formatDistanceToNow } from 'date-fns'
import { Pin, Plus } from 'lucide-react'

import type { NoteMetadata } from '@/types'

interface NoteListProps {
  notes: NoteMetadata[]
  activeNoteId: string | null
  activeTag: string | null
  onOpenNote: (noteId: string) => Promise<void>
  onCreateNote: () => Promise<void>
  onTagClick: (tag: string | null) => void
}

export function NoteList({
  notes,
  activeNoteId,
  activeTag,
  onOpenNote,
  onCreateNote,
  onTagClick,
}: NoteListProps) {
  return (
    <section className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
          Notes
        </h2>
        <button
          type="button"
          className="rounded-md border border-border p-1 text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
          onClick={() => void onCreateNote()}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid gap-2">
        {notes.map((note) => {
          const isActive = note.id === activeNoteId
          return (
            <button
              key={note.id}
              type="button"
              className={`rounded-xl border px-3 py-3 text-left transition ${
                isActive
                  ? 'border-focus bg-active'
                  : 'border-border bg-surface hover:border-focus hover:bg-hover'
              }`}
              onClick={() => void onOpenNote(note.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {note.title}
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {formatDistanceToNow(new Date(note.updated_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                {note.pinned ? (
                  <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow" />
                ) : null}
              </div>

              {note.tags.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {note.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] transition ${
                        activeTag === tag
                          ? 'border-accent bg-accent/15 text-accent'
                          : 'border-border text-text-secondary hover:border-focus hover:text-text-primary'
                      }`}
                      onClick={(event) => {
                        event.stopPropagation()
                        onTagClick(activeTag === tag ? null : tag)
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </button>
          )
        })}
      </div>
    </section>
  )
}
