import { open } from '@tauri-apps/plugin-shell'
import {
  ArrowRight,
  CheckCircle2,
  Download,
  LoaderCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  APP_REPOSITORY_URL,
  APP_VERSION,
} from '@/lib/constants'
import type { UpdateState } from '@/hooks/useUpdater'

interface UpdateModalProps {
  state: UpdateState
  onDismiss: () => void
  onDownload: () => Promise<void>
  onInstall: () => Promise<void>
  onRetry: () => Promise<void>
}

interface ParsedReleaseBody {
  summary: string | null
  highlights: string[]
}

function parseReleaseBody(body: string | null): ParsedReleaseBody {
  if (!body?.trim()) {
    return {
      summary: null,
      highlights: [],
    }
  }

  const lines = body
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.replace(/^#+\s*/, '').trim())

  let summary: string | null = null
  const highlights: string[] = []
  let insideHighlights = false

  for (const rawLine of lines) {
    const line = rawLine.replace(/`/g, '').trim()

    if (!line) {
      continue
    }

    if (!summary && !/^[-*]\s+/.test(line) && !/^destaques/i.test(line)) {
      summary = line
    }

    if (/^destaques/i.test(line)) {
      insideHighlights = true
      continue
    }

    if (/^distribuição oficial/i.test(line) || /^consulte/i.test(line)) {
      break
    }

    if (/^[-*]\s+/.test(line)) {
      const item = line.replace(/^[-*]\s+/, '').trim()
      if (!item) {
        continue
      }

      if (insideHighlights) {
        highlights.push(item)
      }
    }
  }

  if (!highlights.length) {
    const fallbackItems = lines
      .map((line) => line.replace(/^[-*]\s+/, '').replace(/`/g, '').trim())
      .filter(
        (line) =>
          line &&
          !/^destaques/i.test(line) &&
          !/^distribuição oficial/i.test(line) &&
          !/^consulte/i.test(line) &&
          line !== summary,
      )
      .slice(0, 4)

    return {
      summary,
      highlights: fallbackItems,
    }
  }

  return {
    summary,
    highlights: highlights.slice(0, 4),
  }
}

