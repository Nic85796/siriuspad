import { invoke } from '@tauri-apps/api/core'
import { create } from 'zustand'

import i18n from '@/i18n'
import { DEFAULT_WORKSPACE_ID } from '@/lib/constants'
import { createEmptyNote, sortNotes, toMetadata } from '@/lib/parser'
import { syncNote, deleteNoteSync } from '@/lib/sync'
import { useSettingsStore } from '@/store/settings'
import type {
  Note,
  NoteMetadata,
  NoteTab,
  SaveStatus,
} from '@/types'

const MAX_OPEN_TABS = 8

interface NotesState {
  notes: NoteMetadata[]
  noteDrafts: Record<string, Note>
  openTabs: NoteTab[]
  activeNote: Note | null
  activeNoteId: string | null
  activeTag: string | null
  saveStatus: SaveStatus
  saveStatuses: Record<string, SaveStatus>
  ready: boolean
  loadNotes: (workspace?: string | null) => Promise<void>
  openNote: (id: string) => Promise<void>
  openInTab: (id: string) => Promise<void>
  setActiveTab: (id: string) => Promise<void>
  closeTab: (id: string) => Promise<void>
  closeActiveNote: () => Promise<void>
  createNote: (seed?: Partial<Note>) => Promise<void>
  updateActiveNote: (patch: Partial<Note>) => void
  updateActiveContent: (content: string) => void
  saveActiveNote: () => Promise<void>
  saveNote: (id: string) => Promise<void>
  saveAllDirtyTabs: () => Promise<void>
  duplicateActiveNote: () => Promise<void>
  trashNote: (id: string) => Promise<void>
  trashActiveNote: () => Promise<void>
  setActiveTag: (tag: string | null) => void
  replaceWorkspaceId: (currentId: string, nextId: string) => void
  hydrateNote: (note: Note, status?: SaveStatus) => void
}

function mergeMetadata(notes: NoteMetadata[], note: Note) {
  const metadata = toMetadata(note)
  const existingIndex = notes.findIndex((item) => item.id === note.id)

  if (existingIndex === -1) {
    return sortNotes([metadata, ...notes])
  }

  const next = [...notes]
  next.splice(existingIndex, 1, metadata)
  return sortNotes(next)
}

function syncActiveState(
  activeNoteId: string | null,
  noteDrafts: Record<string, Note>,
  saveStatuses: Record<string, SaveStatus>,
) {
  return {
    activeNote: activeNoteId ? noteDrafts[activeNoteId] ?? null : null,
    saveStatus: activeNoteId ? saveStatuses[activeNoteId] ?? 'saved' : 'saved',
  }
}

function upsertTab(tabs: NoteTab[], note: Note, isDirty: boolean) {
  const nextTab: NoteTab = {
    id: note.id,
    title: note.title,
    isDirty,
    color: note.color,
  }
  const existingIndex = tabs.findIndex((tab) => tab.id === note.id)

  if (existingIndex === -1) {
    return [...tabs, nextTab]
  }

  const next = [...tabs]
  next.splice(existingIndex, 1, nextTab)
  return next
}

