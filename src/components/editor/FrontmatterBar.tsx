import { Pin, PinOff, Trash2, X } from 'lucide-react'
import { useState } from 'react'

import { NOTE_LANGUAGES } from '@/lib/constants'
import type { Note, Workspace } from '@/types'

interface FrontmatterBarProps {
  note: Note
  workspaces: Workspace[]
  allTags: string[]
  onChange: (patch: Partial<Note>) => void
  onDelete: () => Promise<void>
  onTogglePin: () => Promise<void>
}

function controlClassName() {
  return 'rounded-lg border border-border bg-base px-2.5 py-1.5 text-xs text-text-primary outline-none transition focus:border-focus'
}

export function FrontmatterBar({
  note,
  workspaces,
  allTags,
  onChange,
  onDelete,
  onTogglePin,
}: FrontmatterBarProps) {
  const [tagValue, setTagValue] = useState('')

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-2 border-b border-border bg-surface px-4 py-2">
      <input
        className="min-w-[220px] flex-1 rounded-lg border border-border bg-base px-3 py-2 text-sm font-medium text-text-primary outline-none transition placeholder:text-text-muted focus:border-focus"
        placeholder="Note title"
        value={note.title}
        onChange={(event) => onChange({ title: event.target.value })}
      />

      <select
        className={controlClassName()}
        value={note.workspace}
        onChange={(event) => onChange({ workspace: event.target.value })}
      >
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.name}
          </option>
        ))}
      </select>

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

      <div className="flex flex-wrap items-center gap-2">
        {note.tags.map((tag) => (
          <button
            key={tag}
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-border bg-base px-2 py-1 text-[11px] text-text-secondary transition hover:border-focus hover:text-text-primary"
            onClick={() =>
              onChange({
                tags: note.tags.filter((item) => item !== tag),
              })
            }
          >
            {tag}
            <X className="h-3 w-3" />
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          className={`${controlClassName()} w-32`}
          list="note-tag-suggestions"
          placeholder="Add tag"
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

      <button
        type="button"
        className="rounded-lg border border-border bg-base p-2 text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
        onClick={() => void onTogglePin()}
        title={note.pinned ? 'Unpin note' : 'Pin note'}
      >
        {note.pinned ? (
          <PinOff className="h-4 w-4" />
        ) : (
          <Pin className="h-4 w-4" />
        )}
      </button>

      <button
        type="button"
        className="rounded-lg border border-border bg-base p-2 text-text-secondary transition hover:border-red/40 hover:bg-red/10 hover:text-red"
        onClick={() => void onDelete()}
        title="Move note to trash"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}