function getStepState(input: {
  downloading: boolean
  readyToInstall: boolean
  installing: boolean
  progress: number
}) {
  return [
    {
      key: 'download',
      icon: Download,
      progress: input.readyToInstall ? 100 : input.progress,
      done: input.readyToInstall || input.progress >= 100,
    },
    {
      key: 'install',
      icon: RefreshCw,
      progress: input.readyToInstall || input.installing ? 100 : 0,
      done: input.readyToInstall || input.installing,
    },
    {
      key: 'restart',
      icon: ArrowRight,
      progress: input.installing ? 100 : 0,
      done: input.installing,
    },
  ] as const
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
    ? `${APP_REPOSITORY_URL}/releases/tag/v${state.available.version}`
    : `${APP_REPOSITORY_URL}/releases/latest`

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
  const release = parseReleaseBody(state.available?.body ?? null)
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

  const steps = getStepState({
    downloading: state.downloading,
    readyToInstall: state.readyToInstall,
    installing,
    progress: state.downloadProgress,
  })

  return (
    <div className="modal-backdrop absolute inset-0 z-[85] overflow-y-auto bg-black/80 px-4 py-5 sm:px-6 sm:py-8">
      <div className="flex min-h-full items-start justify-center">
        <div className="modal-panel w-full max-w-[760px] overflow-hidden rounded-[12px] border border-[#2d2060] bg-[#111111]">
          <div className="border-b border-border bg-[#0d0d0d] px-5 py-5">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="min-w-0 space-y-3">
                <span className="accent-pulse inline-flex items-center gap-2 rounded-md border border-[#3a2c70] bg-[rgba(124,58,237,0.12)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#c4b5fd]">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t('updater.newVersionBadge')}
                </span>
                <h2 className="max-w-2xl break-words text-[28px] font-semibold leading-tight tracking-tight text-text-primary sm:text-[32px]">
                  {state.available
                    ? t('updater.available', { version: state.available.version })
                    : t('updater.installFailed')}
                </h2>
                <p className="max-w-2xl text-sm leading-7 text-text-secondary">
                  {state.error ? state.error : t('updater.description')}
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-md border border-border bg-[#111111] px-3 py-1.5 text-text-secondary">
                    {statusLabel}
                  </span>
                  {releaseDate ? (
                    <span className="rounded-md border border-border bg-[#111111] px-3 py-1.5 text-text-secondary">
                      {t('updater.releaseDate')}: {releaseDate}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="motion-fade-up surface-hover rounded-lg border border-border bg-[#111111] px-4 py-4">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-text-muted">
                    {t('updater.currentVersion')}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-text-primary">
                    {currentVersion}
                  </div>
                </div>
                <div
                  className="motion-fade-up surface-hover rounded-lg border border-[#2d2060] bg-[rgba(124,58,237,0.08)] px-4 py-4"
                  style={{ animationDelay: '60ms' }}
                >
                  <div className="text-[10px] uppercase tracking-[0.16em] text-[#a78bfa]">
                    {t('updater.nextVersion')}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-text-primary">
                    {nextVersion}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-5">
              <div className="motion-fade-up rounded-lg border border-border bg-[#0d0d0d] p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <Sparkles className="h-4 w-4 text-accent" />
                  {t('updater.releaseNotes')}
                </div>

                {release.summary ? (
                  <p className="rounded-md border border-border bg-[#111111] px-3 py-3 text-sm leading-7 text-text-secondary">
                    {release.summary}
                  </p>
                ) : null}

                {release.highlights.length ? (
                  <div className="mt-3 grid gap-2">
                    {release.highlights.map((item) => (
                      <div
                        key={item}
                        className="motion-fade-up flex items-start gap-3 rounded-md border border-border bg-[#111111] px-3 py-3 text-sm leading-6 text-text-secondary"
                      >
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                        <span className="min-w-0">{item}</span>
                      </div>
                    ))}
                  </div>
                ) : !release.summary ? (
                  <div className="rounded-md border border-dashed border-border bg-[#111111] px-3 py-3 text-sm text-text-secondary">
                    {t('updater.releaseNotesEmpty')}
                  </div>
                ) : null}
              </div>

              <div
                className="motion-fade-up rounded-lg border border-border bg-[#0d0d0d] p-4"
                style={{ animationDelay: '90ms' }}
              >
                <div className="mb-3 text-sm font-semibold text-text-primary">
                  {t('updater.actionHint')}
                </div>
                <div className="grid gap-2">
                  {steps.map((item, index) => {
                    const Icon = item.icon
                    return (
                      <div
                        key={item.key}
                        className="motion-fade-up flex items-center gap-3 rounded-md border border-border bg-[#111111] px-3 py-3"
                        style={{ animationDelay: `${120 + index * 40}ms` }}
                      >
                        <span
                          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-xs font-semibold ${
                            item.done
                              ? 'border-[#2d2060] bg-[rgba(124,58,237,0.12)] text-[#c4b5fd]'
                              : 'border-border bg-[#0d0d0d] text-text-secondary'
                          }`}
                        >
                          {item.done ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            `${index + 1}`
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-text-muted">
                            <Icon className="h-3.5 w-3.5" />
                            {t(`updater.step${item.key.charAt(0).toUpperCase()}${item.key.slice(1)}`)}
                          </div>
                          <div className="mt-1 text-sm text-text-primary">
                            {item.done ? '100%' : item.progress ? `${item.progress}%` : '—'}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div
                className="motion-fade-up rounded-lg border border-border bg-[#0d0d0d] p-4"
                style={{ animationDelay: '140ms' }}
              >
                <div className="text-[11px] uppercase tracking-[0.16em] text-text-muted">
                  {t('updater.updateActionLabel')}
                </div>
                <div className="mt-3 text-sm leading-7 text-text-primary">
                  {t('updater.actionCopy')}
                </div>
              </div>

              {state.downloading ? (
                <div className="motion-fade-up rounded-lg border border-[#2d2060] bg-[rgba(124,58,237,0.08)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-text-primary">
                      {t('updater.downloading', { progress: state.downloadProgress })}
                    </p>
                    <span className="text-xs uppercase tracking-[0.16em] text-text-secondary">
                      {t('updater.progressLabel')}
                    </span>
                  </div>
                  <div className="progress-shimmer mt-4 h-3 overflow-hidden rounded-full border border-border bg-[#090909]">
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
                <div className="motion-fade-up rounded-lg border border-[#2d2060] bg-[rgba(124,58,237,0.08)] p-4">
                  <p className="text-base font-semibold text-text-primary">
                    {t('updater.readyToInstall')}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-text-secondary">
                    {t('updater.restartNotice')}
                  </p>
                </div>
              ) : null}

              {state.error ? (
                <div className="motion-fade-up rounded-lg border border-[#4a2020] bg-[#221212] p-4">
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

          <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-4">
            {state.error ? (
              <button
                type="button"
                className="interactive-lift rounded-md border border-border bg-[#161616] px-4 py-2.5 text-sm text-text-primary transition hover:border-focus hover:bg-hover"
                onClick={() => void onRetry()}
              >
                {state.readyToInstall
                  ? t('updater.installAndRestart')
                  : t('updater.tryAgain')}
              </button>
            ) : state.readyToInstall ? (
              <button
                type="button"
                className="interactive-lift inline-flex items-center gap-2 rounded-md border border-[#3a2c70] bg-[rgba(124,58,237,0.12)] px-4 py-2.5 text-sm text-text-primary transition hover:border-[#4a3590] hover:bg-[rgba(124,58,237,0.18)] disabled:opacity-50"
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
                  className="interactive-lift rounded-md border border-[#3a2c70] bg-[rgba(124,58,237,0.12)] px-4 py-2.5 text-sm text-text-primary transition hover:border-[#4a3590] hover:bg-[rgba(124,58,237,0.18)]"
                  onClick={() => void onDownload()}
                >
                  {t('updater.updateNow')}
                </button>
                <button
                  type="button"
                  className="interactive-lift rounded-md border border-border bg-transparent px-4 py-2.5 text-sm text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
                  onClick={() => void open(releaseUrl)}
                >
                  {t('updater.viewRelease')}
                </button>
              </>
            ) : null}

            <button
              type="button"
              className="interactive-lift ml-auto rounded-md border border-border bg-transparent px-4 py-2.5 text-sm text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
              onClick={onDismiss}
            >
              {state.downloading ? t('updater.continueLater') : t('updater.later')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
