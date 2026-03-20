import { Command, type Child } from '@tauri-apps/plugin-shell'
import {
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  Play,
  RotateCcw,
  Square,
  SquareTerminal,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { EXECUTABLE_LANGUAGES } from '@/lib/constants'
import type { AppPlatform, RunResult } from '@/types'

interface TerminalEntry {
  id: string
  kind: 'command' | 'stdout' | 'stderr' | 'system'
  prompt?: string
  text: string
}

type TerminalSeed =
  | {
      id: number
      kind: 'command'
      value: string
    }
  | {
      id: number
      kind: 'snippet'
      code: string
      language: string | null
    }

interface TerminalProps {
  platform: AppPlatform
  noteDirectory: string | null
  open: boolean
  height: number
  canRunSnippet: boolean
  seedCommand: TerminalSeed | null
  runner: {
    result: RunResult | null
    running: boolean
    timeoutSeconds: number
    lastRun: {
      id: string
      label: string
      language: string
      source: 'note' | 'block'
    } | null
    run: () => Promise<void>
    runSnippet: (input: {
      code: string
      language: string
      label?: string
      source?: 'note' | 'block'
      cwd?: string | null
    }) => Promise<void>
    clear: () => void
    setTimeoutSeconds: (value: number) => void
  }
  onOpenChange: (open: boolean) => void
  onHeightChange: (height: number) => void
}

function canUseSpawnCwd(platform: AppPlatform, cwd: string) {
  if (!cwd) {
    return false
  }

  return platform === 'windows'
    ? /^(?:[a-z]:[\\/]|\\\\)/i.test(cwd)
    : cwd.startsWith('/')
}

function escapeUnixPath(path: string) {
  if (path === '~' || path.startsWith('~/')) {
    return path
  }

  return `'${path.replace(/'/g, `'\\''`)}'`
}

function escapeWindowsPath(path: string) {
  return `"${path.replace(/"/g, '\\"')}"`
}

function buildShellCommand(
  platform: AppPlatform,
  cwd: string,
  command: string,
) {
  if (platform === 'windows') {
    const prefix = cwd ? `cd /d ${escapeWindowsPath(cwd)} && ` : ''
    return `${prefix}${command}`
  }

  const prefix = cwd ? `cd ${escapeUnixPath(cwd)} >/dev/null 2>&1 && ` : ''
  return `${prefix}${command}`
}

function normalizeCwd(platform: AppPlatform, current: string, input: string) {
  const target = input.trim()

  if (!target) {
    return platform === 'windows' ? '%USERPROFILE%' : '~'
  }

  if (platform === 'windows') {
    if (/^[a-z]:/i.test(target) || target.startsWith('%') || target.startsWith('\\')) {
      return target
    }

    if (target === '..') {
      return current.replace(/[\\/][^\\/]+$/, '') || current
    }

    if (target === '.') {
      return current
    }

    return `${current.replace(/[\\/]+$/, '')}\\${target.replace(/[\\/]+/g, '\\')}`
  }

  if (target.startsWith('/') || target.startsWith('~')) {
    return target
  }

  if (target === '..') {
    if (current === '~') {
      return current
    }

    return current.replace(/\/[^/]+$/, '') || '/'
  }

  if (target === '.') {
    return current
  }

  return `${current.replace(/\/$/, '')}/${target}`
}

function shellNameForPlatform(platform: AppPlatform) {
  return platform === 'windows' ? 'cmd.exe' : 'bash'
}

function promptSymbolForPlatform(platform: AppPlatform) {
  return platform === 'windows' ? '>' : '$'
}

function formatPath(platform: AppPlatform, path: string) {
  if (!path) {
    return path
  }

  if (platform === 'windows') {
    return path.replace(/^[A-Za-z]:\\Users\\[^\\]+/i, '~')
  }

  return path
    .replace(/^\/home\/[^/]+/, '~')
    .replace(/^\/Users\/[^/]+/, '~')
}

function createEntry(
  kind: TerminalEntry['kind'],
  text: string,
  prompt?: string,
): TerminalEntry {
  return {
    id: crypto.randomUUID(),
    kind,
    text,
    prompt,
  }
}

