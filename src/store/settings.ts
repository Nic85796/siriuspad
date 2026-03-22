import { create, type StateCreator } from 'zustand'

import i18n from '@/i18n'
import {
  DEFAULT_SETTINGS,
  UI_ZOOM_MAX,
  UI_ZOOM_MIN,
  UI_ZOOM_STEP,
} from '@/lib/constants'
import { getAppStore } from '@/lib/storage'
import { applyTheme } from '@/lib/themes'
import type { AppLanguage, AppTheme, Settings } from '@/types'

type SettingsSection =
  | 'editor'
  | 'appearance'
  | 'variables'
  | 'integrations'
  | 'database'
  | 'shortcuts'
  | 'language'

interface SettingsState {
  settings: Settings
  ready: boolean
  initialize: () => Promise<void>
  update: (patch: Partial<Settings>) => Promise<void>
  setVariable: (key: string, value: string) => Promise<void>
  removeVariable: (key: string) => Promise<void>
  resetSection: (section: SettingsSection) => Promise<void>
}

type StoreSet = Parameters<StateCreator<SettingsState>>[0]
type StoreGet = Parameters<StateCreator<SettingsState>>[1]

async function persistSettings(settings: Settings) {
  const store = await getAppStore()
  await store.set('settings', settings)
  await store.save()
}

function normalizeUiZoom(value: number | null | undefined) {
  const numeric = Number(value)

  if (!Number.isFinite(numeric)) {
    return DEFAULT_SETTINGS.uiZoom
  }

  const rounded = Math.round(numeric / UI_ZOOM_STEP) * UI_ZOOM_STEP
  return Math.min(UI_ZOOM_MAX, Math.max(UI_ZOOM_MIN, Number(rounded.toFixed(2))))
}

function normalizeTheme(theme: string | null | undefined): AppTheme {
  switch ((theme ?? '').trim()) {
    case 'light':
    case 'dark-dimmed':
    case 'midnight':
      return theme as AppTheme
    case 'dark':
    default:
      return 'dark'
  }
}

function applyInterfaceSettings(settings: Settings) {
  if (typeof document === 'undefined') {
    return
  }

  const fontStack = `"${settings.fontFamily}", "JetBrains Mono", "Fira Code", "Cascadia Code", monospace`
  const root = document.documentElement

  root.style.setProperty('--font-ui', fontStack)
  root.style.setProperty('--font-mono', fontStack)
}

function normalizeLanguage(language: string | null | undefined): AppLanguage {
  const normalized = (language ?? '').trim().toLowerCase()

  if (normalized.startsWith('pt')) {
    return 'pt-BR'
  }

  if (normalized.startsWith('es')) {
    return 'es'
  }

  return 'en'
}

function detectSystemLanguage(): AppLanguage {
  if (typeof navigator !== 'undefined' && navigator.language) {
    return normalizeLanguage(navigator.language)
  }

  return DEFAULT_SETTINGS.language
}

function detectSystemTheme(): AppTheme {
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: light)').matches
  ) {
    return 'light'
  }

  return 'dark'
}

async function syncSystemTheme(set: StoreSet, get: StoreGet) {
  const current = get().settings

  if (!current.useSystemTheme) {
    return
  }

  const nextTheme = detectSystemTheme()

  if (nextTheme === current.theme) {
    return
  }

  const settings = {
    ...current,
    theme: nextTheme,
  }

  set({ settings })
  applyTheme(settings.theme)
  applyInterfaceSettings(settings)
  await persistSettings(settings)
}

async function syncSystemLanguage(set: StoreSet, get: StoreGet) {
  const current = get().settings

  if (!current.useSystemLanguage) {
    return
  }

  const nextLanguage = detectSystemLanguage()

  if (nextLanguage === current.language) {
    return
  }

  const settings = {
    ...current,
    language: nextLanguage,
  }

  set({ settings })
  applyTheme(settings.theme)
  applyInterfaceSettings(settings)
  await i18n.changeLanguage(settings.language)
  await persistSettings(settings)
}

