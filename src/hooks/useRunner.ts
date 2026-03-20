import { invoke } from '@tauri-apps/api/core'
import { useState } from 'react'

import i18n from '@/i18n'
import { EXECUTABLE_LANGUAGES } from '@/lib/constants'
import { replaceVariables } from '@/lib/parser'
import type { Note, RunResult } from '@/types'

type RunSource = 'note' | 'block'

interface RunSnippetOptions {
  code: string
  language: string
  label?: string
  source?: RunSource
  cwd?: string | null
}

export function useRunner(
  note: Note | null,
  variables: Record<string, string>,
  noteDirectory: string | null,
) {
  const [result, setResult] = useState<RunResult | null>(null)
  const [running, setRunning] = useState(false)
  const [timeoutSeconds, setTimeoutSeconds] = useState(10)
  const [lastRun, setLastRun] = useState<{
    id: string
    label: string
    language: string
    source: RunSource
  } | null>(null)

  const canRun = Boolean(
    note && EXECUTABLE_LANGUAGES.has(note.language.toLowerCase()),
  )

  async function runSnippet({
    code,
    language,
    label,
    source = 'note',
    cwd = noteDirectory,
  }: RunSnippetOptions) {
    const runId = crypto.randomUUID()
    setRunning(true)
    setLastRun({
      id: runId,
      label: label || language,
      language,
      source,
    })

    try {
      const output = await invoke<RunResult>('run_snippet', {
        code: replaceVariables(code, variables),
        language,
        envVars: variables,
        timeoutSecs: timeoutSeconds,
        cwd,
      })
      setResult(output)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : `${error ?? ''}`.trim()
      const stderr = message.toLowerCase().includes('no interpreter found')
        ? i18n.t('runner.noInterpreter', { language })
        : message || i18n.t('common.unknownError')

      setResult({
        stdout: '',
        stderr,
        exit_code: -1,
        duration_ms: 0,
        timed_out: false,
      })
    } finally {
      setRunning(false)
    }
  }

  async function run() {
    if (!note || !canRun) {
      return
    }

    await runSnippet({
      code: note.content,
      language: note.language,
      label: note.title,
      source: 'note',
      cwd: noteDirectory,
    })
  }

  function clear() {
    setResult(null)
    setLastRun(null)
  }

  return {
    canRun,
    result,
    running,
    timeoutSeconds,
    lastRun,
    run,
    runSnippet,
    clear,
    setTimeoutSeconds,
  }
}
