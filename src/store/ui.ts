import { create } from 'zustand'

import { INITIAL_COMMAND_HISTORY_LIMIT } from '@/lib/constants'
import { getAppStore } from '@/lib/storage'
import type {
  AppPlatform,
  ConfirmDialogOptions,
  PromptDialogOptions,
  ToastItem,
  UpdateInfo,
} from '@/types'

function detectInitialPlatform(): AppPlatform {
  if (typeof navigator === 'undefined') {
    return 'linux'
  }

  const agent = navigator.userAgent.toLowerCase()

  if (agent.includes('android')) {
    return 'android'
  }

  if (agent.includes('iphone') || agent.includes('ipad') || agent.includes('ipod')) {
    return 'ios'
  }

  if (agent.includes('windows')) {
    return 'windows'
  }

  if (agent.includes('mac os') || agent.includes('macintosh')) {
    return 'macos'
  }

  return 'linux'
}

interface UiState {
  commandPaletteOpen: boolean
  settingsOpen: boolean
  sidebarWidth: number
  focusSearchNonce: number
  toasts: ToastItem[]
  commandHistory: string[]
  platform: AppPlatform
  isFullscreen: boolean
  isZenMode: boolean
  isFocusMode: boolean
  historyPanelOpen: boolean
  updateAvailable: UpdateInfo | null
  confirm: (ConfirmDialogOptions & { open: boolean }) | null
  prompt: (PromptDialogOptions & { open: boolean }) | null
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error'
  setSyncStatus: (status: 'idle' | 'syncing' | 'synced' | 'error') => void
  initialize: () => Promise<void>
  setCommandPaletteOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
  setSidebarWidth: (width: number) => void
  setPlatform: (platform: AppPlatform) => void
  setFullscreen: (value: boolean) => void
  toggleZenMode: () => void
  toggleFocusMode: () => void
  setHistoryPanelOpen: (open: boolean) => void
  setUpdateAvailable: (info: UpdateInfo) => void
  clearUpdate: () => void
  focusSearch: () => void
  pushToast: (toast: Omit<ToastItem, 'id'>) => void
  dismissToast: (id: string) => void
  rememberCommand: (commandId: string) => Promise<void>
  showConfirm: (options: ConfirmDialogOptions) => void
  closeConfirm: () => void
  showPrompt: (options: PromptDialogOptions) => void
  closePrompt: () => void
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
  platform: detectInitialPlatform(),
  isFullscreen: false,
  isZenMode: false,
  isFocusMode: false,
  historyPanelOpen: false,
  updateAvailable: null,
  confirm: null,
  prompt: null,
  syncStatus: 'idle',
  setSyncStatus(status) {
    set({ syncStatus: status })
    if (status === 'synced') {
      setTimeout(() => {
        if (get().syncStatus === 'synced') {
          set({ syncStatus: 'idle' })
        }
      }, 3000)
    }
  },
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
  setPlatform(platform) {
    set({ platform })
  },
  setFullscreen(value) {
    set({ isFullscreen: value })
  },
  toggleZenMode() {
    set((state) => ({
      isZenMode: !state.isZenMode,
      isFocusMode: false,
    }))
  },
  toggleFocusMode() {
    set((state) => ({
      isFocusMode: !state.isFocusMode,
      isZenMode: false,
    }))
  },
  setHistoryPanelOpen(open) {
    set({ historyPanelOpen: open })
  },
  setUpdateAvailable(info) {
    set({ updateAvailable: info })
  },
  clearUpdate() {
    set({ updateAvailable: null })
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
  showConfirm(options) {
    set({
      confirm: {
        open: true,
        ...options,
      },
    })
  },
  closeConfirm() {
    set({ confirm: null })
  },
  showPrompt(options) {
    set({
      prompt: {
        open: true,
        ...options,
      },
    })
  },
  closePrompt() {
    set({ prompt: null })
  },
}))
