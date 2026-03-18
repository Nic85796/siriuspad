import { invoke } from '@tauri-apps/api/core'
import { create } from 'zustand'

import { DEFAULT_WORKSPACE_ID } from '@/lib/constants'
import { createEmptyNote, sortNotes, toMetadata } from '@/lib/parser'
import { useSettingsStore } from '@/store/settings'
import type { Note, NoteMetadata, SaveStatus } from '@/types'

interface NotesState {
  notes: NoteMetadata[]
  activeNote: Note | null
  activeNoteId: string | null
  activeTag: string | null
  saveStatus: SaveStatus
  ready: boolean
  loadNotes: (workspace?: string | null) => Promise<void>
  openNote: (id: string) => Promise<void>
  createNote: (seed?: Partial<Note>) => Promise<void>
  updateActiveNote: (patch: Partial<Note>) => void
  updateActiveContent: (content: string) => void
  saveActiveNote: () => Promise<void>
  duplicateActiveNote: () => Promise<void>
  trashActiveNote: () => Promise<void>
  closeActiveNote: () => Promise<void>
  setActiveTag: (tag: string | null) => void
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

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  activeNote: null,
  activeNoteId: null,
  activeTag: null,
  saveStatus: 'saved',
  ready: false,
  async loadNotes(workspace = null) {
    const notes = sortNotes(
      await invoke<NoteMetadata[]>('list_notes', {
        workspace: workspace || null,
      }),
    )

    const currentId = get().activeNoteId
    const stillExists = currentId ? notes.some((note) => note.id === currentId) : false

    set({
      notes,
      ready: true,
    })

    if (stillExists) {
      return
    }

    if (notes[0]) {
      await get().openNote(notes[0].id)
      return
    }

    set({
      activeNote: null,
      activeNoteId: null,
    })
  },
  async openNote(id) {
    const note = await invoke<Note>('read_note', { id })

    set({
      activeNote: note,
      activeNoteId: note.id,
      saveStatus: 'saved',
    })
  },
  async createNote(seed = {}) {
    const defaultWorkspace =
      seed.workspace ??
      useSettingsStore.getState().settings.defaultWorkspace ??
      DEFAULT_WORKSPACE_ID
    const note = createEmptyNote(defaultWorkspace, seed)

    await invoke('write_note', { note })
    set((state) => ({
      notes: mergeMetadata(state.notes, note),
      activeNote: note,
      activeNoteId: note.id,
      saveStatus: 'saved',
    }))
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

    set((state) => ({
      activeNote: next,
      notes: mergeMetadata(state.notes, next),
      saveStatus: 'dirty',
    }))
  },
  updateActiveContent(content) {
    get().updateActiveNote({ content })
  },
  async saveActiveNote() {
    const current = get().activeNote

    if (!current) {
      return
    }

    set({ saveStatus: 'saving' })

    try {
      await invoke('write_note', {
        note: current,
      })

      set((state) => ({
        notes: mergeMetadata(state.notes, current),
        saveStatus: 'saved',
      }))
    } catch (error) {
      console.error(error)
      set({ saveStatus: 'error' })
    }
  },
  async duplicateActiveNote() {
    const current = get().activeNote

    if (!current) {
      return
    }

    await get().createNote({
      title: `${current.title} copy`,
      workspace: current.workspace,
      language: current.language,
      tags: current.tags,
      pinned: false,
      content: current.content,
    })
  },
  async trashActiveNote() {
    const current = get().activeNote

    if (!current) {
      return
    }

    await invoke('trash_note', {
      id: current.id,
    })

    const remaining = get().notes.filter((note) => note.id !== current.id)
    const nextActiveId = remaining[0]?.id ?? null

    set({
      notes: remaining,
      activeNote: null,
      activeNoteId: nextActiveId,
      saveStatus: 'saved',
    })

    if (nextActiveId) {
      await get().openNote(nextActiveId)
    }
  },
  async closeActiveNote() {
    const notes = get().notes
    const currentId = get().activeNoteId
    const currentIndex = notes.findIndex((note) => note.id === currentId)
    const nextNote = notes[currentIndex + 1] ?? notes[currentIndex - 1] ?? null

    set({
      activeNote: null,
      activeNoteId: nextNote?.id ?? null,
      saveStatus: 'saved',
    })

    if (nextNote) {
      await get().openNote(nextNote.id)
    }
  },
  setActiveTag(tag) {
    set({ activeTag: tag })
  },
}))