let systemListenersRegistered = false

function registerSystemListeners(set: StoreSet, get: StoreGet) {
  if (systemListenersRegistered || typeof window === 'undefined') {
    return
  }

  systemListenersRegistered = true

  window.addEventListener('languagechange', () => {
    void syncSystemLanguage(set, get)
  })

  if (typeof window.matchMedia !== 'function') {
    return
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: light)')
  const handleThemeChange = () => {
    void syncSystemTheme(set, get)
  }

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handleThemeChange)
  } else {
    mediaQuery.addListener(handleThemeChange)
  }
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
    const useSystemTheme =
      persisted?.useSystemTheme ?? (persisted ? false : DEFAULT_SETTINGS.useSystemTheme)
    const useSystemLanguage =
      persisted?.useSystemLanguage ??
      (persisted ? false : DEFAULT_SETTINGS.useSystemLanguage)
    const theme = useSystemTheme
      ? detectSystemTheme()
      : normalizeTheme(persisted?.theme ?? DEFAULT_SETTINGS.theme)
    const language = useSystemLanguage
      ? detectSystemLanguage()
      : normalizeLanguage(persisted?.language ?? DEFAULT_SETTINGS.language)
    const settings = {
      ...DEFAULT_SETTINGS,
      ...persisted,
      theme,
      useSystemTheme,
      useSystemLanguage,
      language,
      uiZoom: normalizeUiZoom(persisted?.uiZoom),
      variables: {
        ...DEFAULT_SETTINGS.variables,
        ...(persisted?.variables ?? {}),
      },
    }

    set({ settings, ready: true })
    registerSystemListeners(set, get)
    applyTheme(settings.theme)
    applyInterfaceSettings(settings)
    await i18n.changeLanguage(settings.language)
    await persistSettings(settings)
  },
  async update(patch) {
    const current = get().settings
    const useSystemTheme = patch.useSystemTheme ?? current.useSystemTheme
    const useSystemLanguage = patch.useSystemLanguage ?? current.useSystemLanguage
    const requestedTheme =
      patch.theme === undefined ? current.theme : normalizeTheme(patch.theme)
    const requestedLanguage =
      patch.language === undefined
        ? current.language
        : normalizeLanguage(patch.language)
    const nextTheme = useSystemTheme ? detectSystemTheme() : requestedTheme
    const nextLanguage = useSystemLanguage
      ? detectSystemLanguage()
      : requestedLanguage
    const settings = {
      ...current,
      ...patch,
      theme: nextTheme,
      useSystemTheme,
      useSystemLanguage,
      language: nextLanguage,
      uiZoom:
        patch.uiZoom === undefined
          ? current.uiZoom
          : normalizeUiZoom(patch.uiZoom),
      variables: patch.variables
        ? { ...patch.variables }
        : { ...current.variables },
    }

    set({ settings })
    applyTheme(settings.theme)
    applyInterfaceSettings(settings)

    if (settings.language !== current.language) {
      await i18n.changeLanguage(nextLanguage)
    }

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
          uiZoom: DEFAULT_SETTINGS.uiZoom,
          theme: detectSystemTheme(),
          useSystemTheme: DEFAULT_SETTINGS.useSystemTheme,
          fontFamily: DEFAULT_SETTINGS.fontFamily,
        }
        break
      case 'language':
        next = {
          ...current,
          useSystemLanguage: DEFAULT_SETTINGS.useSystemLanguage,
          language: detectSystemLanguage(),
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
      case 'database':
        next = {
          ...current,
          supabaseUrl: DEFAULT_SETTINGS.supabaseUrl,
          supabaseAnonKey: DEFAULT_SETTINGS.supabaseAnonKey,
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
    applyTheme(next.theme)
    applyInterfaceSettings(next)

    if (section === 'language') {
      await i18n.changeLanguage(next.language)
    }

    await persistSettings(next)
  },
}))
