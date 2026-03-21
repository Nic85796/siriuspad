import { useTranslation } from 'react-i18next'

import type { SearchResult } from '@/types'

interface SearchResultsProps {
  query: string
  results: SearchResult[]
  loading: boolean
  activeNoteId: string | null
  onOpenNote: (noteId: string) => Promise<void>
}

function highlightText(text: string, query: string) {
  if (!query.trim()) {
    return text
  }

  const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const expression = new RegExp(`(${safeQuery})`, 'ig')
  const parts = text.split(expression)

  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark
        key={`${part}-${index}`}
        className="rounded bg-accent/20 px-0.5 text-accent"
      >
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  )
}

export function SearchResults({
  query,
  results,
  loading,
  activeNoteId,
  onOpenNote,
}: SearchResultsProps) {
  const { t } = useTranslation()

  return (
    <section className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
          {t('sidebar.search')}
        </h2>
        {loading ? (
          <span className="text-[11px] uppercase tracking-wide text-text-muted">
            {t('sidebar.loading')}
          </span>
        ) : null}
      </div>

      <div className="grid gap-2">
        {results.length ? (
          results.map((result) => (
            <button
              key={result.note_id}
              type="button"
              className={`rounded-md border px-3 py-3 text-left transition ${
                activeNoteId === result.note_id
                  ? 'border-focus bg-elevated'
                  : 'border-border bg-surface hover:border-focus hover:bg-hover'
              }`}
              onClick={() => void onOpenNote(result.note_id)}
            >
              <p className="text-[12px] font-medium text-text-primary">
                {highlightText(result.title, query)}
              </p>
              <p className="mt-2 text-xs leading-5 text-text-secondary">
                {highlightText(result.excerpt, query)}
              </p>
            </button>
          ))
        ) : (
          <div className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-text-secondary">
            {t('sidebar.noResults', { query })}
          </div>
        )}
      </div>
    </section>
  )
}
