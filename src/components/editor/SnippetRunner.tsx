import { LoaderCircle, Play, RotateCcw } from 'lucide-react'

import type { RunResult } from '@/types'

interface SnippetRunnerProps {
  language: string
  result: RunResult | null
  running: boolean
  onRun: () => Promise<void>
  onClear: () => void
}

export function SnippetRunner({
  language,
  result,
  running,
  onRun,
  onClear,
}: SnippetRunnerProps) {
  return (
    <div className="border-t border-border bg-surface px-4 py-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
            Snippet Runner
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            {language} • Ctrl+Enter
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-base px-3 py-2 text-sm text-text-primary transition hover:border-focus hover:bg-hover"
            onClick={() => void onRun()}
            disabled={running}
          >
            {running ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Run
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-base px-3 py-2 text-sm text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
            onClick={onClear}
          >
            <RotateCcw className="h-4 w-4" />
            Clear
          </button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-[#0a0a0a] p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
            stdout
          </h3>
          <pre className="max-h-52 overflow-auto whitespace-pre-wrap font-mono text-xs leading-6 text-green">
            {result?.stdout || 'No stdout yet.'}
          </pre>
        </section>
        <section className="rounded-xl border border-border bg-[#0a0a0a] p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
            stderr
          </h3>
          <pre className="max-h-52 overflow-auto whitespace-pre-wrap font-mono text-xs leading-6 text-red">
            {result?.stderr || 'No stderr yet.'}
          </pre>
        </section>
      </div>

      {result ? (
        <div className="mt-3 flex items-center gap-3 text-xs text-text-secondary">
          <span>Exit code: {result.exit_code}</span>
          <span>Duration: {result.duration_ms}ms</span>
          {result.timed_out ? <span className="text-yellow">Timed out</span> : null}
        </div>
      ) : null}
    </div>
  )
}
