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
  onRequestWindowClose: () => void
  onToggleSidebar: () => void
  onToggleFullscreen: () => void
}

function controlButtonClassName(
  platform: AppPlatform,
  tone: 'default' | 'warning' | 'danger' = 'default',
) {
  if (platform === 'macos') {
    const palette =
      tone === 'danger'
        ? 'border-[#d24a43] bg-[#ff5f57]'
        : tone === 'warning'
          ? 'border-[#c79a1b] bg-[#ffbd2e]'
          : 'border-[#1e9e3f] bg-[#28c840]'

    return `group relative z-20 flex h-3.5 w-3.5 items-center justify-center rounded-full border ${palette} text-[9px] text-black/65 transition hover:brightness-105`
  }

  if (tone === 'danger') {
    return 'interactive-lift relative z-20 flex h-8 w-8 items-center justify-center border-l border-border text-text-secondary transition hover:bg-red/20 hover:text-red'
  }

  return 'interactive-lift relative z-20 flex h-8 w-8 items-center justify-center border-l border-border text-text-secondary transition hover:bg-hover hover:text-text-primary'
}

function controlOrder(
  platform: AppPlatform,
  onRequestWindowClose: () => void,
) {
  const controls = [
    {
      id: 'minimize',
      labelKey: 'window.minimize',
      tone: 'warning' as const,
      icon: <Minus className="h-3.5 w-3.5" />,
      compactIcon: <Minus className="h-2 w-2 opacity-0 transition group-hover:opacity-100" />,
      onClick: () =>
        runWindowAction((windowHandle) => windowHandle.minimize()),
    },
    {
      id: 'maximize',
      labelKey: 'window.maximize',
      tone: 'default' as const,
      icon: <Square className="h-3 w-3" />,
      compactIcon: <Square className="h-1.5 w-1.5 opacity-0 transition group-hover:opacity-100" />,
      onClick: () =>
        runWindowAction((windowHandle) => windowHandle.toggleMaximize()),
    },
    {
      id: 'close',
      labelKey: 'window.close',
      tone: 'danger' as const,
      icon: <X className="h-3.5 w-3.5" />,
      compactIcon: <X className="h-2 w-2 opacity-0 transition group-hover:opacity-100" />,
      onClick: onRequestWindowClose,
    },
  ]

  return platform === 'macos'
    ? [controls[2], controls[0], controls[1]]
    : controls
}

function WindowControls({
  platform,
  onRequestWindowClose,
}: {
  platform: AppPlatform
  onRequestWindowClose: () => void
}) {
  const { t } = useTranslation()
  const controls = controlOrder(platform, onRequestWindowClose)

  return (
    <div
      className={`relative z-10 flex items-center ${
        platform === 'macos' ? 'gap-2 px-3' : ''
      }`}
    >
      {controls.map((control) => {
        const label = t(control.labelKey)

        return (
          <button
            key={control.id}
            type="button"
            className={controlButtonClassName(platform, control.tone)}
            onClick={() => void control.onClick()}
            title={label}
            aria-label={label}
          >
            {platform === 'macos' ? control.compactIcon : control.icon}
          </button>
        )
      })}
    </div>
  )
}
async function runWindowAction(
  action: (windowHandle: ReturnType<typeof getCurrentWindow>) => Promise<void>,
) {
  try {
    const windowHandle = getCurrentWindow()
    await action(windowHandle)
  } catch (error) {
    console.warn('Window action unavailable', error)
  }
}

export function TitleBar({
  platform,
  isFullscreen,
  onFocusSearch,
  onOpenSettings,
  onRequestWindowClose,
  onToggleSidebar,
  onToggleFullscreen,
}: TitleBarProps) {
  const { t } = useTranslation()

  return (
    <header className="motion-fade-in relative z-10 flex h-9 items-stretch border-b border-[#1e1e1e] bg-[#0f0f0f]">
      {platform === 'macos' ? (
        <WindowControls
          platform={platform}
          onRequestWindowClose={onRequestWindowClose}
        />
      ) : null}

      <div className="relative z-10 flex items-center pl-2">
        <button
          type="button"
          className="interactive-lift flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-text-secondary transition hover:border-border hover:bg-hover hover:text-text-primary"
          onClick={onToggleSidebar}
          title={t('titlebar.toggleSidebar')}
          aria-label={t('titlebar.toggleSidebar')}
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      </div>

      <div
        className="flex min-w-0 flex-1 select-none items-center gap-3 px-3"
        data-tauri-drag-region
      >
        <div className="flex min-w-0 items-center gap-2" data-tauri-drag-region>
          <span className="accent-pulse h-2.5 w-2.5 rounded-full bg-accent" />
          <span className="truncate text-sm font-semibold tracking-wide text-text-primary">
            {t('app.name')}
          </span>
        </div>
        <div className="min-w-0 flex-1" data-tauri-drag-region />
      </div>

      <div className="relative z-10 flex items-center gap-2 px-2">
        <button
          type="button"
          className="interactive-lift inline-flex h-7 items-center gap-2 rounded-md border border-border bg-[#161616] px-2 text-xs text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
          onClick={onFocusSearch}
          title={t('titlebar.search')}
        >
          <Search className="h-3.5 w-3.5" />
          {t('titlebar.search')}
        </button>
        <button
          type="button"
          className="interactive-lift inline-flex h-7 items-center gap-2 rounded-md border border-border bg-[#161616] px-2 text-xs text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
          onClick={onToggleFullscreen}
          title={t('commands.toggleFullscreen')}
          aria-label={t('commands.toggleFullscreen')}
        >
          {isFullscreen ? (
            <Minimize2 className="h-3.5 w-3.5" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          type="button"
          className="interactive-lift inline-flex h-7 items-center gap-2 rounded-md border border-border bg-[#161616] px-2 text-xs text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
          onClick={onOpenSettings}
          title={t('titlebar.settings')}
        >
          <Settings2 className="h-3.5 w-3.5" />
          {t('titlebar.settings')}
        </button>
      </div>

      {platform !== 'macos' ? (
        <WindowControls
          platform={platform}
          onRequestWindowClose={onRequestWindowClose}
        />
      ) : null}
    </header>
  )
}
