import { createClient } from '@supabase/supabase-js'
import { invoke } from '@tauri-apps/api/core'
import { useSettingsStore } from '@/store/settings'
import type { Note, NoteMetadata } from '@/types'

export async function syncNote(note: Note) {
  const settings = useSettingsStore.getState().settings

  // Supabase Backup
  if (settings.supabaseUrl && settings.supabaseAnonKey) {
    try {
      const supabase = createClient(settings.supabaseUrl, settings.supabaseAnonKey)
      
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
      } else {
        console.log('Synced note to Supabase:', note.title)
      }
    } catch (err) {
      console.error('Failed to sync to Supabase:', err)
    }
  }
}

export async function deleteNoteSync(id: string) {
  const settings = useSettingsStore.getState().settings

  // Supabase Deletion
  if (settings.supabaseUrl && settings.supabaseAnonKey) {
    try {
      const supabase = createClient(settings.supabaseUrl, settings.supabaseAnonKey)
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
