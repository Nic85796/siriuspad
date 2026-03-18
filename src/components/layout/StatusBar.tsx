import { APP_VERSION } from '@/lib/constants'
import type { Note, SaveStatus } from '@/types'

interface StatusBarProps {
  note: Note | null
  saveStatus: SaveStatus
}

const statusLabel: Record<SaveStatus, string> = {
  saved: 'saved',
  dirty: 'unsaved',
  saving: 'saving',
  error: 'error',
}

const statusColor: Record<SaveStatus, string> = {
  saved: 'bg-text-muted',
  dirty: 'bg-red',
  saving: 'bg-yellow',
  error: 'bg-red',
}

export function StatusBar({ note, saveStatus }: StatusBarProps) {
  return (
    <footer className="flex h-6 items-center justify-between border-t border-border bg-surface px-3 text-[11px] uppercase tracking-wide text-text-secondary">
      <div className="flex min-w-0 items-center gap-3">
        <span className="truncate">
          workspace: {note?.workspace ?? 'none'}
        </span>
        <span>{note?.language ?? 'markdown'}</span>
        <span className="inline-flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${statusColor[saveStatus]}`} />
          {statusLabel[saveStatus]}
        </span>
      </div>
      <span>{APP_VERSION}</span>
    </footer>
  )
}
