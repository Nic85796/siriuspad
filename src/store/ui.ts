import { create } from 'zustand'

import { INITIAL_COMMAND_HISTORY_LIMIT } from '@/lib/constants'
import { getAppStore } from '@/lib/storage'
import type { ToastItem } from '@/types'

interface UiState {
  commandPaletteOpen: boolean
  settingsOpen: boolean
  sidebarWidth: number
  focusSearchNonce: number
  toasts: ToastItem[]
  commandHistory: string[]
  initialize: () => Promise<void>
  setCommandPaletteOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
  setSidebarWidth: (width: number) => void
  focusSearch: () => void
  pushToast: (toast: Omit<ToastItem, 'id'>) => void
  dismissToast: (id: string) => void
  rememberCommand: (commandId: string) => Promise<void>
}

async function persistCommandHistory(history: string[]) {
  const store = await getAppStore()
  await store.set('commandHistory', history)
  await store.save()
}

export const useUiStore = create<UiState>((set, get) => ({
  commandPaletteOpen: false,
  settingsOpen: false,
  sidebarWidth: 240,
  focusSearchNonce: 0,
  toasts: [],
  commandHistory: [],
  async initialize() {
    const store = await getAppStore()
    const commandHistory =
      (await store.get<string[]>('commandHistory')) ?? []

    set({ commandHistory })
  },
  setCommandPaletteOpen(open) {
    set({ commandPaletteOpen: open })
  },
  setSettingsOpen(open) {
    set({ settingsOpen: open })
  },
  setSidebarWidth(width) {
    set({ sidebarWidth: width })
  },
  focusSearch() {
    set((state) => ({
      focusSearchNonce: state.focusSearchNonce + 1,
    }))
  },
  pushToast(toast) {
    const id = crypto.randomUUID()
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }))

    window.setTimeout(() => {
      get().dismissToast(id)
    }, 5000)
  },
  dismissToast(id) {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }))
  },
  async rememberCommand(commandId) {
    const history = [
      commandId,
      ...get().commandHistory.filter((item) => item !== commandId),
    ].slice(0, INITIAL_COMMAND_HISTORY_LIMIT)

    set({ commandHistory: history })
    await persistCommandHistory(history)
  },
}))
