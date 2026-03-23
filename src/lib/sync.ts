import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { invoke } from '@tauri-apps/api/core'

import { useSettingsStore } from '@/store/settings'
import { useUiStore } from '@/store/ui'
import type { Note, NoteMetadata } from '@/types'

const supabaseClients = new Map<string, SupabaseClient>()

function getSupabaseClient(url: string, key: string): SupabaseClient {
  const cacheKey = `${url}::${key}`
  const cached = supabaseClients.get(cacheKey)

  if (cached) {
    return cached
  }

  const client = createClient(url, key)
  supabaseClients.set(cacheKey, client)
  return client
}

export async function syncNote(note: Note) {
  const settings = useSettingsStore.getState().settings

  // Supabase Backup
  if (settings.supabaseUrl && settings.supabaseAnonKey) {
    try {
      useUiStore.getState().setSyncStatus('syncing')
      const supabase = getSupabaseClient(settings.supabaseUrl, settings.supabaseAnonKey)
      
      const { error } = await supabase
        .from('notes_backup')
        .upsert({
          id: note.id,
          title: note.title,
          content: note.content,
          workspace: note.workspace,
          updated_at: new Date().toISOString(),
        })

      if (error) {
        console.error('Supabase sync error:', error)
        useUiStore.getState().setSyncStatus('error')
        useUiStore.getState().pushToast({
          kind: 'error',
          title: 'Erro na Nuvem (Supabase)',
          description: error.message || JSON.stringify(error),
        })
      } else {
        console.log('Synced note to Supabase:', note.title)
        useUiStore.getState().setSyncStatus('synced')
      }
    } catch (err) {
      console.error('Failed to sync to Supabase:', err)
      useUiStore.getState().setSyncStatus('error')
    }
  }
}

export async function deleteNoteSync(id: string) {
  const settings = useSettingsStore.getState().settings

  // Supabase Deletion
  if (settings.supabaseUrl && settings.supabaseAnonKey) {
    try {
      const supabase = getSupabaseClient(settings.supabaseUrl, settings.supabaseAnonKey)
      await supabase.from('notes_backup').delete().eq('id', id)
      console.log('Deleted note from Supabase:', id)
    } catch (err) {
      console.error('Failed to delete from Supabase:', err)
    }
  }
}

export async function syncAllNotes() {
  try {
    const metadataList = await invoke<NoteMetadata[]>('list_notes', {})
    console.log(`Starting bulk sync of ${metadataList.length} notes...`)
    for (const meta of metadataList) {
      try {
        const note = await invoke<Note>('read_note', { id: meta.id })
        await syncNote(note)
      } catch (err) {
        console.error(`Failed to read or sync note ${meta.id}:`, err)
      }
    }
    console.log('Bulk sync completed.')
  } catch (err) {
    console.error('Failed to list notes for bulk sync:', err)
  }
}
