import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-shell'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useUiStore } from '@/store/ui'

export function UpdateToast() {
  const { t } = useTranslation()
  const updateAvailable = useUiStore((state) => state.updateAvailable)
  const clearUpdate = useUiStore((state) => state.clearUpdate)
  const pushToast = useUiStore((state) => state.pushToast)
  const [installing, setInstalling] = useState(false)

  if (!updateAvailable) {
    return null
  }

  const handleInstall = async () => {
    setInstalling(true)

    try {
      await invoke('install_update')
      pushToast({
        kind: 'success',
        title: t('updater.installedRestart'),
      })
      clearUpdate()
    } catch (error) {
      pushToast({
        kind: 'error',
        title: t('updater.installFailed'),
        description: error instanceof Error ? error.message : String(error),
      })
      setInstalling(false)
    }
  }

  const handleViewRelease = async () => {
    await open(
      `https://github.com/Nic85796/siriuspad/releases/tag/v${updateAvailable.version}`,
    )
  }

  return (
    <div className="fixed bottom-16 right-4 z-[75] w-80 rounded-2xl border border-border bg-elevated p-4 shadow-accent">
      <p className="text-sm font-semibold text-text-primary">
        {t('updater.available', { version: updateAvailable.version })}
      </p>
      <p className="mt-1 text-xs text-text-secondary">
        {t('updater.description')}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          className="rounded-lg border border-accent/40 bg-accent/15 px-3 py-1.5 text-xs font-medium text-text-primary transition hover:bg-accent/20 disabled:opacity-50"
          onClick={() => void handleInstall()}
          disabled={installing}
        >
          {installing ? t('updater.installing') : t('updater.updateNow')}
        </button>
        <button
          type="button"
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
          onClick={() => void handleViewRelease()}
        >
          {t('updater.viewRelease')}
        </button>
        <button
          type="button"
          className="ml-auto rounded-lg px-2 py-1.5 text-xs text-text-muted transition hover:text-text-secondary"
          onClick={clearUpdate}
        >
          {t('updater.later')}
        </button>
      </div>
    </div>
  )
}
