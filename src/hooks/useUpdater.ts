import { invoke } from '@tauri-apps/api/core'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { useUiStore } from '@/store/ui'
import type { UpdateInfo } from '@/types'

export function useUpdater() {
  const { t } = useTranslation()
  const checkedRef = useRef(false)

  useEffect(() => {
    if (checkedRef.current) {
      return
    }

    checkedRef.current = true

    const timeoutId = window.setTimeout(async () => {
      try {
        const update = await invoke<UpdateInfo | null>('check_for_update')
        if (!update) {
          return
        }

        const uiStore = useUiStore.getState()
        uiStore.setUpdateAvailable(update)
        uiStore.pushToast({
          kind: 'info',
          title: t('updater.available', { version: update.version }),
          description: t('updater.description'),
        })
      } catch {
        // Fail silently when offline or when the updater endpoint is unavailable.
      }
    }, 3000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [t])
}
