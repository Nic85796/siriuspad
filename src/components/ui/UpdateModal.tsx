import { open } from '@tauri-apps/plugin-shell'
import {
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  type LucideIcon,
  LoaderCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { APP_REPOSITORY_URL, APP_VERSION } from '@/lib/constants'
import { useUiStore } from '@/store/ui'
import type { UpdateState } from '@/hooks/useUpdater'

interface UpdateModalProps {
  state: UpdateState
  onDismiss: () => void
  onDownload: () => Promise<void>
  onInstall: () => Promise<void>
  onRetry: () => Promise<void>
}

interface ParsedReleaseBody {
  highlights: string[]
  fallbackItems: string[]
}

function parseReleaseBody(body: string | null): ParsedReleaseBody {
  if (!body) return { highlights: [], fallbackItems: [] }

  const lines = body
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const highlights: string[] = []
  const fallbackItems: string[] = []

  let insideHighlights = false

  for (const line of lines) {
    if (
      line.toLowerCase().includes('destaque') ||
      line.toLowerCase().includes('highlight') ||
      line.toLowerCase().includes('novidade')
    ) {
      insideHighlights = true
      continue
    }

    if (line.startsWith('-') || line.startsWith('*')) {
      const cleanLine = line.replace(/^[-*]\s*/, '')
      if (insideHighlights && highlights.length < 3) {
        highlights.push(cleanLine)
      } else {
        fallbackItems.push(cleanLine)
      }
    }
  }

  // Se não achou destaques marcados, pega os primeiros itens
  if (highlights.length === 0) {
    highlights.push(...fallbackItems.slice(0, 3))
  }

  return { highlights, fallbackItems: fallbackItems.slice(highlights.length === 0 ? 3 : 0) }
}

interface Step {
  id: string
  label: string
  done: boolean
  active: boolean
  progress: number
  icon: LucideIcon
}

function getStepState({
  downloading,
  readyToInstall,
  installing,
  progress,
}: {
  downloading: boolean
  readyToInstall: boolean
  installing: boolean
  progress: number
}): Step[] {
  return [
    {
      id: 'download',
      label: 'updater.stepDownload',
      done: readyToInstall || (progress === 100 && !downloading),
      active: downloading,
      progress: progress,
      icon: Download,
    },
    {
      id: 'install',
      label: 'updater.stepInstall',
      done: false, // Só fica pronto quando termina tudo
      active: readyToInstall || installing,
      progress: installing ? 100 : 0,
      icon: RefreshCw,
    },
    {
      id: 'restart',
      label: 'updater.stepRestart',
      done: false,
      active: false,
      progress: 0,
      icon: ArrowRight,
    },
  ]
}

export function UpdateModal({
  state,
  onDismiss,
  onDownload,
  onInstall,
  onRetry,
}: UpdateModalProps) {
  const { t, i18n } = useTranslation()
  const { platform } = useUiStore()
  const isAndroid = platform === 'android'
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
    <div className="modal-backdrop absolute inset-0 z-[85] overflow-y-auto bg-black/85 px-4 py-8 backdrop-blur-md sm:px-6">
      <div className="flex min-h-full items-center justify-center">
        <div className="modal-panel motion-fade-up w-full max-w-[800px] overflow-hidden rounded-2xl border border-white/[0.08] bg-surface shadow-[0_32px_128px_rgba(0,0,0,0.8)]">
          {/* Header com Gradiente */}
          <div className="relative border-b border-border bg-base/50 p-6 sm:p-8">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/15 via-transparent to-transparent opacity-50" />
            
            <div className="relative grid gap-6 lg:grid-cols-[1fr_240px]">
              <div className="space-y-4">
                <div className="motion-fade-up inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t('updater.newVersionBadge')}
                </div>
                
                <h2 className="text-[32px] font-bold leading-[1.1] tracking-tight text-white sm:text-[40px]">
                  {state.available
                    ? t('updater.available', { version: state.available?.version })
                    : t('updater.installFailed')}
                </h2>
                
                <p className="max-w-[480px] text-sm leading-relaxed text-text-secondary">
                  {state.error ? state.error : t('updater.description')}
                </p>

                <div className="flex flex-wrap gap-2 pt-2">
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-elevated/50 px-3 py-1.5 text-[11px] text-text-secondary">
                    <div className={`h-1.5 w-1.5 rounded-full ${state.error ? 'bg-red' : 'bg-accent accent-pulse'}`} />
                    {statusLabel}
                  </div>
                  {releaseDate && (
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-elevated/50 px-3 py-1.5 text-[11px] text-text-secondary">
                      <LoaderCircle className="h-3 w-3" />
                      {releaseDate}
                    </div>
                  )}
                </div>
              </div>

              {/* Version Comparison Card */}
              <div className="hidden flex-col justify-center gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.02] p-6 lg:flex">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    {t('updater.currentVersion')}
                  </div>
                  <div className="font-mono text-lg text-text-secondary">{currentVersion}</div>
                </div>
                <div className="flex justify-center py-1">
                  <ArrowRight className="text-text-muted/30" size={20} />
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-accent">
                    {t('updater.nextVersion')}
                  </div>
                  <div className="font-mono text-2xl font-bold text-white">{nextVersion}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[1fr_300px]">
            {/* Release Notes Section */}
            <div className="max-h-[400px] overflow-y-auto bg-base/20 p-6 sm:p-8">
              <h3 className="mb-6 flex items-center gap-2 text-sm font-bold text-text-primary">
                <Sparkles size={16} className="text-accent" />
                {t('updater.releaseNotes')}
              </h3>

              <div className="grid gap-4">
                {release.highlights.map((item, idx) => (
                  <div 
                    key={idx}
                    className="group flex gap-4 rounded-xl border border-transparent bg-elevated/30 p-4 transition-all hover:border-white/[0.05] hover:bg-elevated/50"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                      <Sparkles size={14} />
                    </div>
                    <p className="text-sm leading-relaxed text-text-primary">{item}</p>
                  </div>
                ))}

                {release.highlights.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 rounded-full bg-elevated p-4 text-text-muted">
                      <Sparkles size={32} />
                    </div>
                    <p className="text-sm text-text-muted">{t('updater.releaseNotesEmpty')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Progress and Steps Section */}
            <div className="border-l border-border bg-surface p-6 sm:p-8">
              <div className="mb-8 space-y-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted">
                  {t('updater.progressLabel')}
                </h3>

                <div className="space-y-6">
                  {steps.map((item) => {
                    const Icon = item.icon
                    return (
                      <div key={item.id} className="relative">
                        <div className="flex items-center gap-4">
                          <div className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-500 ${
                            item.done 
                              ? 'border-green/30 bg-green/10 text-green scale-110' 
                              : item.active
                                ? 'border-accent/50 bg-accent/10 text-accent accent-pulse'
                                : 'border-border bg-base/50 text-text-muted'
                          }`}>
                            {item.done ? <CheckCircle2 size={18} /> : <Icon size={18} />}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className={`text-[13px] font-bold ${item.active || item.done ? 'text-text-primary' : 'text-text-muted'}`}>
                                {t(item.label)}
                              </span>
                              {item.active && (
                                <span className="text-[11px] font-mono font-bold text-accent">
                                  {Math.round(item.progress)}%
                                </span>
                              )}
                            </div>
                            
                            <div className="h-1 overflow-hidden rounded-full bg-base">
                              <div 
                                className={`h-full transition-all duration-700 ease-out ${
                                  item.done ? 'bg-green' : 'bg-accent'
                                }`}
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Status Especial */}
              <div className="motion-fade-up space-y-4" style={{ animationDelay: '500ms' }}>
                {state.downloading && (
                  <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 text-center">
                    <p className="text-xs text-text-secondary">
                      {t('updater.backgroundDownload')}
                    </p>
                  </div>
                )}

                {state.readyToInstall && !state.error && (
                  <div className="rounded-xl border border-green/30 bg-green/5 p-4 text-center">
                    <p className="text-xs font-bold text-green">
                      {t('updater.readyToInstall')}
                    </p>
                  </div>
                )}

                {state.error && (
                  <div className="rounded-xl border border-red/30 bg-red/5 p-4 text-center">
                    <p className="text-xs font-bold text-red">
                      {t('updater.installFailed')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border bg-base/50 px-6 py-6 sm:px-8">
            <div className="flex gap-3">
              {state.error ? (
                <button
                  type="button"
                  className="interactive-lift flex items-center gap-2 rounded-xl bg-red/10 px-6 py-3 text-[13px] font-bold text-red transition hover:bg-red/20"
                  onClick={() => void onRetry()}
                >
                  <RefreshCw size={14} />
                  {state.readyToInstall ? t('updater.installAndRestart') : t('updater.tryAgain')}
                </button>
              ) : state.readyToInstall ? (
                <button
                  type="button"
                  className="interactive-lift flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-[13px] font-bold text-white transition hover:bg-accent-hover disabled:opacity-50"
                  onClick={() => void handleInstall()}
                  disabled={installing}
                >
                  {installing ? <LoaderCircle size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  {t('updater.installAndRestart')}
                </button>
              ) : state.available ? (
                <>
                  <button
                    type="button"
                    className="interactive-lift flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-[13px] font-bold text-white transition hover:bg-accent-hover"
                    onClick={() => {
                      if (isAndroid) {
                        void open(`${APP_REPOSITORY_URL}/releases/latest`)
                      } else {
                        void onDownload()
                      }
                    }}
                  >
                    {isAndroid ? <ExternalLink size={14} /> : <Download size={14} />}
                    {t('updater.updateNow')}
                  </button>
                  <button
                    type="button"
                    className="interactive-lift rounded-xl border border-border bg-elevated/50 px-6 py-3 text-[13px] font-bold text-text-primary transition hover:border-focus hover:bg-hover"
                    onClick={() => void open(releaseUrl)}
                  >
                    {t('updater.viewRelease')}
                  </button>
                </>
              ) : null}
            </div>

            <button
              type="button"
              className="text-[13px] font-bold text-text-muted transition hover:text-text-primary"
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
