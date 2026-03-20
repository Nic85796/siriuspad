import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import {
  isRegistered as isShortcutRegistered,
  register as registerGlobalShortcut,
  unregister as unregisterGlobalShortcut,
} from '@tauri-apps/plugin-global-shortcut'
import { collectTags, replaceVariables } from '@/lib/parser'
import { exportNoteToGist } from '@/lib/gist'
import { exportAsJson, exportAsMarkdown, exportAsTxt } from '@/lib/export'
import { useNotes } from '@/hooks/useNotes'
import { useRunner } from '@/hooks/useRunner'
import { useSearch } from '@/hooks/useSearch'
import { useUpdater } from '@/hooks/useUpdater'
import {
  DEFAULT_WORKSPACE_ID,
  UI_ZOOM_MAX,
  UI_ZOOM_MIN,
  UI_ZOOM_STEP,
  WORKSPACE_COLORS,
  WORKSPACE_ICONS,
} from '@/lib/constants'
import { ResizeBorders } from '@/components/layout/ResizeBorders'
import { TabBar } from '@/components/layout/TabBar'
import { TitleBar } from '@/components/layout/TitleBar'
import { Sidebar } from '@/components/layout/Sidebar'
import { EditorPane } from '@/components/layout/EditorPane'
import { RightPanel } from '@/components/layout/RightPanel'
import { StatusBar } from '@/components/layout/StatusBar'
import { HistoryPanel } from '@/components/editor/HistoryPanel'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { OnboardingModal } from '@/components/ui/OnboardingModal'
import { PromptModal } from '@/components/ui/PromptModal'
import { SettingsModal } from '@/components/ui/SettingsModal'
import { ToastViewport } from '@/components/ui/Toast'
import { UpdateModal } from '@/components/ui/UpdateModal'
import {
  hasCompletedOnboarding,
  markOnboardingComplete,
  resetOnboarding,
} from '@/lib/onboarding'
import {
  getWorkspaceDisplayName,
  getWorkspaceNameFromId,
} from '@/lib/workspaceLabel'
import { useNotesStore } from '@/store/notes'
import { useSettingsStore } from '@/store/settings'
import { useUiStore } from '@/store/ui'
import { useWorkspaceStore } from '@/store/workspace'
import type {
  AppPlatform,
  CommandItem,
  CursorInfo,
  Note,
  PreviewMode,
} from '@/types'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

function cycleValue(values: string[], current: string) {
  const index = values.indexOf(current)
  return values[(index + 1) % values.length] ?? values[0]
}

