import { format } from 'date-fns'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { getDateFnsLocale } from '@/lib/date'
import { NOTE_COLOR_SWATCHES } from '@/lib/constants'
import { PriorityDot } from '@/components/ui/PriorityDot'
import { TagPill } from '@/components/ui/TagPill'
import type { Note, NoteMetadata } from '@/types'

interface RightPanelProps {
  note: Note | null
  notes: NoteMetadata[]
  activeTag: string | null
  onTagClick: (tag: string | null) => void
  onColorSelect: (color?: string) => void
}

function wordCount(content: string) {
  return content.trim() ? content.trim().split(/\s+/).length : 0
}

export function RightPanel({
  note,
  notes,
  activeTag,
  onTagClick,
  onColorSelect,
}: RightPanelProps) {
  const { t, i18n } = useTranslation()

  const tagCounts = useMemo(() => {
    const map = new Map<string, number>()

    notes.forEach((item) => {
      item.tags.forEach((tag) => {
        map.set(tag, (map.get(tag) ?? 0) + 1)
      })
    })

    return Array.from(map.entries()).sort((left, right) =>
      left[0].localeCompare(right[0]),
    )
  }, [notes])

  return (
    <aside className="flex h-full w-[200px] shrink-0 flex-col border-l border-border bg-[#0f0f0f]">
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <section className="mb-5">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t('note.colorLabel')}
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {NOTE_COLOR_SWATCHES.map((swatch) => {
              const selected = note?.color === swatch

              return (
                <button
                  key={swatch}
                  type="button"
                  className={`h-8 rounded-md border transition ${
                    selected
                      ? 'border-white/50 ring-1 ring-white/35'
                      : 'border-border hover:border-focus'
                  }`}
                  style={{ backgroundColor: swatch }}
                  onClick={() => onColorSelect(selected ? undefined : swatch)}
                  aria-label={`${t('note.colorLabel')}: ${swatch}`}
                  aria-pressed={selected}
                />
              )
            })}
          </div>
        </section>

        <section className="mb-5">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t('rightPanel.filterTags')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {tagCounts.length ? (
              tagCounts.map(([tag, count]) => (
                <TagPill
                  key={tag}
                  tag={`${tag} · ${count}`}
                  compact
                  active={activeTag === tag}
                  onClick={() => onTagClick(activeTag === tag ? null : tag)}
                />
              ))
            ) : (
              <p className="text-xs text-text-secondary">{t('rightPanel.noTags')}</p>
            )}
          </div>
        </section>

        <section className="mb-5">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t('rightPanel.info')}
          </h2>
          <div className="grid gap-2 rounded-md border border-border bg-[#111111] p-3 text-xs text-text-secondary">
            <div className="flex items-center justify-between gap-3">
              <span>{t('rightPanel.createdAt')}</span>
              <span className="text-right text-text-primary">
                {note
                  ? format(new Date(note.created_at), 'dd/MM/yyyy HH:mm', {
                      locale: getDateFnsLocale(i18n.language),
                    })
                  : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>{t('rightPanel.words')}</span>
              <span className="text-text-primary">
                {note ? wordCount(note.content) : 0}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>{t('note.priorityLabel')}</span>
              <PriorityDot
                priority={note?.priority}
                label={note ? t(`priority.${note.priority ?? 'media'}`) : '—'}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>{t('note.checklistTitle')}</span>
              <span className="text-text-primary">
                {note?.checklist?.length
                  ? `${note.checklist.filter((item) => item.done).length}/${note.checklist.length}`
                  : '0/0'}
              </span>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t('rightPanel.shortcuts')}
          </h2>
          <div className="grid gap-2 rounded-md border border-border bg-[#111111] p-3 text-[11px] text-text-secondary">
            {[
              { key: 'Ctrl+N', label: t('commands.newNote') },
              { key: 'Ctrl+S', label: t('common.save') },
              { key: 'Ctrl+K', label: t('commands.commandPalette') },
              { key: 'Ctrl+F', label: t('titlebar.search') },
              { key: 'Ctrl+`', label: t('terminal.toggle') },
              { key: 'Ctrl+Enter', label: t('terminal.run') },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-3">
                <span className="text-text-primary">{item.key}</span>
                <span className="text-right">{item.label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </aside>
  )
}
