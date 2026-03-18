import { getCurrentWindow } from '@tauri-apps/api/window'
import {
  Maximize2,
  Minimize2,
  Minus,
  PanelLeftOpen,
  Search,
  Settings2,
  Square,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { AppPlatform } from '@/types'

interface TitleBarProps {
  platform: AppPlatform
  isFullscreen: boolean
  onFocusSearch: () => void
  onOpenSettings: () => void
  onToggleSidebar: () => void
  onToggleFullscreen: () => void
}

function WindowControls({ platform }: { platform: AppPlatform }) {
  if (platform === 'macos') {
    return null
  }

  const runWindowAction = async (
    action: (windowHandle: ReturnType<typeof getCurrentWindow>) => Promise<void>,
  ) => {
    try {
      const windowHandle = getCurrentWindow()
      await action(windowHandle)
    } catch (error) {
      console.warn('Window action unavailable', error)
    }
  }

  const controls = (
    <>
      <button
        type="button"
        className="titlebar-control"
        onClick={() => void runWindowAction((windowHandle) => windowHandle.minimize())}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className="titlebar-control"
        onClick={() => void runWindowAction((windowHandle) => windowHandle.toggleMaximize())}
      >
        <Square className="h-3 w-3" />
      </button>
      <button
        type="button"
        className="titlebar-control titlebar-control-close"
        onClick={() => void runWindowAction((windowHandle) => windowHandle.close())}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </>
  )

  return <div className="flex items-stretch">{controls}</div>
}

export function TitleBar({
  platform,
  isFullscreen,
  onFocusSearch,
  onOpenSettings,
  onToggleSidebar,
  onToggleFullscreen,
}: TitleBarProps) {
  const { t } = useTranslation()

  return (
    <header
      className={`relative flex h-8 items-stretch border-b border-border bg-surface/95 ${
        platform === 'macos' ? 'pl-20' : 'pl-2'
      }`}
    >
      <div className="absolute inset-0" data-tauri-drag-region />

      <div className="relative z-10 flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded-md text-text-secondary transition hover:bg-hover hover:text-text-primary"
          onClick={onToggleSidebar}
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>

        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-blue shadow-[0_0_18px_rgba(96,165,250,0.45)]" />
          <span className="truncate text-sm font-semibold tracking-wide text-text-primary">
            {t('app.name')}
          </span>
        </div>
      </div>

      <div className="relative z-10 flex items-center gap-2 px-2">
        <button
          type="button"
          className="inline-flex h-6 items-center gap-2 rounded-md border border-border px-2 text-xs text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
          onClick={onFocusSearch}
        >
          <Search className="h-3.5 w-3.5" />
          {t('titlebar.search')}
        </button>
        <button
          type="button"
          className="inline-flex h-6 items-center gap-2 rounded-md border border-border px-2 text-xs text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
          onClick={onToggleFullscreen}
          title={t('commands.toggleFullscreen')}
        >
          {isFullscreen ? (
            <Minimize2 className="h-3.5 w-3.5" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          type="button"
          className="inline-flex h-6 items-center gap-2 rounded-md border border-border px-2 text-xs text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
          onClick={onOpenSettings}
        >
          <Settings2 className="h-3.5 w-3.5" />
          {t('titlebar.settings')}
        </button>
      </div>

      <WindowControls platform={platform} />
    </header>
  )
}
