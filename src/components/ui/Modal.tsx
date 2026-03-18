import { useEffect, type PropsWithChildren } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps extends PropsWithChildren {
  open: boolean
  title: string
  onClose: () => void
  widthClassName?: string
}

export function Modal({
  children,
  open,
  title,
  onClose,
  widthClassName = 'max-w-4xl',
}: ModalProps) {
  useEffect(() => {
    if (!open) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className={`w-full ${widthClassName} overflow-hidden rounded-2xl border border-border bg-elevated shadow-accent`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold tracking-wide text-text-primary">
            {title}
          </h2>
          <button
            type="button"
            className="rounded-md border border-border px-2 py-1 text-xs text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
            onClick={onClose}
          >
            Esc
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
