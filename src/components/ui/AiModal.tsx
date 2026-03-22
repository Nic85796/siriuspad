import { Copy, BrainCircuit, Loader2, Settings2, Sparkles, Wand2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Modal } from '@/components/ui/Modal'
import type { AiChatMessage, Note } from '@/types'

interface AiModalProps {
  open: boolean
  note: Note | null
  configured: boolean
  model: string
  messages: AiChatMessage[]
  busy: boolean
  error: string | null
  onClose: () => void
  onOpenSettings: () => void
  onSend: (input: string, useNoteContext: boolean) => Promise<void>
  onClear: () => void
  onCopyLatest: () => Promise<void>
  onInsertLatest: () => void
}

function bubbleClassName(role: AiChatMessage['role']) {
  if (role === 'assistant') {
    return 'border-accent/30 bg-accent/10'
  }

  return 'border-border bg-base'
}

export function AiModal({
  open,
  note,
  configured,
  model,
  messages,
  busy,
  error,
  onClose,
  onOpenSettings,
  onSend,
  onClear,
  onCopyLatest,
  onInsertLatest,
}: AiModalProps) {
  const { t } = useTranslation()
  const [prompt, setPrompt] = useState('')
  const [useNoteContext, setUseNoteContext] = useState(Boolean(note))

  const latestAssistantMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'assistant') ?? null,
    [messages],
  )

  const send = async () => {
    const value = prompt.trim()
    if (!value || busy) {
      return
    }

    setPrompt('')
    await onSend(value, note ? useNoteContext : false)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('ai.title')}
      widthClassName="max-w-4xl"
    >
      <div className="grid gap-4 px-5 py-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
          <div className="rounded-lg border border-border bg-base px-4 py-4">
            <div className="flex items-center gap-2 text-text-primary">
              <BrainCircuit className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-semibold">{t('ai.panelTitle')}</h3>
            </div>
            <p className="mt-2 text-sm leading-7 text-text-secondary">
              {t('ai.panelHint')}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-base px-4 py-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-text-muted">
              {t('ai.modelLabel')}
            </div>
            <div className="mt-2 break-all text-sm font-medium text-text-primary">
              {model || '—'}
            </div>
            <div className="mt-3 text-xs leading-6 text-text-secondary">
              {configured ? t('ai.modelHint') : t('ai.setupHint')}
            </div>
          </div>
        </div>

        {!configured ? (
          <div className="rounded-lg border border-accent/25 bg-accent/10 px-4 py-4">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-text-primary">
                  {t('ai.setupTitle')}
                </h3>
                <p className="mt-2 text-sm leading-7 text-text-secondary">
                  {t('ai.setupBody')}
                </p>
                <button
                  type="button"
                  className="mt-3 inline-flex items-center gap-2 rounded-md border border-accent/35 bg-accent/10 px-3 py-2 text-sm text-text-primary transition hover:border-accent/50 hover:bg-accent/15"
                  onClick={onOpenSettings}
                >
                  <Settings2 className="h-4 w-4" />
                  {t('ai.openSettings')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-base px-4 py-3">
              <label className="inline-flex items-center gap-3 text-sm text-text-primary">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border bg-surface accent-[var(--accent)]"
                  checked={note ? useNoteContext : false}
                  onChange={(event) => setUseNoteContext(event.target.checked)}
                  disabled={!note}
                />
                <span>
                  {note
                    ? t('ai.useNoteContext', { title: note.title || t('common.untitled') })
                    : t('ai.useNoteContextDisabled')}
                </span>
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => void onCopyLatest()}
                  disabled={!latestAssistantMessage}
                >
                  <span className="inline-flex items-center gap-2">
                    <Copy className="h-3.5 w-3.5" />
                    {t('ai.copyLatest')}
                  </span>
                </button>
                <button
                  type="button"
                  className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={onInsertLatest}
                  disabled={!latestAssistantMessage || !note}
                >
                  <span className="inline-flex items-center gap-2">
                    <Wand2 className="h-3.5 w-3.5" />
                    {t('ai.insertLatest')}
                  </span>
                </button>
                <button
                  type="button"
                  className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={onClear}
                  disabled={!messages.length && !error}
                >
                  {t('ai.clear')}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-base">
              <div className="max-h-[48vh] overflow-y-auto px-4 py-4">
                {messages.length ? (
                  <div className="grid gap-3">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`rounded-lg border px-4 py-3 ${bubbleClassName(message.role)}`}
                      >
                        <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-text-muted">
                          {message.role === 'assistant' ? t('ai.assistantLabel') : t('ai.youLabel')}
                        </div>
                        <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-text-primary">
                          {message.content}
                        </pre>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm leading-7 text-text-secondary">
                    {t('ai.empty')}
                  </div>
                )}
              </div>

              {error ? (
                <div className="border-t border-border px-4 py-3 text-sm text-red">
                  {error}
                </div>
              ) : null}

              <div className="border-t border-border px-4 py-4">
                <textarea
                  className="min-h-[120px] w-full rounded-lg border border-border bg-surface px-3 py-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-focus"
                  placeholder={t('ai.inputPlaceholder')}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                      event.preventDefault()
                      void send()
                    }
                  }}
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs leading-6 text-text-secondary">
                    {t('ai.inputHint')}
                  </p>
                  <button
                    type="button"
                    className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-md border border-accent/35 bg-accent/10 px-4 py-2 text-sm font-medium text-text-primary transition hover:border-accent/50 hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => void send()}
                    disabled={busy || !prompt.trim()}
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {busy ? t('ai.thinking') : t('ai.send')}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
