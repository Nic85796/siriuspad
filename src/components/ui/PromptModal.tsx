import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

interface PromptModalProps {
  open: boolean
  title: string
  placeholder?: string
  defaultValue?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: (value: string) => void | Promise<void>
  onCancel: () => void
}

export function PromptModal({
  open,
  title,
  placeholder,
  defaultValue,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: PromptModalProps) {
  const { t } = useTranslation()
  const [value, setValue] = useState(defaultValue ?? '')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const valueRef = useRef(value)

  useEffect(() => {
    valueRef.current = value
  }, [value])

  useEffect(() => {
    if (!open) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setValue(defaultValue ?? '')
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        void onConfirm(valueRef.current.trim())
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.clearTimeout(timeoutId)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [defaultValue, onCancel, onConfirm, open])

  if (!open || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
      }}
      onMouseDown={onCancel}
    >
      <div
        className="w-full max-w-md rounded-[12px] border border-border bg-elevated shadow-accent"
        style={{ maxHeight: 'calc(100svh - 2rem)' }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
        </div>
        <div className="grid gap-4 px-5 py-4">
          <input
            ref={inputRef}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-focus"
            placeholder={placeholder}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
              onClick={onCancel}
            >
              {cancelLabel ?? t('common.cancel')}
            </button>
            <button
              type="button"
              className="rounded-md border border-accent/40 bg-accent/15 px-3 py-2 text-sm font-medium text-text-primary transition hover:bg-accent/20"
              onClick={() => void onConfirm(value.trim())}
            >
              {confirmLabel ?? t('common.confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
