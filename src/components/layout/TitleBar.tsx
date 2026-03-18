import { getCurrentWindow } from '@tauri-apps/api/window'
import { Minus, PanelLeftOpen, Search, Settings2, Square, X } from 'lucide-react'

interface TitleBarProps {
  onFocusSearch: () => void
  onOpenSettings: () => void
  onToggleSidebar: () => void
}

const isWindows = navigator.userAgent.toLowerCase().includes('windows')

export function TitleBar({
  onFocusSearch,
  onOpenSettings,
  onToggleSidebar,
}: TitleBarProps) {
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

  return (
    <header className="flex h-8 items-stretch border-b border-border bg-surface/95 pl-2">
      <div
        className="flex min-w-0 flex-1 items-center gap-3"
        data-tauri-drag-region
      >
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded-md text-text-secondary transition hover:bg-hover hover:text-text-primary"
          onClick={onToggleSidebar}
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-blue shadow-[0_0_18px_rgba(96,165,250,0.45)]" />
          <span className="text-sm font-semibold tracking-wide text-text-primary">
            SiriusPad
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 px-2">
        <button
          type="button"
          className="inline-flex h-6 items-center gap-2 rounded-md border border-border px-2 text-xs text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
          onClick={onFocusSearch}
        >
          <Search className="h-3.5 w-3.5" />
          Search
        </button>
        <button
          type="button"
          className="inline-flex h-6 items-center gap-2 rounded-md border border-border px-2 text-xs text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
          onClick={onOpenSettings}
        >
          <Settings2 className="h-3.5 w-3.5" />
          Settings
        </button>
      </div>

      {isWindows ? (
        <div className="flex items-stretch">
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
            onClick={() =>
              void runWindowAction((windowHandle) => windowHandle.toggleMaximize())
            }
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
        </div>
      ) : null}
    </header>
  )
}
