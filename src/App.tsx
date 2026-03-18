import { invoke } from '@tauri-apps/api/core'
import {
  isRegistered as isShortcutRegistered,
  register as registerGlobalShortcut,
  unregister as unregisterGlobalShortcut,
} from '@tauri-apps/plugin-global-shortcut'
import { collectTags, replaceVariables } from '@/lib/parser'
import { exportNoteToGist } from '@/lib/gist'
import { useNotes } from '@/hooks/useNotes'
import { useRunner } from '@/hooks/useRunner'
import { useSearch } from '@/hooks/useSearch'
import { APP_VERSION, DEFAULT_WORKSPACE_ID, WORKSPACE_COLORS, WORKSPACE_ICONS } from '@/lib/constants'
import { TitleBar } from '@/components/layout/TitleBar'
import { Sidebar } from '@/components/layout/Sidebar'
import { EditorPane } from '@/components/layout/EditorPane'
import { StatusBar } from '@/components/layout/StatusBar'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { SettingsModal } from '@/components/ui/SettingsModal'
import { ToastViewport } from '@/components/ui/Toast'
import { useSettingsStore } from '@/store/settings'
import { useUiStore } from '@/store/ui'
import { useWorkspaceStore } from '@/store/workspace'
import type { CommandItem } from '@/types'
import { useEffect, useState } from 'react'

function promptWorkspaceName(message: string, defaultValue = '') {
  const result = window.prompt(message, defaultValue)
  return result?.trim() ?? ''
}

function cycleValue(values: string[], current: string) {
  const index = values.indexOf(current)
  return values[(index + 1) % values.length] ?? values[0]
}

function isEditableTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null
  if (!element) {
    return false
  }

  const tagName = element.tagName
  return (
    element.isContentEditable ||
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT'
  )
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarVisible, setSidebarVisible] = useState(true)

  const notes = useNotes()
  const settingsState = useSettingsStore()
  const workspaceState = useWorkspaceStore()
  const uiState = useUiStore()
  const searchState = useSearch(searchQuery)
  const runner = useRunner(
    notes.activeNote,
    settingsState.settings.variables,
  )

  const activeWorkspace = workspaceState.workspaces.find(
    (workspace) => workspace.id === workspaceState.activeWorkspaceId,
  )
  const visibleNotes = notes.notes.filter((note) => {
    const matchesWorkspace = workspaceState.activeWorkspaceId
      ? note.workspace === workspaceState.activeWorkspaceId
      : true
    const matchesTag = notes.activeTag ? note.tags.includes(notes.activeTag) : true
    return matchesWorkspace && matchesTag
  })
  const allTags = collectTags(notes.notes)

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await invoke('ensure_dirs')
        await Promise.all([
          settingsState.initialize(),
          workspaceState.initialize(),
          uiState.initialize(),
        ])
        await notes.loadNotes()
      } catch (error) {
        console.error(error)
        uiState.pushToast({
          kind: 'error',
          title: 'Unable to initialize SiriusPad',
          description:
            error instanceof Error ? error.message : 'Unknown initialization error.',
        })
      }
    }

    void bootstrap()
  }, [])

  useEffect(() => {
    const shortcut = 'CommandOrControl+Shift+K'
    let registered = false

    const setupShortcut = async () => {
      try {
        const alreadyRegistered = await isShortcutRegistered(shortcut)
        if (!alreadyRegistered) {
          await registerGlobalShortcut(shortcut, () => {
            useUiStore.getState().setCommandPaletteOpen(true)
          })
          registered = true
        }
      } catch (error) {
        console.warn('Global shortcut unavailable', error)
      }
    }

    void setupShortcut()

    return () => {
      if (registered) {
        void unregisterGlobalShortcut(shortcut)
      }
    }
  }, [])

  const saveCurrentNote = async () => {
    await notes.saveActiveNote()
  }

  const createNote = async (workspaceId?: string) => {
    const workspace =
      workspaceId ??
      workspaceState.activeWorkspaceId ??
      settingsState.settings.defaultWorkspace ??
      DEFAULT_WORKSPACE_ID

    await notes.createNote({
      workspace,
    })
  }

  const openNote = async (noteId: string) => {
    await notes.openNote(noteId)
  }

  const togglePin = async () => {
    if (!notes.activeNote) {
      return
    }

    notes.updateActiveNote({ pinned: !notes.activeNote.pinned })
    await notes.saveActiveNote()
  }

  const deleteActiveNote = async () => {
    if (!notes.activeNote) {
      return
    }

    const confirmed = window.confirm(
      `Move "${notes.activeNote.title}" to trash?`,
    )
    if (!confirmed) {
      return
    }

    await notes.trashActiveNote()
    uiState.pushToast({
      kind: 'info',
      title: 'Note moved to trash',
    })
  }

  const duplicateActiveNote = async () => {
    await notes.duplicateActiveNote()
  }

  const copyCurrentNote = async () => {
    if (!notes.activeNote) {
      return
    }

    await navigator.clipboard.writeText(
      replaceVariables(notes.activeNote.content, settingsState.settings.variables),
    )

    uiState.pushToast({
      kind: 'success',
      title: 'Copied note content',
    })
  }

  const copyCurrentNoteAsCode = async () => {
    if (!notes.activeNote) {
      return
    }

    const content = replaceVariables(
      notes.activeNote.content,
      settingsState.settings.variables,
    )
    const fenced = `\`\`\`${notes.activeNote.language}\n${content}\n\`\`\``
    await navigator.clipboard.writeText(fenced)
    uiState.pushToast({
      kind: 'success',
      title: 'Copied as code block',
    })
  }

  const exportCurrentNoteToGist = async () => {
    if (!notes.activeNote) {
      return
    }

    try {
      const isPublic = window.confirm(
        'Create a public Gist? Choose Cancel for a private Gist.',
      )
      const url = await exportNoteToGist(
        {
          ...notes.activeNote,
          content: replaceVariables(
            notes.activeNote.content,
            settingsState.settings.variables,
          ),
        },
        settingsState.settings.githubToken,
        isPublic,
      )
      await navigator.clipboard.writeText(url)
      uiState.pushToast({
        kind: 'success',
        title: 'Gist created and URL copied',
        actionHref: url,
        actionLabel: 'Open Gist',
      })
    } catch (error) {
      uiState.pushToast({
        kind: 'error',
        title: 'Gist export failed',
        description: error instanceof Error ? error.message : 'Unknown error.',
      })
    }
  }

  const createWorkspace = async () => {
    const name = promptWorkspaceName('Workspace name')
    if (!name) {
      return
    }

    await workspaceState.createWorkspace(name)
    await notes.loadNotes()
  }

  const renameWorkspace = async (workspaceId: string) => {
    const nextName = promptWorkspaceName('Rename workspace', workspaceId)
    if (!nextName) {
      return
    }

    await workspaceState.renameWorkspace(workspaceId, nextName)
    await notes.loadNotes()
  }

  const deleteWorkspace = async (workspaceId: string) => {
    const confirmed = window.confirm(
      `Delete workspace "${workspaceId}" and move its notes to "${DEFAULT_WORKSPACE_ID}"?`,
    )
    if (!confirmed) {
      return
    }

    await workspaceState.deleteWorkspace(workspaceId)
    await notes.loadNotes()
  }

  const cycleWorkspaceColor = async (workspaceId: string) => {
    const workspace = workspaceState.workspaces.find(
      (item) => item.id === workspaceId,
    )
    if (!workspace) {
      return
    }

    await workspaceState.updateWorkspaceMeta(workspaceId, {
      color: cycleValue(WORKSPACE_COLORS, workspace.color),
    })
  }

  const cycleWorkspaceIcon = async (workspaceId: string) => {
    const workspace = workspaceState.workspaces.find(
      (item) => item.id === workspaceId,
    )
    if (!workspace) {
      return
    }

    await workspaceState.updateWorkspaceMeta(workspaceId, {
      icon: cycleValue(WORKSPACE_ICONS, workspace.icon),
    })
  }

  const commands: CommandItem[] = [
    {
      id: 'note:new',
      label: 'New note',
      group: 'Notas',
      perform: () => createNote(),
    },
    {
      id: 'note:duplicate',
      label: 'Duplicate active note',
      group: 'Notas',
      perform: () => duplicateActiveNote(),
    },
    {
      id: 'note:delete',
      label: 'Move active note to trash',
      group: 'Notas',
      perform: () => deleteActiveNote(),
    },
    {
      id: 'note:pin',
      label: notes.activeNote?.pinned ? 'Unpin active note' : 'Pin active note',
      group: 'Notas',
      perform: () => togglePin(),
    },
    {
      id: 'action:copy',
      label: 'Copy note with variables',
      group: 'Acoes',
      perform: () => copyCurrentNote(),
    },
    {
      id: 'action:copy-code',
      label: 'Copy note as fenced code block',
      group: 'Acoes',
      perform: () => copyCurrentNoteAsCode(),
    },
    {
      id: 'action:gist',
      label: 'Export active note to Gist',
      group: 'Acoes',
      perform: () => exportCurrentNoteToGist(),
    },
    {
      id: 'app:settings',
      label: 'Open settings',
      group: 'App',
      perform: async () => {
        uiState.setSettingsOpen(true)
      },
    },
    {
      id: 'app:line-numbers',
      label: settingsState.settings.showLineNumbers
        ? 'Hide line numbers'
        : 'Show line numbers',
      group: 'App',
      perform: () =>
        settingsState.update({
          showLineNumbers: !settingsState.settings.showLineNumbers,
        }),
    },
    {
      id: 'app:word-wrap',
      label: settingsState.settings.wordWrap
        ? 'Disable word wrap'
        : 'Enable word wrap',
      group: 'App',
      perform: () =>
        settingsState.update({
          wordWrap: !settingsState.settings.wordWrap,
        }),
    },
    ...workspaceState.workspaces.map((workspace) => ({
      id: `workspace:${workspace.id}`,
      label: `Go to workspace: ${workspace.name}`,
      group: 'Navegacao' as const,
      keywords: [workspace.name],
      perform: async () => {
        workspaceState.setActiveWorkspace(workspace.id)
      },
    })),
    ...notes.notes.map((note) => ({
      id: `note:${note.id}`,
      label: `Open note: ${note.title}`,
      group: 'Navegacao' as const,
      keywords: [note.title, note.workspace, ...note.tags],
      perform: () => openNote(note.id),
    })),
  ]

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const meta = event.ctrlKey || event.metaKey
      const editable = isEditableTarget(event.target)

      if (meta && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        uiState.setCommandPaletteOpen(true)
        return
      }

      if (meta && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        void createNote()
        return
      }

      if (meta && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        uiState.focusSearch()
        return
      }

      if (meta && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void saveCurrentNote()
        return
      }

      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault()
        void runner.run()
        return
      }

      if (meta && event.key.toLowerCase() === 'w') {
        event.preventDefault()
        void notes.closeActiveNote()
        return
      }

      if (meta && event.key === ',') {
        event.preventDefault()
        uiState.setSettingsOpen(true)
        return
      }

      if (meta && event.shiftKey && event.key.toLowerCase() === 'c') {
        event.preventDefault()
        void copyCurrentNote()
        return
      }

      if (meta && event.shiftKey && event.key.toLowerCase() === 'g') {
        event.preventDefault()
        void exportCurrentNoteToGist()
        return
      }

      if (meta && event.key.toLowerCase() === 'p' && !event.shiftKey) {
        event.preventDefault()
        uiState.setCommandPaletteOpen(true)
        return
      }

      if (meta && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        void duplicateActiveNote()
        return
      }

      if (meta && event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault()
        void togglePin()
        return
      }

      if (event.altKey && !meta) {
        const workspaceIndex = Number(event.key) - 1
        const workspace = workspaceState.workspaces[workspaceIndex]
        if (workspace) {
          event.preventDefault()
          workspaceState.setActiveWorkspace(workspace.id)
        }
        return
      }

      if (editable) {
        return
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [
    notes.activeNote,
    runner,
    settingsState.settings,
    workspaceState.workspaces,
    visibleNotes,
  ])

  const noteSubtitle = activeWorkspace?.name ?? 'all workspaces'
  const sidebarWidth = sidebarVisible ? uiState.sidebarWidth : 0

  return (
    <div className="flex h-screen flex-col bg-base text-text-primary">
      <TitleBar
        onFocusSearch={() => uiState.focusSearch()}
        onOpenSettings={() => uiState.setSettingsOpen(true)}
        onToggleSidebar={() => setSidebarVisible((current) => !current)}
      />

      <div className="flex min-h-0 flex-1">
        {sidebarVisible ? (
          <Sidebar
            width={sidebarWidth}
            searchQuery={searchQuery}
            focusSearchNonce={uiState.focusSearchNonce}
            workspaces={workspaceState.workspaces}
            activeWorkspaceId={workspaceState.activeWorkspaceId}
            notes={visibleNotes}
            activeNoteId={notes.activeNoteId}
            activeTag={notes.activeTag}
            searchResults={searchState.results}
            searchLoading={searchState.loading}
            onSearchQueryChange={setSearchQuery}
            onSelectWorkspace={workspaceState.setActiveWorkspace}
            onCreateWorkspace={createWorkspace}
            onRenameWorkspace={renameWorkspace}
            onDeleteWorkspace={deleteWorkspace}
            onCycleWorkspaceColor={cycleWorkspaceColor}
            onCycleWorkspaceIcon={cycleWorkspaceIcon}
            onOpenNote={openNote}
            onCreateNote={() => createNote()}
            onTagClick={notes.setActiveTag}
            onResize={uiState.setSidebarWidth}
          />
        ) : null}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border bg-base px-4 py-2 text-xs uppercase tracking-wide text-text-secondary">
            <span>{noteSubtitle}</span>
            <span>{APP_VERSION}</span>
          </div>
          <EditorPane
            note={notes.activeNote}
            settings={settingsState.settings}
            workspaces={workspaceState.workspaces}
            allTags={allTags}
            runner={runner}
            onNoteChange={(patch) => notes.updateActiveNote(patch)}
            onContentChange={notes.updateActiveContent}
            onSave={saveCurrentNote}
            onDelete={deleteActiveNote}
            onTogglePin={togglePin}
          />
        </div>
      </div>

      <StatusBar note={notes.activeNote} saveStatus={notes.saveStatus} />

      <SettingsModal
        open={uiState.settingsOpen}
        settings={settingsState.settings}
        workspaces={workspaceState.workspaces}
        onClose={() => uiState.setSettingsOpen(false)}
        onUpdate={settingsState.update}
        onSetVariable={settingsState.setVariable}
        onRemoveVariable={settingsState.removeVariable}
        onResetSection={settingsState.resetSection}
      />

      <CommandPalette
        open={uiState.commandPaletteOpen}
        commands={commands}
        commandHistory={uiState.commandHistory}
        onOpenChange={uiState.setCommandPaletteOpen}
        onCommandRun={uiState.rememberCommand}
      />

      <ToastViewport />
    </div>
  )
}
