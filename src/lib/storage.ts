import { Store } from '@tauri-apps/plugin-store'

import { DEFAULT_SETTINGS, DEFAULT_WORKSPACE } from '@/lib/constants'

let appStorePromise: Promise<Store> | null = null

export function getAppStore() {
  if (!appStorePromise) {
    appStorePromise = Store.load('store.json', {
      autoSave: 200,
      defaults: {
        settings: DEFAULT_SETTINGS,
        workspaceMeta: {
          [DEFAULT_WORKSPACE.id]: DEFAULT_WORKSPACE,
        },
        commandHistory: [],
      },
    })
  }

  return appStorePromise
}