export function Terminal({
  platform,
  noteDirectory,
  open,
  height,
  canRunSnippet,
  seedCommand,
  runner,
  onOpenChange,
  onHeightChange,
}: TerminalProps) {
  const { t } = useTranslation()
  const shellName = useMemo(() => shellNameForPlatform(platform), [platform])
  const promptSymbol = useMemo(() => promptSymbolForPlatform(platform), [platform])
  const defaultCwd = noteDirectory || (platform === 'windows' ? '%USERPROFILE%' : '~')
  const [cwd, setCwd] = useState(defaultCwd)
  const [inputValue, setInputValue] = useState('')
  const [entries, setEntries] = useState<TerminalEntry[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState<number | null>(null)
  const [processRunning, setProcessRunning] = useState(false)
  const resizeStateRef = useRef<{ startY: number; startHeight: number } | null>(null)
  const childRef = useRef<Child | null>(null)
  const cancelRequestedRef = useRef(false)
  const handledSeedRef = useRef<number | null>(null)
  const startedRunRef = useRef<string | null>(null)
  const finishedRunRef = useRef<string | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const promptRef = useRef<HTMLInputElement | null>(null)

  const displayCwd = formatPath(platform, cwd)
  const displayNoteDirectory = noteDirectory
    ? formatPath(platform, noteDirectory)
    : null
  const canResetCwd = Boolean(noteDirectory && cwd !== noteDirectory)

  function appendEntry(entry: TerminalEntry) {
    setEntries((current) => [...current, entry])
  }

  function appendEntries(nextEntries: TerminalEntry[]) {
    if (!nextEntries.length) {
      return
    }

    setEntries((current) => [...current, ...nextEntries])
  }

  function resetTerminal() {
    setEntries([])
    runner.clear()
  }

  async function executeShellCommand(command: string) {
    const alias = platform === 'windows' ? 'terminal-cmd' : 'terminal-bash'
    const spawnCwd = canUseSpawnCwd(platform, cwd) ? cwd : undefined
    const shellInput = spawnCwd ? command : buildShellCommand(platform, cwd, command)
    const args =
      platform === 'windows'
        ? ['/D', '/Q', '/C', shellInput]
        : ['-lc', shellInput]
    const shellCommand = Command.create(alias, args, spawnCwd ? { cwd: spawnCwd } : undefined)

    shellCommand.stdout.on('data', (data) => {
      if (data.trim()) {
        appendEntry(createEntry('stdout', data))
      }
    })

    shellCommand.stderr.on('data', (data) => {
      if (data.trim()) {
        appendEntry(createEntry('stderr', data))
      }
    })

    shellCommand.on('close', ({ code, signal }) => {
      childRef.current = null
      setProcessRunning(false)

      if (cancelRequestedRef.current) {
        cancelRequestedRef.current = false
        appendEntry(createEntry('system', t('terminal.cancelled')))
        return
      }

      appendEntry(
        createEntry(
          'system',
          t('terminal.processFinished', {
            code: code ?? 'null',
            signal: signal ? ` (signal ${signal})` : '',
          }),
        ),
      )
    })

    shellCommand.on('error', (error) => {
      childRef.current = null
      cancelRequestedRef.current = false
      setProcessRunning(false)
      appendEntry(createEntry('stderr', error))
    })

    childRef.current = await shellCommand.spawn()
    setProcessRunning(true)
  }

  async function handleCommand() {
    const command = inputValue.trim()
    if (!command) {
      return
    }

    setInputValue('')
    setHistoryIndex(null)
    appendEntry(createEntry('command', command, displayCwd))
    setHistory((current) => [command, ...current.filter((item) => item !== command)].slice(0, 50))

    if (command.toLowerCase() === 'clear') {
      resetTerminal()
      return
    }

    if (/^cd(?:\s+.*)?$/i.test(command)) {
      const nextCwd = normalizeCwd(
        platform,
        cwd,
        command.replace(/^cd\s*/i, ''),
      )
      setCwd(nextCwd)
      return
    }

    if (childRef.current) {
      appendEntry(createEntry('system', t('terminal.processRunning')))
      return
    }

    try {
      await executeShellCommand(command)
    } catch (error) {
      setProcessRunning(false)
      appendEntry(
        createEntry(
          'stderr',
          error instanceof Error ? error.message : String(error),
        ),
      )
    }
  }

  async function stopCurrentProcess() {
    if (!childRef.current) {
      return
    }

    cancelRequestedRef.current = true
    await childRef.current.kill()
    childRef.current = null
    setProcessRunning(false)
  }

  async function runCurrentNote() {
    if (!canRunSnippet) {
      return
    }

    onOpenChange(true)
    await runner.run()
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCwd(defaultCwd)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [defaultCwd])

  useEffect(() => {
    if (!open) {
      return
    }

    const onMouseMove = (event: MouseEvent) => {
      if (!resizeStateRef.current) {
        return
      }

      const delta = resizeStateRef.current.startY - event.clientY
      const nextHeight = Math.min(
        340,
        Math.max(130, resizeStateRef.current.startHeight + delta),
      )
      onHeightChange(nextHeight)
    }

    const onMouseUp = () => {
      resizeStateRef.current = null
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [onHeightChange, open])

  useEffect(() => {
    viewportRef.current?.scrollTo({
      top: viewportRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [entries, runner.result, runner.running])

  useEffect(() => {
    if (!open) {
      return
    }

    promptRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!seedCommand || handledSeedRef.current === seedCommand.id) {
      return
    }

    handledSeedRef.current = seedCommand.id

    const handleSeed = async () => {
      onOpenChange(true)

      if (seedCommand.kind === 'command') {
        setInputValue(seedCommand.value)
        return
      }

      if (!seedCommand.language) {
        setInputValue(seedCommand.code)
        appendEntry(createEntry('system', t('terminal.blockMissingLanguage')))
        return
      }

      if (!EXECUTABLE_LANGUAGES.has(seedCommand.language.toLowerCase())) {
        setInputValue(seedCommand.code)
        appendEntry(
          createEntry(
            'system',
            t('terminal.blockUnsupported', { language: seedCommand.language }),
          ),
        )
        return
      }

      await runner.runSnippet({
        code: seedCommand.code,
        language: seedCommand.language,
        label: t('terminal.codeBlockLabel', { language: seedCommand.language }),
        source: 'block',
        cwd: noteDirectory,
      })
    }

    void handleSeed()
  }, [noteDirectory, onOpenChange, runner, seedCommand, t])

  useEffect(() => {
    if (!runner.running || !runner.lastRun) {
      return
    }

    if (startedRunRef.current === runner.lastRun.id) {
      return
    }

    startedRunRef.current = runner.lastRun.id
    onOpenChange(true)

    const message =
      runner.lastRun.source === 'block'
        ? t('terminal.runningBlock', { language: runner.lastRun.language })
        : t('terminal.runningNote', {
            title: runner.lastRun.label,
            language: runner.lastRun.language,
          })

    const timeoutId = window.setTimeout(() => {
      appendEntries([createEntry('system', message)])
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [onOpenChange, runner.lastRun, runner.running, t])

  useEffect(() => {
    if (!runner.result || !runner.lastRun) {
      return
    }

    if (finishedRunRef.current === runner.lastRun.id) {
      return
    }

    finishedRunRef.current = runner.lastRun.id
    const nextEntries: TerminalEntry[] = []

    if (runner.result.stdout.trim()) {
      nextEntries.push(createEntry('stdout', runner.result.stdout))
    }

    if (runner.result.stderr.trim()) {
      nextEntries.push(createEntry('stderr', runner.result.stderr))
    }

    nextEntries.push(
      createEntry(
        'system',
        t('terminal.snippetFinished', {
          code: runner.result.exit_code,
          ms: runner.result.duration_ms,
        }),
      ),
    )

    const timeoutId = window.setTimeout(() => {
      appendEntries(nextEntries)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [runner.lastRun, runner.result, t])

  useEffect(() => {
    return () => {
      cancelRequestedRef.current = false
      void childRef.current?.kill()
    }
  }, [])

  if (!open) {
    return (
      <div className="border-t border-border bg-[#0c0c0c]">
        <button
          type="button"
          className="flex h-10 w-full items-center justify-between px-3 text-[11px] uppercase tracking-[0.16em] text-text-secondary transition hover:bg-hover hover:text-text-primary"
          onClick={() => onOpenChange(true)}
          title={t('terminal.toggle')}
        >
          <span className="inline-flex items-center gap-2">
            <SquareTerminal className="h-3.5 w-3.5" />
            {t('terminal.title')}
          </span>
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <section
      className="relative border-t border-border bg-[#0b0b0b]"
      style={{ height }}
    >
      <div
        className="absolute inset-x-0 top-0 h-1 cursor-row-resize bg-transparent hover:bg-[var(--accent-subtle)]"
        onMouseDown={(event) => {
          resizeStateRef.current = {
            startY: event.clientY,
            startHeight: height,
          }
        }}
      />

      <div className="flex h-full flex-col pt-1">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-2.5">
          <div className="min-w-0 space-y-1">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-text-secondary">
              <span
                className={`h-2 w-2 rounded-full ${
                  processRunning || runner.running ? 'bg-accent' : 'bg-text-muted'
                }`}
              />
              <span>{t('terminal.title')}</span>
              <span className="rounded-md border border-border bg-[#111111] px-2 py-1 text-[10px] text-text-secondary">
                {shellName}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-secondary">
              <span>{t('terminal.noteFolder')}</span>
              <span className="max-w-[520px] truncate rounded-md border border-border bg-[#111111] px-2 py-1 text-text-primary">
                {displayNoteDirectory || displayCwd}
              </span>
              {canResetCwd ? (
                <button
                  type="button"
                  className="rounded-md border border-border bg-[#111111] px-2 py-1 text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
                  onClick={() => setCwd(noteDirectory ?? defaultCwd)}
                >
                  {t('terminal.resetCwd')}
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canRunSnippet ? (
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-[#111111] px-3 text-[11px] text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary disabled:opacity-40"
                onClick={() => void runCurrentNote()}
                disabled={runner.running}
                title={t('terminal.runCurrentNote')}
              >
                {runner.running ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {t('terminal.runCurrentNote')}
              </button>
            ) : null}

            <button
              type="button"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-[#111111] px-3 text-[11px] text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
              onClick={resetTerminal}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t('terminal.clear')}
            </button>

            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-[#111111] text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
              onClick={() => onOpenChange(false)}
              title={t('terminal.toggle')}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div
          ref={viewportRef}
          className="min-h-0 flex-1 overflow-y-auto bg-[#0a0a0a] px-3 py-3 font-mono text-xs"
        >
          {entries.length ? (
            <div className="space-y-1.5">
              {entries.map((entry) => (
                <div key={entry.id} className="whitespace-pre-wrap leading-6">
                  {entry.kind === 'command' ? (
                    <p className="text-text-primary">
                      <span className="text-text-secondary">
                        {entry.prompt} {promptSymbol}{' '}
                      </span>
                      {entry.text}
                    </p>
                  ) : entry.kind === 'stdout' ? (
                    <p className="text-[#34d399]">{entry.text}</p>
                  ) : entry.kind === 'stderr' ? (
                    <p className="text-[#f87171]">{entry.text}</p>
                  ) : (
                    <p className="text-text-secondary">{entry.text}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <p className="text-sm text-text-primary">{t('terminal.empty')}</p>
              <p className="max-w-lg text-xs leading-6 text-text-secondary">
                {t('terminal.emptyHint', { shell: shellName })}
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-border bg-[#0d0d0d] px-3 py-3">
          <label className="flex items-center gap-2 rounded-md border border-border bg-[#101010] px-3 py-2 text-xs text-text-secondary">
            <span className="max-w-[42%] shrink-0 truncate rounded-sm border border-border bg-[#161616] px-2 py-1 text-[11px] text-text-secondary">
              {displayCwd} {promptSymbol}
            </span>
            <input
              ref={promptRef}
              className="w-full bg-transparent text-text-primary outline-none"
              style={{ caretColor: 'var(--accent)' }}
              value={inputValue}
              onChange={(event) => {
                setInputValue(event.target.value)
                setHistoryIndex(null)
              }}
              onKeyDown={(event) => {
                event.stopPropagation()

                if (event.key === 'Enter') {
                  event.preventDefault()
                  void handleCommand()
                }

                if (
                  event.key.toLowerCase() === 'c' &&
                  event.ctrlKey &&
                  childRef.current
                ) {
                  event.preventDefault()
                  void stopCurrentProcess()
                }

                if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  if (!history.length) {
                    return
                  }

                  const nextIndex =
                    historyIndex === null
                      ? 0
                      : Math.min(historyIndex + 1, history.length - 1)
                  setHistoryIndex(nextIndex)
                  setInputValue(history[nextIndex] ?? '')
                }

                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  if (!history.length) {
                    return
                  }

                  if (historyIndex === null) {
                    setInputValue('')
                    return
                  }

                  const nextIndex = historyIndex - 1
                  if (nextIndex < 0) {
                    setHistoryIndex(null)
                    setInputValue('')
                    return
                  }

                  setHistoryIndex(nextIndex)
                  setInputValue(history[nextIndex] ?? '')
                }
              }}
              placeholder={t('terminal.commandPlaceholder', { shell: shellName })}
            />
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-[#161616] px-2 text-[11px] text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary disabled:opacity-40"
              onClick={() => void handleCommand()}
              disabled={!inputValue.trim() || processRunning}
            >
              <Play className="h-3.5 w-3.5" />
              {t('terminal.run')}
            </button>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-[#161616] px-2 text-[11px] text-text-secondary transition hover:border-[#4a2020] hover:bg-[#2d1515] hover:text-[#f87171] disabled:opacity-40"
              onClick={() => void stopCurrentProcess()}
              disabled={!processRunning}
            >
              <Square className="h-3.5 w-3.5" />
              {t('terminal.stop')}
            </button>
          </label>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-[11px] text-text-secondary">
            <span>{t('terminal.runHint')}</span>
            <span>{t('terminal.historyHint')}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
