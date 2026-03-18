import { useEffect, useMemo, useRef } from 'react'

import { sortNotes } from '@/lib/parser'
import { useNotesStore } from '@/store/notes'
import { useSettingsStore } from '@/store/settings'

export function useNotes() {
  const notesState = useNotesStore()
  const autosaveTimerRef = useRef<number | null>(null)
  const settings = useSettingsStore((state) => state.settings)
  const fingerprint = useMemo(() => {
    const note = notesState.activeNote

    if (!note) {
      return ''
    }

    return JSON.stringify({
      id: note.id,
      title: note.title,
      workspace: note.workspace,
      language: note.language,
      tags: note.tags,
      pinned: note.pinned,
      content: note.content,
      updated_at: note.updated_at,
    })
  }, [notesState.activeNote])

  useEffect(() => {
    if (
      !settings.autosave ||
      !notesState.activeNote ||
      notesState.saveStatus !== 'dirty'
    ) {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current)
      }

      return
    }

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current)
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      useNotesStore.getState().saveActiveNote()
    }, settings.autosaveDelay)

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current)
      }
    }
  }, [
    fingerprint,
    notesState.activeNote,
    notesState.saveStatus,
    settings.autosave,
    settings.autosaveDelay,
  ])

  return {
    ...notesState,
    notes: sortNotes(notesState.notes),
  }
}
