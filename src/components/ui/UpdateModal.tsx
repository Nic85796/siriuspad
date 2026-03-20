import { open } from '@tauri-apps/plugin-shell'
import { ArrowRight, Download, LoaderCircle, RefreshCw, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { APP_VERSION } from '@/lib/constants'
import type { UpdateState } from '@/hooks/useUpdater'

interface UpdateModalProps {
  state: UpdateState
  onDismiss: () => void
  onDownload: () => Promise<void>
  onInstall: () => Promise<void>
  onRetry: () => Promise<void>
}

function extractReleaseNotes(body: string | null): string[] {
  if (!body?.trim()) {
    return []
  }

  const normalized = body
    .replace(/\r/g, '')
    .replace(/`/g, '')
    .replace(/\s+-\s+/g, '\n- ')
    .replace(/\.\s+-\s+/g, '.\n- ')
    .trim()

  const rawLines = normalized
    .split('\n')
    .map((line) => line.replace(/^#+\s*/, '').replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)

  if (rawLines.length > 1) {
    return rawLines.slice(0, 6)
  }

  return normalized
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6)
}

export function UpdateModal({
  state,
  onDismiss,
  onDownload,
  onInstall,
  onRetry,
}: UpdateModalProps) {
  const { t, i18n } = useTranslation()
  const [installing, setInstalling] = useState(false)

  if (!state.available && !state.error) {
    return null
  }

  const releaseUrl = state.available
    ? `https://github.com/Nic85796/siriuspad/releases/tag/v${state.available.version}`
    : 'https://github.com/Nic85796/siriuspad/releases/latest'

  const handleInstall = async () => {
    setInstalling(true)

    try {
      await onInstall()
    } finally {
      setInstalling(false)
    }
  }

  const currentVersion = `v${APP_VERSION}`
  const nextVersion = state.available ? `v${state.available.version}` : '—'
  const releaseNotes = extractReleaseNotes(state.available?.body ?? null)
  let releaseDate: string | null = null

  if (state.available?.date) {
    const parsed = new Date(state.available.date)
    if (!Number.isNaN(parsed.getTime())) {
      releaseDate = new Intl.DateTimeFormat(i18n.language, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(parsed)
    }
  }

  const statusLabel = state.error
    ? t('updater.installFailed')
    : state.readyToInstall
      ? t('updater.statusReady')
      : state.downloading
        ? t('updater.statusDownloading')
        : t('updater.statusAvailable')

  return (
    <div className="absolute inset-0 z-[85] flex items-center justify-center bg-black/80 px-5 py-8">
      <div className="w-full max-w-[860px] rounded-[12px] border border-[#2d2060] bg-[#111111] p-6">
        <div className="grid gap-6 border-b border-border pb-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-md border border-[#3a2c70] bg-[rgba(124,58,237,0.12)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#c4b5fd]">
              <Sparkles className="h-3.5 w-3.5" />
              {t('updater.newVersionBadge')}
            </span>
            <div className="space-y-3">
              <h2 className="text-[34px] font-semibold tracking-tight text-text-primary">
                {state.available
                  ? t('updater.available', { version: state.available.version })
                  : t('updater.installFailed')}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-text-secondary">
                {state.error
                  ? state.error
                  : t('updater.description')}
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-md border border-border bg-[#0d0d0d] px-3 py-1.5 text-text-secondary">
                  {statusLabel}
                </span>
                {releaseDate ? (
                  <span className="rounded-md border border-border bg-[#0d0d0d] px-3 py-1.5 text-text-secondary">
                    {t('updater.releaseDate')}: {releaseDate}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-[#0d0d0d] px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-text-muted">
                {t('updater.currentVersion')}
              </div>
              <div className="mt-3 text-3xl font-semibold text-text-primary">
                {currentVersion}
              </div>
            </div>
            <div className="rounded-lg border border-[#2d2060] bg-[rgba(124,58,237,0.08)] px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-[#a78bfa]">
                {t('updater.nextVersion')}
              </div>
              <div className="mt-3 text-3xl font-semibold text-text-primary">
                {nextVersion}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            <div className="rounded-lg border border-border bg-[#0d0d0d] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
                <Sparkles className="h-4 w-4 text-accent" />
                {t('updater.releaseNotes')}
              </div>
              {releaseNotes.length ? (
                <div className="grid gap-2">
                  {releaseNotes.map((line) => (
                    <div
                      key={line}
                      className="rounded-md border border-border bg-[#111111] px-3 py-2.5 text-sm leading-6 text-text-secondary"
                    >
                      {line}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-border bg-[#111111] px-3 py-3 text-sm text-text-secondary">
                  {t('updater.releaseNotesEmpty')}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border bg-[#0d0d0d] p-4">
              <div className="mb-3 text-sm font-semibold text-text-primary">
                {t('updater.actionHint')}
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  {
                    label: t('updater.stepDownload'),
                    value: state.downloading || state.readyToInstall ? '100%' : '1',
                    icon: Download,
                  },
                  {
                    label: t('updater.stepInstall'),
                    value: state.readyToInstall || installing ? '2' : '—',
                    icon: RefreshCw,
                  },
                  {
                    label: t('updater.stepRestart'),
                    value: state.readyToInstall ? '3' : '—',
                    icon: ArrowRight,
                  },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={item.label}
                      className="rounded-md border border-border bg-[#111111] px-3 py-3"
                    >
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-text-muted">
                        <Icon className="h-3.5 w-3.5" />
                        {item.label}
                      </div>
                      <div className="mt-3 text-lg font-semibold text-text-primary">
                        {item.value}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {state.downloading ? (
              <div className="rounded-lg border border-[#2d2060] bg-[rgba(124,58,237,0.08)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-text-primary">
                    {t('updater.downloading', { progress: state.downloadProgress })}
                  </p>
                  <span className="text-xs uppercase tracking-[0.16em] text-text-secondary">
                    {t('updater.progressLabel')}
                  </span>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full border border-border bg-[#090909]">
                  <div
                    className="h-full bg-accent transition-[width] duration-200"
                    style={{ width: `${state.downloadProgress}%` }}
                  />
                </div>
                <div className="mt-4 text-xs leading-6 text-text-secondary">
                  {t('updater.backgroundDownload')}
                </div>
              </div>
            ) : null}

            {state.readyToInstall && state.available ? (
              <div className="rounded-lg border border-[#2d2060] bg-[rgba(124,58,237,0.08)] p-4">
                <p className="text-base font-semibold text-text-primary">
                  {t('updater.readyToInstall')}
                </p>
                <p className="mt-2 text-sm leading-7 text-text-secondary">
                  {t('updater.restartNotice')}
                </p>
              </div>
            ) : null}

            {!state.downloading && !state.readyToInstall && state.available && !state.error ? (
              <div className="rounded-lg border border-border bg-[#0d0d0d] p-4">
                <div className="grid gap-3">
                  <div className="rounded-md border border-border bg-[#111111] px-3 py-3">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-text-muted">
                      {t('updater.updateActionLabel')}
                    </div>
                    <div className="mt-2 text-sm leading-7 text-text-primary">
                      {t('updater.actionCopy')}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {state.error ? (
              <div className="rounded-lg border border-[#4a2020] bg-[#221212] p-4">
                <div className="text-sm font-semibold text-[#fca5a5]">
                  {t('updater.installFailed')}
                </div>
                <div className="mt-2 text-sm leading-7 text-[#f1b8b8]">
                  {state.error}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {state.error ? (
            <button
              type="button"
              className="rounded-md border border-border bg-[#161616] px-4 py-2.5 text-sm text-text-primary transition hover:border-focus hover:bg-hover"
              onClick={() => void onRetry()}
            >
              {state.readyToInstall
                ? t('updater.installAndRestart')
                : t('updater.tryAgain')}
            </button>
          ) : state.readyToInstall ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-[#3a2c70] bg-[rgba(124,58,237,0.12)] px-4 py-2.5 text-sm text-text-primary transition hover:border-[#4a3590] hover:bg-[rgba(124,58,237,0.18)] disabled:opacity-50"
              onClick={() => void handleInstall()}
              disabled={installing}
            >
              {installing ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : null}
              {t('updater.installAndRestart')}
            </button>
          ) : state.available ? (
            <>
              <button
                type="button"
                className="rounded-md border border-[#3a2c70] bg-[rgba(124,58,237,0.12)] px-4 py-2.5 text-sm text-text-primary transition hover:border-[#4a3590] hover:bg-[rgba(124,58,237,0.18)]"
                onClick={() => void onDownload()}
              >
                {t('updater.updateNow')}
              </button>
              <button
                type="button"
                className="rounded-md border border-border bg-transparent px-4 py-2.5 text-sm text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
                onClick={() => void open(releaseUrl)}
              >
                {t('updater.viewRelease')}
              </button>
            </>
          ) : null}

          <button
            type="button"
            className="ml-auto rounded-md border border-border bg-transparent px-4 py-2.5 text-sm text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
            onClick={onDismiss}
          >
            {state.downloading ? t('updater.continueLater') : t('updater.later')}
          </button>
        </div>
      </div>
    </div>
  )
}
