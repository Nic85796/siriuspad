import { invoke } from '@tauri-apps/api/core'
import { formatDistanceToNow } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getDateFnsLocale } from '@/lib/date'
import { parseNoteFile } from '@/lib/parser'
import type { Note, NoteHistoryEntry } from '@/types'

interface HistoryPanelProps {
  open: boolean
  note: Note | null
  onClose: () => void
  onRestore: (timestamp: string) => Promise<void>
}

function parseHistoryTimestamp(timestamp: string) {
  const match = timestamp.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(?:\.(\d{3}))?Z$/,
  )

  if (!match) {
    return new Date()
  }

  const [, year, month, day, hour, minute, second, millis = '000'] = match

  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      Number(millis),
    ),
  )
}

function buildSimpleDiff(current: string, previous: string) {
  const currentLines = current.split('\n')
  const previousLines = previous.split('\n')
  const maxLength = Math.max(currentLines.length, previousLines.length)
  const lines: Array<{ kind: 'same' | 'added' | 'removed'; text: string }> = []

  for (let index = 0; index < maxLength; index += 1) {
    const currentLine = currentLines[index]
    const previousLine = previousLines[index]

    if (currentLine === previousLine) {
      if (currentLine !== undefined) {
        lines.push({ kind: 'same', text: currentLine })
      }
      continue
    }

    if (previousLine !== undefined) {
      lines.push({ kind: 'removed', text: previousLine })
    }

    if (currentLine !== undefined) {
      lines.push({ kind: 'added', text: currentLine })
    }
  }

  return lines
}

export function HistoryPanel({
  open,
  note,
  onClose,
  onRestore,
}: HistoryPanelProps) {
  const { t, i18n } = useTranslation()
  const [entries, setEntries] = useState<NoteHistoryEntry[]>([])
  const [selectedTimestamp, setSelectedTimestamp] = useState<string | null>(null)
  const [selectedContent, setSelectedContent] = useState('')
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [loadingVersion, setLoadingVersion] = useState(false)

  useEffect(() => {
    if (!open || !note) {
      setEntries([])
      setSelectedTimestamp(null)
      setSelectedContent('')
      setLoadingEntries(false)
      setLoadingVersion(false)
      return
    }

    const loadHistory = async () => {
      setLoadingEntries(true)
      try {
        const nextEntries = await invoke<NoteHistoryEntry[]>('list_note_history', {
          noteId: note.id,
        })
        setEntries(nextEntries)
        setSelectedTimestamp(nextEntries[0]?.timestamp ?? null)
      } catch (error) {
        console.error(error)
        setEntries([])
      } finally {
        setLoadingEntries(false)
      }
    }

    void loadHistory()
  }, [note, open])

  useEffect(() => {
    if (!open || !note || !selectedTimestamp) {
      setSelectedContent('')
      setLoadingVersion(false)
      return
    }

    const loadVersion = async () => {
      setLoadingVersion(true)
      try {
        const content = await invoke<string>('read_note_version', {
          noteId: note.id,
          timestamp: selectedTimestamp,
        })
        setSelectedContent(parseNoteFile(content, { id: note.id }).content)
      } catch (error) {
        console.error(error)
        setSelectedContent('')
      } finally {
        setLoadingVersion(false)
      }
    }

    void loadVersion()
  }, [note, open, selectedTimestamp])

  const diffLines = useMemo(() => {
    if (!note || !selectedContent) {
      return []
    }

    return buildSimpleDiff(note.content, selectedContent)
  }, [note, selectedContent])

  if (!open || !note) {
    return null
  }

  return (
    <aside className="fixed inset-y-0 right-0 z-[60] flex w-[320px] flex-col border-l border-border bg-elevated shadow-2xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-text-primary">{t('history.title')}</h3>
        <button
          type="button"
          className="rounded-md border border-border px-2 py-1 text-xs text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
          onClick={onClose}
        >
          {t('common.close')}
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr_auto]">
        <div className="max-h-52 overflow-y-auto border-b border-border px-2 py-2">
          {loadingEntries ? (
            <div className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-text-secondary">
              {t('history.loading')}
            </div>
          ) : entries.length ? (
            <div className="grid gap-1">
              {entries.map((entry) => (
                <button
                  key={entry.timestamp}
                  type="button"
                  className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                    selectedTimestamp === entry.timestamp
                      ? 'border-focus bg-active text-text-primary'
                      : 'border-border bg-surface text-text-secondary hover:border-focus hover:bg-hover hover:text-text-primary'
                  }`}
                  onClick={() => setSelectedTimestamp(entry.timestamp)}
                >
                  <p>
                    {formatDistanceToNow(parseHistoryTimestamp(entry.timestamp), {
                      addSuffix: true,
                      locale: getDateFnsLocale(i18n.language),
                    })}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {t('history.bytes', { count: entry.size_bytes })}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-text-secondary">
              {t('history.empty')}
            </div>
          )}
        </div>

        <div className="overflow-y-auto px-4 py-3">
          {loadingVersion ? (
            <div className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-text-secondary">
              {t('history.loadingVersion')}
            </div>
          ) : (
            <pre className="grid gap-1 whitespace-pre-wrap font-mono text-xs leading-5">
              {diffLines.map((line, index) => (
                <span
                  key={index}
                  className={
                    line.kind === 'added'
                      ? 'rounded bg-green/10 px-2 py-1 text-green'
                      : line.kind === 'removed'
                        ? 'rounded bg-red/10 px-2 py-1 text-red'
                        : 'px-2 py-1 text-text-secondary'
                  }
                >
                  {line.kind === 'added' ? '+' : line.kind === 'removed' ? '-' : ' '}
                  {line.text}
                </span>
              ))}
            </pre>
          )}
        </div>

        <div className="border-t border-border px-4 py-3">
          <button
            type="button"
            className="w-full rounded-lg border border-accent/40 bg-accent/15 px-3 py-2 text-sm font-medium text-text-primary transition hover:bg-accent/20"
            onClick={() => selectedTimestamp && void onRestore(selectedTimestamp)}
            disabled={!selectedTimestamp}
          >
            {t('history.restore')}
          </button>
        </div>
      </div>
    </aside>
  )
}
