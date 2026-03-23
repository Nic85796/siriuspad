import { Search } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { NoteList } from '@/components/sidebar/NoteList'
import { SearchResults } from '@/components/sidebar/SearchResults'
import { WorkspaceTree } from '@/components/sidebar/WorkspaceTree'
import type { NoteMetadata, SearchResult, Workspace } from '@/types'

interface SidebarProps {
  width: number
  searchQuery: string
  focusSearchNonce: number
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  notes: NoteMetadata[]
  totalNotes: number
  activeNoteId: string | null
  activeTag: string | null
  searchResults: SearchResult[]
  searchLoading: boolean
  onSearchQueryChange: (value: string) => void
  onSelectWorkspace: (workspaceId: string | null) => void
  onCreateWorkspace: () => Promise<void>
  onRenameWorkspace: (workspaceId: string) => Promise<void>
  onDeleteWorkspace: (workspaceId: string) => Promise<void>
  onCycleWorkspaceColor: (workspaceId: string) => Promise<void>
  onCycleWorkspaceIcon: (workspaceId: string) => Promise<void>
  onOpenNote: (noteId: string) => Promise<void>
  onDuplicateNote: (noteId: string) => Promise<void>
  onTogglePinNote: (noteId: string) => Promise<void>
  onDeleteNote: (noteId: string) => Promise<void>
  onCreateNote: () => Promise<void>
  onTagClick: (tag: string | null) => void
  onResize: (nextWidth: number) => void
}

export function Sidebar({
  width,
  searchQuery,
  focusSearchNonce,
  workspaces,
  activeWorkspaceId,
  notes,
  totalNotes,
  activeNoteId,
  activeTag,
  searchResults,
  searchLoading,
  onSearchQueryChange,
  onSelectWorkspace,
  onCreateWorkspace,
  onRenameWorkspace,
  onDeleteWorkspace,
  onCycleWorkspaceColor,
  onCycleWorkspaceIcon,
  onOpenNote,
  onDuplicateNote,
  onTogglePinNote,
  onDeleteNote,
  onCreateNote,
  onTagClick,
  onResize,
}: SidebarProps) {
  const { t } = useTranslation()
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const resizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null)

  useEffect(() => {
    searchInputRef.current?.focus()
  }, [focusSearchNonce])

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (!resizeStateRef.current) {
        return
      }

      const delta = event.clientX - resizeStateRef.current.startX
      const nextWidth = Math.max(
        180,
        Math.min(320, resizeStateRef.current.startWidth + delta),
      )
      onResize(nextWidth)
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
  }, [onResize])

  return (
    <aside
      className="motion-slide-left relative flex h-full shrink-0 flex-col border-r border-border bg-surface"
      style={{ width }}
    >
      <div className="border-b border-border px-3 py-3">
        <label className="interactive-lift flex items-center gap-2 rounded-md border border-border bg-base px-3 py-2 text-sm text-text-secondary focus-within:border-focus">
          <Search className="h-4 w-4" />
          <input
            ref={searchInputRef}
            className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
            placeholder={t('sidebar.searchPlaceholder')}
            title={t('sidebar.searchPlaceholder')}
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
        </label>
      </div>

      <WorkspaceTree
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onSelectWorkspace={onSelectWorkspace}
        onCreateWorkspace={onCreateWorkspace}
        onRenameWorkspace={onRenameWorkspace}
        onDeleteWorkspace={onDeleteWorkspace}
        onCycleWorkspaceColor={onCycleWorkspaceColor}
        onCycleWorkspaceIcon={onCycleWorkspaceIcon}
      />

      {searchQuery.trim() ? (
        <SearchResults
          query={searchQuery}
          results={searchResults}
          loading={searchLoading}
          activeNoteId={activeNoteId}
          onOpenNote={onOpenNote}
        />
      ) : (
        <NoteList
          notes={notes}
          totalNotes={totalNotes}
          activeNoteId={activeNoteId}
          activeTag={activeTag}
          onOpenNote={onOpenNote}
          onDuplicateNote={onDuplicateNote}
          onTogglePinNote={onTogglePinNote}
          onDeleteNote={onDeleteNote}
          onCreateNote={onCreateNote}
          onTagClick={onTagClick}
        />
      )}

      <div
        className="absolute inset-y-0 right-0 w-1 cursor-col-resize bg-transparent hover:bg-accent/30"
        onMouseDown={(event) => {
          resizeStateRef.current = {
            startX: event.clientX,
            startWidth: width,
          }
        }}
      />
    </aside>
  )
}
