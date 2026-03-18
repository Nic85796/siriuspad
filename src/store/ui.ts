import { create } from 'zustand'

import { INITIAL_COMMAND_HISTORY_LIMIT } from '@/lib/constants'
import { getAppStore } from '@/lib/storage'
import type {
  AppPlatform,
  ConfirmDialogOptions,
  PreviewMode,
  PromptDialogOptions,
  ToastItem,
  UpdateInfo,
} from '@/types'

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
  previewMode: PreviewMode
  previewSplitRatio: number
  historyPanelOpen: boolean
  updateAvailable: UpdateInfo | null
  confirm: (ConfirmDialogOptions & { open: boolean }) | null
  prompt: (PromptDialogOptions & { open: boolean }) | null
  initialize: () => Promise<void>
  setCommandPaletteOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
  setSidebarWidth: (width: number) => void
  setPlatform: (platform: AppPlatform) => void
  setFullscreen: (value: boolean) => void
  toggleZenMode: () => void
  toggleFocusMode: () => void
  setPreviewMode: (mode: PreviewMode) => void
  cyclePreviewMode: () => void
  setPreviewSplitRatio: (ratio: number) => void
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
  platform: 'linux',
  isFullscreen: false,
  isZenMode: false,
  isFocusMode: false,
  previewMode: 'editor',
  previewSplitRatio: 0.5,
  historyPanelOpen: false,
  updateAvailable: null,
  confirm: null,
  prompt: null,
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
  setPreviewMode(mode) {
    set({ previewMode: mode })
  },
  cyclePreviewMode() {
    set((state) => ({
      previewMode:
        state.previewMode === 'editor'
          ? 'split'
          : state.previewMode === 'split'
            ? 'preview'
            : 'editor',
    }))
  },
  setPreviewSplitRatio(ratio) {
    set({
      previewSplitRatio: Math.min(0.8, Math.max(0.2, ratio)),
    })
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
