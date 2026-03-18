import { createPortal } from 'react-dom'

import { useUiStore } from '@/store/ui'

const toastStyles = {
  success: 'border-green/40 bg-green/10 text-green',
  error: 'border-red/40 bg-red/10 text-red',
  info: 'border-blue/40 bg-blue/10 text-blue',
  warning: 'border-yellow/40 bg-yellow/10 text-yellow',
} as const

export function ToastViewport() {
  const toasts = useUiStore((state) => state.toasts)
  const dismissToast = useUiStore((state) => state.dismissToast)

  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div className="pointer-events-none fixed right-4 top-4 z-[70] flex w-[360px] max-w-[calc(100vw-32px)] flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-xl border px-4 py-3 shadow-lg backdrop-blur ${toastStyles[toast.kind]}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">{toast.title}</p>
              {toast.description ? (
                <p className="mt-1 text-xs text-text-secondary">
                  {toast.description}
                </p>
              ) : null}
              {toast.actionHref ? (
                <a
                  className="mt-2 inline-block text-xs font-medium text-blue hover:underline"
                  href={toast.actionHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  {toast.actionLabel ?? 'Open'}
                </a>
              ) : null}
            </div>
            <button
              type="button"
              className="rounded-md border border-border px-2 py-1 text-[11px] text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
              onClick={() => dismissToast(toast.id)}
            >
              close
            </button>
          </div>
        </div>
      ))}
    </div>,
    document.body,
  )
}
