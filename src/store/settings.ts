import { create } from 'zustand'

import { DEFAULT_SETTINGS } from '@/lib/constants'
import { getAppStore } from '@/lib/storage'
import type { Settings } from '@/types'

type SettingsSection =
  | 'editor'
  | 'appearance'
  | 'variables'
  | 'integrations'
  | 'shortcuts'

interface SettingsState {
  settings: Settings
  ready: boolean
  initialize: () => Promise<void>
  update: (patch: Partial<Settings>) => Promise<void>
  setVariable: (key: string, value: string) => Promise<void>
  removeVariable: (key: string) => Promise<void>
  resetSection: (section: SettingsSection) => Promise<void>
}

async function persistSettings(settings: Settings) {
  const store = await getAppStore()
  await store.set('settings', settings)
  await store.save()
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  ready: false,
  async initialize() {
    if (get().ready) {
      return
    }

    const store = await getAppStore()
    const persisted = await store.get<Settings>('settings')
    const settings = {
      ...DEFAULT_SETTINGS,
      ...persisted,
      variables: {
        ...DEFAULT_SETTINGS.variables,
        ...(persisted?.variables ?? {}),
      },
    }

    set({ settings, ready: true })
    await persistSettings(settings)
  },
  async update(patch) {
    const settings = {
      ...get().settings,
      ...patch,
      variables: patch.variables
        ? { ...patch.variables }
        : { ...get().settings.variables },
    }

    set({ settings })
    await persistSettings(settings)
  },
  async setVariable(key, value) {
    const cleanKey = key.trim().toUpperCase()

    if (!cleanKey) {
      return
    }

    const settings = {
      ...get().settings,
      variables: {
        ...get().settings.variables,
        [cleanKey]: value,
      },
    }

    set({ settings })
    await persistSettings(settings)
  },
  async removeVariable(key) {
    const nextVariables = { ...get().settings.variables }
    delete nextVariables[key]

    const settings = {
      ...get().settings,
      variables: nextVariables,
    }

    set({ settings })
    await persistSettings(settings)
  },
  async resetSection(section) {
    const current = get().settings
    let next: Settings

    switch (section) {
      case 'editor':
        next = {
          ...current,
          fontSize: DEFAULT_SETTINGS.fontSize,
          tabSize: DEFAULT_SETTINGS.tabSize,
          wordWrap: DEFAULT_SETTINGS.wordWrap,
          autosave: DEFAULT_SETTINGS.autosave,
          autosaveDelay: DEFAULT_SETTINGS.autosaveDelay,
          showLineNumbers: DEFAULT_SETTINGS.showLineNumbers,
        }
        break
      case 'appearance':
        next = {
          ...current,
          theme: 'dark',
          fontFamily: DEFAULT_SETTINGS.fontFamily,
        }
        break
      case 'variables':
        next = {
          ...current,
          variables: {},
        }
        break
      case 'integrations':
        next = {
          ...current,
          githubToken: DEFAULT_SETTINGS.githubToken,
        }
        break
      case 'shortcuts':
      default:
        next = {
          ...current,
          defaultWorkspace: DEFAULT_SETTINGS.defaultWorkspace,
        }
        break
    }

    set({ settings: next })
    await persistSettings(next)
  },
}))