function removeFromRecord<T>(record: Record<string, T>, key: string) {
  const next = { ...record }
  delete next[key]
  return next
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  noteDrafts: {},
  openTabs: [],
  activeNote: null,
  activeNoteId: null,
  activeTag: null,
  saveStatus: 'saved',
  saveStatuses: {},
  ready: false,
  async loadNotes(workspace = null) {
    const notes = sortNotes(
      await invoke<NoteMetadata[]>('list_notes', {
        workspace: workspace || null,
      }),
    )

    const availableIds = new Set(notes.map((note) => note.id))
    const currentState = get()
    const openTabs = currentState.openTabs.filter((tab) => availableIds.has(tab.id))
    const noteDrafts = Object.fromEntries(
      Object.entries(currentState.noteDrafts).filter(([id]) => availableIds.has(id)),
    )
    const saveStatuses = Object.fromEntries(
      Object.entries(currentState.saveStatuses).filter(([id]) => availableIds.has(id)),
    )

    let activeNoteId =
      currentState.activeNoteId && availableIds.has(currentState.activeNoteId)
        ? currentState.activeNoteId
        : openTabs[0]?.id ?? null

    if (!activeNoteId && notes[0]) {
      activeNoteId = notes[0].id
    }

    set({
      notes,
      noteDrafts,
      openTabs,
      saveStatuses,
      ready: true,
      activeNoteId,
      ...syncActiveState(activeNoteId, noteDrafts, saveStatuses),
    })

    if (activeNoteId && !noteDrafts[activeNoteId]) {
      await get().openInTab(activeNoteId)
    }
  },
  async openNote(id) {
    await get().openInTab(id)
  },
  async openInTab(id) {
    const state = get()
    const existingDraft = state.noteDrafts[id]

    if (existingDraft) {
      set({
        activeNoteId: id,
        ...syncActiveState(id, state.noteDrafts, state.saveStatuses),
      })
      return
    }

    let nextTabs = [...state.openTabs]
    let nextDrafts = { ...state.noteDrafts }
    let nextStatuses = { ...state.saveStatuses }

    if (nextTabs.length >= MAX_OPEN_TABS) {
      const evictedTab =
        nextTabs.find((tab) => tab.id !== state.activeNoteId) ?? nextTabs[0] ?? null

      if (evictedTab) {
        const evictedDirty = get().saveStatuses[evictedTab.id] === 'dirty'

        if (evictedDirty) {
          await get().saveNote(evictedTab.id)
        }

        const refreshed = get()
        nextTabs = refreshed.openTabs.filter((tab) => tab.id !== evictedTab.id)
        nextDrafts = removeFromRecord(refreshed.noteDrafts, evictedTab.id)
        nextStatuses = removeFromRecord(refreshed.saveStatuses, evictedTab.id)
      }
    }

    const note = await invoke<Note>('read_note', { id })
    nextDrafts[note.id] = note
    nextStatuses[note.id] = nextStatuses[note.id] ?? 'saved'
    nextTabs = upsertTab(nextTabs, note, nextStatuses[note.id] === 'dirty')

    set({
      noteDrafts: nextDrafts,
      saveStatuses: nextStatuses,
      openTabs: nextTabs,
      activeNoteId: note.id,
      ...syncActiveState(note.id, nextDrafts, nextStatuses),
    })
  },
  async setActiveTab(id) {
    const state = get()
    if (!state.openTabs.some((tab) => tab.id === id)) {
      await get().openInTab(id)
      return
    }

    set({
      activeNoteId: id,
      ...syncActiveState(id, state.noteDrafts, state.saveStatuses),
    })
  },
  async closeTab(id) {
    const state = get()
    const tabIndex = state.openTabs.findIndex((tab) => tab.id === id)

    if (tabIndex === -1) {
      return
    }

    const nextTabs = state.openTabs.filter((tab) => tab.id !== id)
    const nextDrafts = removeFromRecord(state.noteDrafts, id)
    const nextStatuses = removeFromRecord(state.saveStatuses, id)

    const nextActiveId =
      state.activeNoteId === id
        ? nextTabs[tabIndex]?.id ?? nextTabs[tabIndex - 1]?.id ?? null
        : state.activeNoteId

    set({
      openTabs: nextTabs,
      noteDrafts: nextDrafts,
      saveStatuses: nextStatuses,
      activeNoteId: nextActiveId,
      ...syncActiveState(nextActiveId, nextDrafts, nextStatuses),
    })
  },
  async closeActiveNote() {
    const activeNoteId = get().activeNoteId
    if (!activeNoteId) {
      return
    }

    await get().closeTab(activeNoteId)
  },
  async createNote(seed = {}) {
    const defaultWorkspace =
      seed.workspace ??
      useSettingsStore.getState().settings.defaultWorkspace ??
      DEFAULT_WORKSPACE_ID
    const note = createEmptyNote(defaultWorkspace, seed)

    await invoke('write_note', { note })

    set((state) => {
      const noteDrafts = {
        ...state.noteDrafts,
        [note.id]: note,
      }
      const saveStatuses = {
        ...state.saveStatuses,
        [note.id]: 'saved' as const,
      }

      return {
        notes: mergeMetadata(state.notes, note),
        noteDrafts,
        saveStatuses,
        openTabs: upsertTab(state.openTabs, note, false),
        activeNoteId: note.id,
        ...syncActiveState(note.id, noteDrafts, saveStatuses),
      }
    })
  },
  updateActiveNote(patch) {
    const current = get().activeNote

    if (!current) {
      return
    }

    const next: Note = {
      ...current,
      ...patch,
      tags: patch.tags ?? current.tags,
      updated_at: new Date().toISOString(),
    }

    set((state) => {
      const noteDrafts = {
        ...state.noteDrafts,
        [next.id]: next,
      }
      const saveStatuses = {
        ...state.saveStatuses,
        [next.id]: 'dirty' as const,
      }

      return {
        activeNote: next,
        noteDrafts,
        notes: mergeMetadata(state.notes, next),
        openTabs: upsertTab(state.openTabs, next, true),
        saveStatuses,
        saveStatus: 'dirty',
      }
    })
  },
  updateActiveContent(content) {
    get().updateActiveNote({ content })
  },
  async saveActiveNote() {
    const activeNoteId = get().activeNoteId

    if (!activeNoteId) {
      return
    }

    await get().saveNote(activeNoteId)
  },
  async saveNote(id) {
    const current = get().noteDrafts[id]

    if (!current) {
      return
    }

    set((state) => {
      const saveStatuses = {
        ...state.saveStatuses,
        [id]: 'saving' as const,
      }

      return {
        saveStatuses,
        ...syncActiveState(state.activeNoteId, state.noteDrafts, saveStatuses),
      }
    })

    try {
      await invoke('write_note', {
        note: current,
      })

      set((state) => {
        const saveStatuses = {
          ...state.saveStatuses,
          [id]: 'saved' as const,
        }

        return {
          notes: mergeMetadata(state.notes, current),
          openTabs: upsertTab(state.openTabs, current, false),
          saveStatuses,
          ...syncActiveState(state.activeNoteId, state.noteDrafts, saveStatuses),
        }
      })
      
      // Execute Cloud Sync in the background
      void syncNote(current)
      
    } catch (error) {
      console.error(error)

      set((state) => {
        const saveStatuses = {
          ...state.saveStatuses,
          [id]: 'error' as const,
        }

        return {
          saveStatuses,
          ...syncActiveState(state.activeNoteId, state.noteDrafts, saveStatuses),
        }
      })
    }
  },
  async saveAllDirtyTabs() {
    const dirtyTabs = get().openTabs.filter((tab) => tab.isDirty)

    for (const tab of dirtyTabs) {
      await get().saveNote(tab.id)
    }
  },
  async duplicateActiveNote() {
    const current = get().activeNote

    if (!current) {
      return
    }

    await get().createNote({
      title: `${current.title} ${i18n.t('note.copySuffix')}`,
      workspace: current.workspace,
      language: current.language,
      tags: current.tags,
      pinned: false,
      priority: current.priority,
      color: current.color,
      checklist: current.checklist,
      content: current.content,
    })
  },
  async trashNote(id) {
    const state = get()
    const current = state.noteDrafts[id] ?? state.notes.find((note) => note.id === id)

    if (!current) {
      return
    }

    const isWelcome = ["Bem-vindo ao SiriusPad", "Bienvenido a SiriusPad", "Welcome to SiriusPad"].includes(current.title.trim())
    if (isWelcome) return

    await invoke('trash_note', {
      id,
    })

    // Delete from Cloud Backup in the background
    void deleteNoteSync(id)

    const remainingNotes = state.notes.filter((note) => note.id !== id)
    const nextTabs = state.openTabs.filter((tab) => tab.id !== id)
    const nextDrafts = removeFromRecord(state.noteDrafts, id)
    const nextStatuses = removeFromRecord(state.saveStatuses, id)
    const nextActiveId =
      state.activeNoteId === id
        ? nextTabs[0]?.id ?? remainingNotes[0]?.id ?? null
        : state.activeNoteId

    set({
      notes: remainingNotes,
      openTabs: nextTabs,
      noteDrafts: nextDrafts,
      saveStatuses: nextStatuses,
      activeNoteId: nextActiveId,
      ...syncActiveState(nextActiveId, nextDrafts, nextStatuses),
    })

    if (nextActiveId && !nextDrafts[nextActiveId]) {
      await get().openInTab(nextActiveId)
    }
  },
  async trashActiveNote() {
    const current = get().activeNote

    if (!current) {
      return
    }

    await get().trashNote(current.id)
  },
  setActiveTag(tag) {
    set({ activeTag: tag })
  },
  replaceWorkspaceId(currentId, nextId) {
    set((state) => {
      const noteDrafts = Object.fromEntries(
        Object.entries(state.noteDrafts).map(([id, note]) => [
          id,
          note.workspace === currentId
            ? {
                ...note,
                workspace: nextId,
              }
            : note,
        ]),
      )

      return {
        noteDrafts,
        ...syncActiveState(state.activeNoteId, noteDrafts, state.saveStatuses),
      }
    })
  },
  hydrateNote(note, status = 'saved') {
    set((state) => {
      const noteDrafts = {
        ...state.noteDrafts,
        [note.id]: note,
      }
      const saveStatuses = {
        ...state.saveStatuses,
        [note.id]: status,
      }

      return {
        noteDrafts,
        notes: mergeMetadata(state.notes, note),
        openTabs: upsertTab(state.openTabs, note, status === 'dirty'),
        saveStatuses,
        activeNoteId: note.id,
        ...syncActiveState(note.id, noteDrafts, saveStatuses),
      }
    })
  },
}))
