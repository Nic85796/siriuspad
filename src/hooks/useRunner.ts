import { invoke } from '@tauri-apps/api/core'
import { useState } from 'react'

import { EXECUTABLE_LANGUAGES } from '@/lib/constants'
import { replaceVariables } from '@/lib/parser'
import type { Note, RunResult } from '@/types'

export function useRunner(
  note: Note | null,
  variables: Record<string, string>,
) {
  const [result, setResult] = useState<RunResult | null>(null)
  const [running, setRunning] = useState(false)

  const canRun = Boolean(
    note && EXECUTABLE_LANGUAGES.has(note.language.toLowerCase()),
  )

  async function run() {
    if (!note || !canRun) {
      return
    }

    setRunning(true)

    try {
      const output = await invoke<RunResult>('run_snippet', {
        code: replaceVariables(note.content, variables),
        language: note.language,
        envVars: variables,
      })
      setResult(output)
    } finally {
      setRunning(false)
    }
  }

  function clear() {
    setResult(null)
  }

  return {
    canRun,
    result,
    running,
    run,
    clear,
  }
}