function clampUiZoom(value: number) {
  return Math.min(UI_ZOOM_MAX, Math.max(UI_ZOOM_MIN, Number(value.toFixed(2))))
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
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [cursorInfo, setCursorInfo] = useState<CursorInfo | null>(null)
  const [findReplaceNonce, setFindReplaceNonce] = useState(0)
  const [toggleTerminalNonce, setToggleTerminalNonce] = useState(0)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [activeNoteDirectory, setActiveNoteDirectory] = useState<string | null>(null)

  const bootstrappedRef = useRef(false)
  const allowWindowCloseRef = useRef(false)
  const shortcutHandlersRef = useRef<{
    toggleFullscreen: () => Promise<void>
    zoomIn: () => Promise<void>
    zoomOut: () => Promise<void>
    resetZoom: () => Promise<void>
    toggleZenMode: () => void
    toggleFocusMode: () => void
    cyclePreviewMode: () => void
    openFindReplace: () => void
    openCommandPalette: () => void
    createNote: () => Promise<void>
    focusSearch: () => void
    saveCurrentNote: () => Promise<void>
    runSnippet: () => Promise<void>
    toggleTerminal: () => void
    activeNoteId: string | null
    requestCloseTab: (tabId: string) => Promise<void>
    openSettings: () => void
    copyCurrentNote: () => Promise<void>
    exportCurrentNoteToGist: () => Promise<void>
    duplicateActiveNote: () => Promise<void>
    togglePin: () => Promise<void>
    workspaces: Array<{ id: string }>
    setActiveWorkspace: (workspaceId: string | null) => void
  }>({
    toggleFullscreen: async () => {},
    zoomIn: async () => {},
    zoomOut: async () => {},
    resetZoom: async () => {},
    toggleZenMode: () => {},
    toggleFocusMode: () => {},
    cyclePreviewMode: () => {},
    openFindReplace: () => {},
    openCommandPalette: () => {},
    createNote: async () => {},
    focusSearch: () => {},
    saveCurrentNote: async () => {},
    runSnippet: async () => {},
    toggleTerminal: () => {},
    activeNoteId: null,
    requestCloseTab: async () => {},
    openSettings: () => {},
    copyCurrentNote: async () => {},
    exportCurrentNoteToGist: async () => {},
    duplicateActiveNote: async () => {},
    togglePin: async () => {},
    workspaces: [],
    setActiveWorkspace: () => {},
  })

  const notes = useNotes()
  const settingsState = useSettingsStore()
  const workspaceState = useWorkspaceStore()
  const uiState = useUiStore()
  const searchState = useSearch(searchQuery)
  const runner = useRunner(
    notes.activeNote,
    settingsState.settings.variables,
    activeNoteDirectory,
  )
  const updater = useUpdater(settingsState.ready)

  const workspaceScopedNotes = notes.notes.filter((note) => {
    const matchesWorkspace = workspaceState.activeWorkspaceId
      ? note.workspace === workspaceState.activeWorkspaceId
      : true
    return matchesWorkspace
  })

  const visibleNotes = workspaceScopedNotes.filter((note) => {
    const matchesTag = notes.activeTag ? note.tags.includes(notes.activeTag) : true
    return matchesTag
  })
  const allTags = collectTags(notes.notes)

  const showSidebar = sidebarVisible && !uiState.isZenMode && !uiState.isFocusMode
  const showTitlebar = !uiState.isZenMode
  const showStatusBar = !uiState.isZenMode
  const showTabs = !uiState.isZenMode
  const showRightPanel = !uiState.isZenMode && !uiState.isFocusMode

  const insertCalloutIntoActiveNote = (input: {
    tone: 'note' | 'tip' | 'warning'
    title?: string
  }) => {
    if (!notes.activeNote) {
      return
    }

    const templates = {
      note: {
        marker: 'NOTE',
        title: t('note.calloutTemplateNoteTitle'),
        body: t('note.calloutTemplateNoteBody'),
      },
      tip: {
        marker: 'TIP',
        title: t('note.calloutTemplateTipTitle'),
        body: t('note.calloutTemplateTipBody'),
      },
      warning: {
        marker: 'WARNING',
        title: t('note.calloutTemplateWarningTitle'),
        body: t('note.calloutTemplateWarningBody'),
      },
    } as const

    const template = templates[input.tone]
    const title = input.title?.trim() || template.title
    const block = `> [!${template.marker}] ${title}\n> ${template.body}`
    const nextContent = notes.activeNote.content.trim()
      ? `${notes.activeNote.content.trimEnd()}\n\n${block}\n`
      : `${block}\n`

    notes.updateActiveContent(nextContent)
    uiState.setPreviewMode('split')
  }

  const closeWindowAfterDecision = async (mode: 'save' | 'discard') => {
    if (mode === 'save') {
      await useNotesStore.getState().saveAllDirtyTabs()
    }

    useUiStore.getState().closeConfirm()
    await requestWindowClose(true)
  }

  const installPendingUpdate = async () => {
    try {
      await useNotesStore.getState().saveAllDirtyTabs()
      allowWindowCloseRef.current = true
      await updater.installUpdate()
    } catch (error) {
      allowWindowCloseRef.current = false
      throw error
    }
  }

  const requestWindowClose = async (force = false) => {
    const dirtyTabs = useNotesStore.getState().openTabs.filter((tab) => tab.isDirty)

    if (!force && dirtyTabs.length) {
      useUiStore.getState().showConfirm({
        title: t('note.closeWindowTitle'),
        description: t('note.closeWindowDescription'),
        confirmLabel: t('common.save'),
        secondaryLabel: t('common.discard'),
        cancelLabel: t('common.cancel'),
        onConfirm: async () => closeWindowAfterDecision('save'),
        onSecondary: async () => closeWindowAfterDecision('discard'),
      })
      return
    }

    allowWindowCloseRef.current = true

    try {
      const windowHandle = getCurrentWindow()
      await windowHandle.close()
    } catch (error) {
      try {
        await getCurrentWindow().destroy()
      } catch (destroyError) {
        allowWindowCloseRef.current = false
        console.warn('Window close unavailable', error, destroyError)
      }
    }
  }

  const requestCloseTab = async (tabId: string) => {
    const tab = useNotesStore.getState().openTabs.find((item) => item.id === tabId)
    if (!tab) {
      return
    }

    if (!tab.isDirty) {
      await useNotesStore.getState().closeTab(tabId)
      return
    }

    uiState.showConfirm({
      title: t('note.closeDirtyTitle'),
      description: t('note.closeDirtyDescription'),
      confirmLabel: t('common.save'),
      secondaryLabel: t('common.discard'),
      cancelLabel: t('common.cancel'),
      onConfirm: async () => {
        await useNotesStore.getState().saveNote(tabId)
        await useNotesStore.getState().closeTab(tabId)
        useUiStore.getState().closeConfirm()
      },
      onSecondary: async () => {
        await useNotesStore.getState().closeTab(tabId)
        useUiStore.getState().closeConfirm()
      },
    })
  }

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
    await notes.openInTab(noteId)
  }

  const readNoteForAction = async (noteId: string) => {
    const draft = useNotesStore.getState().noteDrafts[noteId]
    if (draft) {
      return draft
    }

    return invoke<Note>('read_note', { id: noteId })
  }

  const duplicateNoteById = async (noteId: string) => {
    const source = await readNoteForAction(noteId)
    await notes.createNote({
      title: `${source.title} ${t('note.copySuffix')}`,
      workspace: source.workspace,
      language: source.language,
      tags: source.tags,
      pinned: false,
      priority: source.priority,
      color: source.color,
      checklist: source.checklist,
      content: source.content,
    })
  }

  const toggleNotePinById = async (noteId: string) => {
    const source = await readNoteForAction(noteId)
    const nextNote = {
      ...source,
      pinned: !source.pinned,
      updated_at: new Date().toISOString(),
    }

    await invoke('write_note', {
      note: nextNote,
    })

    if (useNotesStore.getState().noteDrafts[noteId]) {
      useNotesStore.getState().hydrateNote(nextNote, 'saved')
      return
    }

    await notes.loadNotes()
  }

  const deleteNoteById = async (noteId: string) => {
    const state = useNotesStore.getState()
    const draft = state.noteDrafts[noteId]
    const metadata = state.notes.find((item) => item.id === noteId)
    const title = draft?.title ?? metadata?.title ?? t('common.untitled')
    const isDirty = state.openTabs.find((tab) => tab.id === noteId)?.isDirty ?? false

    uiState.showConfirm({
      title: t('note.deleteConfirm', { title }),
      description: isDirty ? t('note.deleteDirtyDescription') : undefined,
      danger: true,
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      onConfirm: async () => {
        if (isDirty) {
          await useNotesStore.getState().saveNote(noteId)
        }

        await useNotesStore.getState().trashNote(noteId)
        useUiStore.getState().closeConfirm()
        useUiStore.getState().pushToast({
          kind: 'info',
          title: t('toasts.noteTrashed'),
        })
      },
    })
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

    uiState.showConfirm({
      title: t('note.deleteConfirm', { title: notes.activeNote.title }),
      danger: true,
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      onConfirm: async () => {
        await notes.trashActiveNote()
        uiState.closeConfirm()
        uiState.pushToast({
          kind: 'info',
          title: t('toasts.noteTrashed'),
        })
      },
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
      title: t('toasts.copied'),
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
      title: t('toasts.copiedAsCode'),
    })
  }

  const exportCurrentNoteToGist = async () => {
    if (!notes.activeNote) {
      return
    }

    uiState.showConfirm({
      title: t('gist.publicConfirm'),
      confirmLabel: t('common.public'),
      secondaryLabel: t('common.private'),
      cancelLabel: t('common.cancel'),
      onConfirm: async () => {
        try {
          const url = await exportNoteToGist(
            {
              ...notes.activeNote!,
              content: replaceVariables(
                notes.activeNote!.content,
                settingsState.settings.variables,
              ),
            },
            settingsState.settings.githubToken,
            true,
          )
          await navigator.clipboard.writeText(url)
          uiState.pushToast({
            kind: 'success',
            title: t('gist.success'),
            actionHref: url,
            actionLabel: t('gist.openGist'),
          })
        } catch (error) {
          uiState.pushToast({
            kind: 'error',
            title: t('gist.failed'),
            description: error instanceof Error ? error.message : t('common.unknownError'),
          })
        } finally {
          uiState.closeConfirm()
        }
      },
      onSecondary: async () => {
        try {
          const url = await exportNoteToGist(
            {
              ...notes.activeNote!,
              content: replaceVariables(
                notes.activeNote!.content,
                settingsState.settings.variables,
              ),
            },
            settingsState.settings.githubToken,
            false,
          )
          await navigator.clipboard.writeText(url)
          uiState.pushToast({
            kind: 'success',
            title: t('gist.success'),
            actionHref: url,
            actionLabel: t('gist.openGist'),
          })
        } catch (error) {
          uiState.pushToast({
            kind: 'error',
            title: t('gist.failed'),
            description: error instanceof Error ? error.message : t('common.unknownError'),
          })
        } finally {
          uiState.closeConfirm()
        }
      },
    })
  }

  const exportCurrentNote = async (kind: 'md' | 'txt' | 'json') => {
    if (!notes.activeNote) {
      return
    }

    const exported =
      kind === 'md'
        ? await exportAsMarkdown(notes.activeNote, settingsState.settings.variables)
        : kind === 'txt'
          ? await exportAsTxt(notes.activeNote, settingsState.settings.variables)
          : await exportAsJson(notes.activeNote)

    if (!exported) {
      return
    }

    uiState.pushToast({
      kind: 'success',
      title:
        kind === 'md'
          ? t('toasts.exportedMarkdown')
          : kind === 'txt'
            ? t('toasts.exportedTxt')
            : t('toasts.exportedJson'),
    })
  }

  const createWorkspace = async () => {
    uiState.showPrompt({
      title: t('workspace.name'),
      placeholder: t('workspace.name'),
      confirmLabel: t('common.confirm'),
      cancelLabel: t('common.cancel'),
      onConfirm: async (value) => {
        if (!value) {
          uiState.closePrompt()
          return
        }

        await workspaceState.createWorkspace(value)
        await notes.loadNotes()
        uiState.closePrompt()
      },
    })
  }

  const renameWorkspace = async (workspaceId: string) => {
    uiState.showPrompt({
      title: t('workspace.renamePrompt'),
      placeholder: t('workspace.renamePrompt'),
      defaultValue: workspaceId,
      confirmLabel: t('common.rename'),
      cancelLabel: t('common.cancel'),
      onConfirm: async (value) => {
        if (!value || value === workspaceId) {
          uiState.closePrompt()
          return
        }

        await workspaceState.renameWorkspace(workspaceId, value)
        notes.replaceWorkspaceId(workspaceId, value)
        await notes.loadNotes()
        uiState.closePrompt()
      },
    })
  }

  const deleteWorkspace = async (workspaceId: string) => {
    const workspace = workspaceState.workspaces.find((item) => item.id === workspaceId)

    uiState.showConfirm({
      title: t('workspace.deleteConfirm', {
        name: workspace ? getWorkspaceDisplayName(workspace, t) : workspaceId,
        fallback: getWorkspaceNameFromId(DEFAULT_WORKSPACE_ID, t),
      }),
      danger: true,
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      onConfirm: async () => {
        await workspaceState.deleteWorkspace(workspaceId)
        notes.replaceWorkspaceId(workspaceId, DEFAULT_WORKSPACE_ID)
        await notes.loadNotes()
        uiState.closeConfirm()
      },
    })
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

  const toggleFullscreen = async () => {
    try {
      const windowHandle = getCurrentWindow()
      const next = !(await windowHandle.isFullscreen())
      await windowHandle.setFullscreen(next)
      uiState.setFullscreen(next)
    } catch (error) {
      console.warn('Fullscreen unavailable', error)
    }
  }

  const setUiZoom = async (nextZoom: number) => {
    await settingsState.update({
      uiZoom: clampUiZoom(nextZoom),
    })
  }

  const zoomIn = async () => {
    await setUiZoom(settingsState.settings.uiZoom + UI_ZOOM_STEP)
  }

  const zoomOut = async () => {
    await setUiZoom(settingsState.settings.uiZoom - UI_ZOOM_STEP)
  }

  const resetZoom = async () => {
    await setUiZoom(1)
  }

  const restoreHistoryVersion = async (timestamp: string) => {
    if (!notes.activeNote) {
      return
    }

    try {
      const restoredNote = await invoke<Note>('restore_note_version', {
        noteId: notes.activeNote.id,
        timestamp,
      })
      notes.hydrateNote(restoredNote, 'saved')
      await notes.loadNotes()
      uiState.setHistoryPanelOpen(false)
      uiState.pushToast({
        kind: 'success',
        title: t('history.restored'),
      })
    } catch (error) {
      uiState.pushToast({
        kind: 'error',
        title: t('history.restoreFailed'),
        description: error instanceof Error ? error.message : t('common.unknownError'),
      })
    }
  }

  const commands: CommandItem[] = [
    {
      id: 'note:new',
      label: t('commands.newNote'),
      group: t('commands.groups.notes'),
      shortcut: 'Ctrl+N',
      perform: () => createNote(),
    },
    {
      id: 'note:duplicate',
      label: t('commands.duplicateNote'),
      group: t('commands.groups.notes'),
      shortcut: 'Ctrl+D',
      perform: () => duplicateActiveNote(),
    },
    {
      id: 'note:delete',
      label: t('commands.deleteNote'),
      group: t('commands.groups.notes'),
      perform: () => deleteActiveNote(),
    },
    {
      id: 'note:pin',
      label: notes.activeNote?.pinned
        ? t('commands.unpinNote')
        : t('commands.pinNote'),
      group: t('commands.groups.notes'),
      shortcut: 'Ctrl+Shift+P',
      perform: () => togglePin(),
    },
    {
      id: 'action:copy',
      label: t('commands.copyNote'),
      group: t('commands.groups.actions'),
      shortcut: 'Ctrl+Shift+C',
      perform: () => copyCurrentNote(),
    },
    {
      id: 'action:copy-code',
      label: t('commands.copyAsCode'),
      group: t('commands.groups.actions'),
      perform: () => copyCurrentNoteAsCode(),
    },
    {
      id: 'action:gist',
      label: t('commands.exportGist'),
      group: t('commands.groups.actions'),
      shortcut: 'Ctrl+Shift+G',
      perform: () => exportCurrentNoteToGist(),
    },
    {
      id: 'action:export-md',
      label: t('commands.exportMarkdown'),
      group: t('commands.groups.actions'),
      perform: () => exportCurrentNote('md'),
    },
    {
      id: 'action:export-txt',
      label: t('commands.exportTxt'),
      group: t('commands.groups.actions'),
      perform: () => exportCurrentNote('txt'),
    },
    {
      id: 'action:export-json',
      label: t('commands.exportJson'),
      group: t('commands.groups.actions'),
      perform: () => exportCurrentNote('json'),
    },
    {
      id: 'app:settings',
      label: t('commands.openSettings'),
      group: t('commands.groups.app'),
      shortcut: 'Ctrl+,',
      perform: async () => {
        uiState.setSettingsOpen(true)
      },
    },
    {
      id: 'app:line-numbers',
      label: t('commands.toggleLineNumbers'),
      group: t('commands.groups.app'),
      perform: () =>
        settingsState.update({
          showLineNumbers: !settingsState.settings.showLineNumbers,
        }),
    },
    {
      id: 'app:word-wrap',
      label: t('commands.toggleWordWrap'),
      group: t('commands.groups.app'),
      perform: () =>
        settingsState.update({
          wordWrap: !settingsState.settings.wordWrap,
        }),
    },
    {
      id: 'app:fullscreen',
      label: t('commands.toggleFullscreen'),
      group: t('commands.groups.app'),
      shortcut: 'F11',
      perform: () => toggleFullscreen(),
    },
    {
      id: 'app:zoom-in',
      label: t('commands.zoomIn'),
      description: t('settings.fields.uiZoomValue', {
        value: Math.round(settingsState.settings.uiZoom * 100),
      }),
      group: t('commands.groups.app'),
      shortcut: 'Ctrl++',
      perform: () => zoomIn(),
    },
    {
      id: 'app:zoom-out',
      label: t('commands.zoomOut'),
      description: t('settings.fields.uiZoomValue', {
        value: Math.round(settingsState.settings.uiZoom * 100),
      }),
      group: t('commands.groups.app'),
      shortcut: 'Ctrl+-',
      perform: () => zoomOut(),
    },
    {
      id: 'app:zoom-reset',
      label: t('commands.resetZoom'),
      description: t('settings.fields.uiZoomValue', {
        value: Math.round(settingsState.settings.uiZoom * 100),
      }),
      group: t('commands.groups.app'),
      shortcut: 'Ctrl+0',
      perform: () => resetZoom(),
    },
    {
      id: 'app:zen',
      label: t('commands.zenMode'),
      group: t('commands.groups.app'),
      shortcut: 'Ctrl+Shift+Z',
      perform: async () => {
        uiState.toggleZenMode()
      },
    },
    {
      id: 'app:focus',
      label: t('commands.focusMode'),
      group: t('commands.groups.app'),
      shortcut: 'Ctrl+Shift+F',
      perform: async () => {
        uiState.toggleFocusMode()
      },
    },
    {
      id: 'app:preview',
      label: t('commands.markdownPreview'),
      group: t('commands.groups.app'),
      shortcut: 'Ctrl+Shift+M',
      perform: async () => {
        uiState.cyclePreviewMode()
      },
    },
    {
      id: 'app:history',
      label: t('history.title'),
      group: t('commands.groups.app'),
      perform: async () => {
        uiState.setHistoryPanelOpen(true)
      },
    },
    {
      id: 'app:find-replace',
      label: t('commands.findReplace'),
      group: t('commands.groups.app'),
      shortcut: 'Ctrl+H',
      perform: async () => {
        setFindReplaceNonce((current) => current + 1)
      },
    },
    ...workspaceState.workspaces.map((workspace) => ({
      id: `workspace:${workspace.id}`,
      label: t('workspace.goTo', { name: getWorkspaceDisplayName(workspace, t) }),
      description: workspace.name,
      group: t('commands.groups.navigation'),
      keywords: [workspace.name, getWorkspaceDisplayName(workspace, t)],
      perform: async () => {
        workspaceState.setActiveWorkspace(workspace.id)
      },
    })),
    ...notes.notes.map((note) => ({
      id: `note:${note.id}`,
      label: t('note.open', { title: note.title }),
      description: [getWorkspaceNameFromId(note.workspace, t), ...note.tags]
        .filter(Boolean)
        .join(' • '),
      group: t('commands.groups.navigation'),
      keywords: [note.title, note.workspace, ...note.tags],
      perform: () => openNote(note.id),
    })),
  ]

  useEffect(() => {
    if (bootstrappedRef.current) {
      return
    }

    bootstrappedRef.current = true

    const bootstrap = async () => {
      try {
        await invoke('ensure_dirs')
        const platform = await invoke<AppPlatform>('get_platform')
        uiState.setPlatform(platform)

        await settingsState.initialize()
        await workspaceState.initialize()
        await uiState.initialize()
        await notes.loadNotes()
      } catch (error) {
        console.error(error)
        uiState.pushToast({
          kind: 'error',
          title: t('toasts.initError'),
          description:
            error instanceof Error ? error.message : t('common.unknownError'),
        })
      }
    }

    void bootstrap()
  }, [])

  useEffect(() => {
    if (!hasCompletedOnboarding()) {
      setShowOnboarding(true)
    }
  }, [])

  useEffect(() => {
    if (!notes.activeNoteId) {
      setActiveNoteDirectory(null)
      return
    }

    let cancelled = false

    const loadNoteDirectory = async () => {
      try {
        const directory = await invoke<string>('get_note_directory', {
          id: notes.activeNoteId,
        })
        if (!cancelled) {
          setActiveNoteDirectory(directory)
        }
      } catch (error) {
        if (!cancelled) {
          setActiveNoteDirectory(null)
        }
        console.warn('Unable to resolve note directory', error)
      }
    }

    void loadNoteDirectory()

    return () => {
      cancelled = true
    }
  }, [notes.activeNoteId])

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

  useEffect(() => {
    let unlistenResize: (() => void) | undefined
    let unlistenClose: (() => void) | undefined

    const setupWindowListeners = async () => {
      try {
        const windowHandle = getCurrentWindow()
        uiState.setFullscreen(await windowHandle.isFullscreen())

        unlistenResize = await windowHandle.onResized(async () => {
          uiState.setFullscreen(await windowHandle.isFullscreen())
        })

        unlistenClose = await windowHandle.onCloseRequested(async (event) => {
          if (allowWindowCloseRef.current) {
            return
          }

          const dirtyTabs = useNotesStore
            .getState()
            .openTabs.filter((tab) => tab.isDirty)

          if (!dirtyTabs.length) {
            return
          }

          event.preventDefault()
          await requestWindowClose()
        })
      } catch (error) {
        console.warn('Window listeners unavailable', error)
      }
    }

    void setupWindowListeners()

    return () => {
      unlistenResize?.()
      unlistenClose?.()
    }
  }, [t])

  shortcutHandlersRef.current = {
    toggleFullscreen,
    zoomIn,
    zoomOut,
    resetZoom,
    toggleZenMode: () => useUiStore.getState().toggleZenMode(),
    toggleFocusMode: () => useUiStore.getState().toggleFocusMode(),
    cyclePreviewMode: () => useUiStore.getState().cyclePreviewMode(),
    openFindReplace: () => setFindReplaceNonce((current) => current + 1),
    openCommandPalette: () => useUiStore.getState().setCommandPaletteOpen(true),
    createNote: () => createNote(),
    focusSearch: () => useUiStore.getState().focusSearch(),
    saveCurrentNote,
    runSnippet: async () => runner.run(),
    toggleTerminal: () => setToggleTerminalNonce((current) => current + 1),
    activeNoteId: notes.activeNoteId,
    requestCloseTab,
    openSettings: () => useUiStore.getState().setSettingsOpen(true),
    copyCurrentNote,
    exportCurrentNoteToGist,
    duplicateActiveNote,
    togglePin,
    workspaces: workspaceState.workspaces,
    setActiveWorkspace: workspaceState.setActiveWorkspace,
  }

  useEffect(() => {
    if (!settingsState.ready) {
      return
    }

    let cancelled = false

    const applyUiZoom = async () => {
      try {
        await getCurrentWebviewWindow().setZoom(settingsState.settings.uiZoom)
        if (typeof document !== 'undefined') {
          document.body.style.zoom = ''
        }
      } catch (error) {
        if (typeof document !== 'undefined') {
          document.body.style.zoom = String(settingsState.settings.uiZoom)
        }

        if (!cancelled) {
          console.warn('Webview zoom unavailable', error)
        }
      }
    }

    void applyUiZoom()

    return () => {
      cancelled = true
    }
  }, [settingsState.ready, settingsState.settings.uiZoom])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const handlers = shortcutHandlersRef.current
      const meta = event.ctrlKey || event.metaKey
      const editable = isEditableTarget(event.target)

      if (event.key === 'F11') {
        event.preventDefault()
        void handlers.toggleFullscreen()
        return
      }

      if (meta && event.shiftKey && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        handlers.toggleZenMode()
        return
      }

      if (meta && event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        handlers.toggleFocusMode()
        return
      }

      if (
        meta &&
        !event.altKey &&
        (event.key === '+' ||
          event.key === '=' ||
          event.code === 'NumpadAdd')
      ) {
        event.preventDefault()
        void handlers.zoomIn()
        return
      }

      if (
        meta &&
        !event.altKey &&
        (event.key === '-' || event.code === 'NumpadSubtract')
      ) {
        event.preventDefault()
        void handlers.zoomOut()
        return
      }

      if (
        meta &&
        !event.altKey &&
        (event.key === '0' || event.code === 'Numpad0')
      ) {
        event.preventDefault()
        void handlers.resetZoom()
        return
      }

      if (meta && event.shiftKey && event.key.toLowerCase() === 'm') {
        event.preventDefault()
        handlers.cyclePreviewMode()
        return
      }

      if (meta && event.key.toLowerCase() === 'h') {
        event.preventDefault()
        handlers.openFindReplace()
        return
      }

      if (meta && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        handlers.openCommandPalette()
        return
      }

      if (meta && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        void handlers.createNote()
        return
      }

      if (meta && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        handlers.focusSearch()
        return
      }

      if (meta && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void handlers.saveCurrentNote()
        return
      }

      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault()
        void handlers.runSnippet()
        return
      }

      if (meta && (event.key === '`' || event.code === 'Backquote')) {
        event.preventDefault()
        handlers.toggleTerminal()
        return
      }

      if (meta && event.key.toLowerCase() === 'w') {
        event.preventDefault()
        if (handlers.activeNoteId) {
          void handlers.requestCloseTab(handlers.activeNoteId)
        }
        return
      }

      if (meta && event.key === ',') {
        event.preventDefault()
        handlers.openSettings()
        return
      }

      if (meta && event.shiftKey && event.key.toLowerCase() === 'c') {
        event.preventDefault()
        void handlers.copyCurrentNote()
        return
      }

      if (meta && event.shiftKey && event.key.toLowerCase() === 'g') {
        event.preventDefault()
        void handlers.exportCurrentNoteToGist()
        return
      }

      if (meta && event.key.toLowerCase() === 'p' && !event.shiftKey) {
        event.preventDefault()
        handlers.openCommandPalette()
        return
      }

      if (meta && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        void handlers.duplicateActiveNote()
        return
      }

      if (meta && event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault()
        void handlers.togglePin()
        return
      }

      if (event.altKey && !meta) {
        const workspaceIndex = Number(event.key) - 1
        const workspace = handlers.workspaces[workspaceIndex]
        if (workspace) {
          event.preventDefault()
          handlers.setActiveWorkspace(workspace.id)
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
  }, [])

  useEffect(() => {
    const onDragOver = (event: DragEvent) => {
      event.preventDefault()
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy'
      }
    }

    const onDrop = async (event: DragEvent) => {
      event.preventDefault()
      const files = Array.from(event.dataTransfer?.files ?? [])

      for (const file of files) {
        if (!file.name.endsWith('.md') && !file.name.endsWith('.txt')) {
          continue
        }

        const content = await file.text()
        const title = file.name.replace(/\.(md|txt)$/i, '')
        await notes.createNote({
          title,
          content,
          language: 'markdown',
        })
      }
    }

    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)

    return () => {
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [notes.createNote])

  return (
    <div className="motion-fade-in relative flex h-screen flex-col bg-base text-text-primary">
      <ResizeBorders
        platform={uiState.platform}
        enabled={!uiState.isFullscreen}
      />

      {showTitlebar ? (
        <TitleBar
          platform={uiState.platform}
          isFullscreen={uiState.isFullscreen}
          onFocusSearch={() => uiState.focusSearch()}
          onOpenSettings={() => uiState.setSettingsOpen(true)}
          onRequestWindowClose={() => void requestWindowClose()}
          onToggleSidebar={() => setSidebarVisible((current) => !current)}
          onToggleFullscreen={() => void toggleFullscreen()}
        />
      ) : null}

      <div className="flex min-h-0 flex-1">
        {showSidebar ? (
          <Sidebar
            width={uiState.sidebarWidth}
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
            onDuplicateNote={duplicateNoteById}
            onTogglePinNote={toggleNotePinById}
            onDeleteNote={deleteNoteById}
            onCreateNote={() => createNote()}
            onTagClick={(tag) => {
              notes.setActiveTag(tag)
              if (tag) {
                workspaceState.setActiveWorkspace(null)
              }
            }}
            onResize={uiState.setSidebarWidth}
          />
        ) : null}

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          {showTabs ? (
            <TabBar
              tabs={notes.openTabs}
              activeTabId={notes.activeNoteId}
              onTabClick={notes.setActiveTab}
              onTabClose={requestCloseTab}
            />
          ) : null}

          <EditorPane
            platform={uiState.platform}
            note={notes.activeNote}
            noteDirectory={activeNoteDirectory}
            settings={settingsState.settings}
            workspaces={workspaceState.workspaces}
            allTags={allTags}
            previewMode={uiState.previewMode}
            previewSplitRatio={uiState.previewSplitRatio}
            findReplaceNonce={findReplaceNonce}
            toggleTerminalNonce={toggleTerminalNonce}
            runner={runner}
            onNoteChange={(patch) => notes.updateActiveNote(patch)}
            onInsertCallout={insertCalloutIntoActiveNote}
            onContentChange={notes.updateActiveContent}
            onSave={saveCurrentNote}
            onDelete={deleteActiveNote}
            onTogglePin={togglePin}
            onCreateNote={() => createNote()}
            onCursorChange={setCursorInfo}
            onPreviewModeChange={(mode: PreviewMode) => uiState.setPreviewMode(mode)}
            onPreviewSplitRatioChange={uiState.setPreviewSplitRatio}
            onOpenFindReplace={() => setFindReplaceNonce((current) => current + 1)}
            onOpenHistory={() => uiState.setHistoryPanelOpen(true)}
          />

          <HistoryPanel
            open={uiState.historyPanelOpen}
            note={notes.activeNote}
            onClose={() => uiState.setHistoryPanelOpen(false)}
            onRestore={restoreHistoryVersion}
          />
        </div>

        {showRightPanel ? (
          <RightPanel
            key={`${notes.activeNote?.id ?? 'empty'}:${notes.activeNote?.color ?? 'none'}`}
            note={notes.activeNote}
            notes={workspaceScopedNotes}
            activeTag={notes.activeTag}
            onTagClick={(tag) => notes.setActiveTag(tag)}
            onColorSelect={(color) => {
              if (!notes.activeNote) {
                return
              }

              notes.updateActiveNote({ color })
            }}
          />
        ) : null}
      </div>

      {showStatusBar ? (
        <StatusBar
          note={notes.activeNote}
          saveStatus={notes.saveStatus}
          cursorInfo={cursorInfo}
        />
      ) : null}

      <SettingsModal
        open={uiState.settingsOpen}
        settings={settingsState.settings}
        workspaces={workspaceState.workspaces}
        onClose={() => uiState.setSettingsOpen(false)}
        onReopenOnboarding={() => {
          resetOnboarding()
          window.location.reload()
        }}
        onUpdate={settingsState.update}
        onSetVariable={settingsState.setVariable}
        onRemoveVariable={settingsState.removeVariable}
        onResetSection={settingsState.resetSection}
      />

      <ConfirmModal
        open={Boolean(uiState.confirm?.open)}
        title={uiState.confirm?.title ?? ''}
        description={uiState.confirm?.description}
        confirmLabel={uiState.confirm?.confirmLabel}
        cancelLabel={uiState.confirm?.cancelLabel}
        secondaryLabel={uiState.confirm?.secondaryLabel}
        danger={uiState.confirm?.danger}
        onConfirm={() => void uiState.confirm?.onConfirm()}
        onSecondary={
          uiState.confirm?.onSecondary
            ? () => void uiState.confirm?.onSecondary?.()
            : undefined
        }
        onCancel={uiState.closeConfirm}
      />

      <PromptModal
        open={Boolean(uiState.prompt?.open)}
        title={uiState.prompt?.title ?? ''}
        placeholder={uiState.prompt?.placeholder}
        defaultValue={uiState.prompt?.defaultValue}
        confirmLabel={uiState.prompt?.confirmLabel}
        cancelLabel={uiState.prompt?.cancelLabel}
        onConfirm={(value) => void uiState.prompt?.onConfirm(value)}
        onCancel={uiState.closePrompt}
      />

      <UpdateModal
        state={updater.state}
        onDismiss={updater.dismiss}
        onDownload={updater.startDownload}
        onInstall={installPendingUpdate}
        onRetry={updater.retry}
      />

      <CommandPalette
        open={uiState.commandPaletteOpen}
        commands={commands}
        commandHistory={uiState.commandHistory}
        onOpenChange={uiState.setCommandPaletteOpen}
        onCommandRun={uiState.rememberCommand}
      />

      {showOnboarding ? (
        <OnboardingModal
          onComplete={() => {
            markOnboardingComplete()
            setShowOnboarding(false)
          }}
        />
      ) : null}

      <ToastViewport />
    </div>
  )
}
