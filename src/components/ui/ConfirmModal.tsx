import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface ConfirmModalProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  secondaryLabel?: string
  danger?: boolean
  onConfirm: () => void | Promise<void>
  onCancel: () => void
  onSecondary?: () => void | Promise<void>
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  secondaryLabel,
  danger = false,
  onConfirm,
  onCancel,
  onSecondary,
}: ConfirmModalProps) {
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null)
  const secondaryButtonRef = useRef<HTMLButtonElement | null>(null)
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      confirmButtonRef.current?.focus()
    }, 0)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        const focused = document.activeElement
        const action =
          focused instanceof HTMLElement ? focused.dataset.confirmAction : undefined

        if (action === 'cancel') {
          onCancel()
          return
        }

        if (action === 'secondary' && onSecondary) {
          void onSecondary()
          return
        }

        void onConfirm()
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.clearTimeout(timeoutId)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onCancel, onConfirm, onSecondary, open])

  if (!open || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm"
      onMouseDown={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-elevated shadow-accent"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
          {description ? (
            <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>
          ) : null}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4">
          <button
            ref={cancelButtonRef}
            type="button"
            data-confirm-action="cancel"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          {secondaryLabel && onSecondary ? (
            <button
              ref={secondaryButtonRef}
              type="button"
              data-confirm-action="secondary"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary transition hover:border-focus hover:bg-hover"
              onClick={() => void onSecondary()}
            >
              {secondaryLabel}
            </button>
          ) : null}
          <button
            ref={confirmButtonRef}
            type="button"
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              danger
                ? 'border border-red/40 bg-red/15 text-red hover:bg-red/20'
                : 'border border-accent/40 bg-accent/15 text-text-primary hover:bg-accent/20'
            }`}
            onClick={() => void onConfirm()}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
