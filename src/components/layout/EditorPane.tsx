import { EXECUTABLE_LANGUAGES } from '@/lib/constants'
import { NoteEditor } from '@/components/editor/NoteEditor'
import { FrontmatterBar } from '@/components/editor/FrontmatterBar'
import { SnippetRunner } from '@/components/editor/SnippetRunner'
import type { Note, RunResult, Settings, Workspace } from '@/types'

interface EditorPaneProps {
  note: Note | null
  settings: Settings
  workspaces: Workspace[]
  allTags: string[]
  runner: {
    result: RunResult | null
    running: boolean
    run: () => Promise<void>
    clear: () => void
  }
  onNoteChange: (patch: Partial<Note>) => void
  onContentChange: (value: string) => void
  onSave: () => Promise<void>
  onDelete: () => Promise<void>
  onTogglePin: () => Promise<void>
}

export function EditorPane({
  note,
  settings,
  workspaces,
  allTags,
  runner,
  onNoteChange,
  onContentChange,
  onSave,
  onDelete,
  onTogglePin,
}: EditorPaneProps) {
  if (!note) {
    return (
      <main className="flex min-h-0 flex-1 items-center justify-center bg-base">
        <div className="max-w-md rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center">
          <p className="text-sm font-semibold text-text-primary">
            No active note
          </p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            Create a note from the sidebar or use Ctrl+N to start writing.
          </p>
        </div>
      </main>
    )
  }

  const showRunner = EXECUTABLE_LANGUAGES.has(note.language.toLowerCase())

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-base">
      <FrontmatterBar
        note={note}
        workspaces={workspaces}
        allTags={allTags}
        onChange={onNoteChange}
        onDelete={onDelete}
        onTogglePin={onTogglePin}
      />

      <NoteEditor
        noteId={note.id}
        value={note.content}
        settings={settings}
        onChange={onContentChange}
        onSave={onSave}
        onRun={runner.run}
      />

      {showRunner ? (
        <SnippetRunner
          language={note.language}
          result={runner.result}
          running={runner.running}
          onRun={runner.run}
          onClear={runner.clear}
        />
      ) : null}
    </main>
  )
}
