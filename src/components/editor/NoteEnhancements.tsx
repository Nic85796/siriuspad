import { Check, Lightbulb, NotebookText, Plus, ShieldAlert, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { withAlpha } from '@/lib/color'
import type { ChecklistItem, Note } from '@/types'

type CalloutTemplateTone = 'note' | 'tip' | 'warning' | 'danger'

interface NoteEnhancementsProps {
  note: Note
  onChecklistChange: (checklist: ChecklistItem[]) => void
  onInsertCallout: (tone: CalloutTemplateTone) => void
}

function createChecklistItem(text: string): ChecklistItem {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text,
    done: false,
  }
}

export function NoteEnhancements({
  note,
  onChecklistChange,
  onInsertCallout,
}: NoteEnhancementsProps) {
  const { t } = useTranslation()
  const [newItem, setNewItem] = useState('')
  const checklist = note.checklist ?? []
  const doneCount = checklist.filter((item) => item.done).length
  const accentBackground = withAlpha(note.color, 0.09)
  const accentBorder = note.color ?? 'var(--border)'
  const accentSoft = withAlpha(note.color, 0.14)

  const addItem = () => {
    const text = newItem.trim()
    if (!text) {
      return
    }

    onChecklistChange([...checklist, createChecklistItem(text)])
    setNewItem('')
  }

  return (
    <section
      className="border-b border-border bg-[#101010] px-4 py-3"
      style={{
        backgroundImage: accentBackground
          ? `linear-gradient(180deg, ${accentBackground}, transparent 70%)`
          : undefined,
      }}
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <div
          className="rounded-md border bg-[#111111] p-3"
          style={{
            borderColor: accentBorder,
            boxShadow: accentSoft ? `inset 3px 0 0 ${accentBorder}` : undefined,
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t('note.checklistTitle')}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                {t('note.checklistHint')}
              </p>
            </div>
            <span
              className="rounded-md border px-2 py-1 text-[11px] text-text-primary"
              style={{
                borderColor: accentBorder,
                backgroundColor: accentSoft ?? '#161616',
              }}
            >
              {doneCount}/{checklist.length || 0}
            </span>
          </div>

          <div className="mt-3 grid gap-2">
            {checklist.length ? (
              checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-md border border-border bg-[#0f0f0f] px-2 py-2"
                >
                  <button
                    type="button"
                    className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                      item.done
                        ? 'border-transparent text-black'
                        : 'border-border bg-[#111111] text-transparent hover:border-focus'
                    }`}
                    style={{
                      backgroundColor: item.done ? note.color ?? 'var(--accent)' : undefined,
                    }}
                    onClick={() =>
                      onChecklistChange(
                        checklist.map((entry) =>
                          entry.id === item.id
                            ? { ...entry, done: !entry.done }
                            : entry,
                        ),
                      )
                    }
                    aria-label={item.done ? t('note.checklistMarkPending') : t('note.checklistMarkDone')}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>

                  <span
                    className={`min-w-0 flex-1 text-sm ${
                      item.done ? 'text-text-secondary line-through' : 'text-text-primary'
                    }`}
                  >
                    {item.text}
                  </span>

                  <button
                    type="button"
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-[#111111] text-text-secondary transition hover:border-[#4a2020] hover:bg-[#2d1515] hover:text-[#f87171]"
                    onClick={() =>
                      onChecklistChange(checklist.filter((entry) => entry.id !== item.id))
                    }
                    aria-label={t('note.checklistRemove')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-border bg-[#0f0f0f] px-3 py-4 text-sm text-text-secondary">
                {t('note.checklistEmpty')}
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              className="h-9 min-w-[220px] flex-1 rounded-md border border-border bg-[#0f0f0f] px-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-focus"
              placeholder={t('note.checklistPlaceholder')}
              value={newItem}
              onChange={(event) => setNewItem(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addItem()
                }
              }}
            />
            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-[#161616] px-3 text-sm text-text-primary transition hover:border-focus hover:bg-hover"
              onClick={addItem}
            >
              <Plus className="h-4 w-4" />
              {t('note.checklistAdd')}
            </button>
          </div>
        </div>

        <div className="rounded-md border border-border bg-[#111111] p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t('note.calloutsTitle')}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                {t('note.calloutsHint')}
              </p>
            </div>
            <span className="rounded-md border border-[#2d2060] bg-[rgba(124,58,237,0.12)] px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-[#c4b5fd]">
              &gt; [!TIP]
            </span>
          </div>

          <div className="mt-3 grid gap-2">
            {[
              {
                key: 'note' as const,
                label: t('note.calloutNote'),
                hint: t('note.calloutNoteHint'),
                icon: NotebookText,
              },
              {
                key: 'tip' as const,
                label: t('note.calloutTip'),
                hint: t('note.calloutTipHint'),
                icon: Lightbulb,
              },
              {
                key: 'warning' as const,
                label: t('note.calloutWarning'),
                hint: t('note.calloutWarningHint'),
                icon: ShieldAlert,
              },
            ].map((item) => {
              const Icon = item.icon

              return (
                <button
                  key={item.key}
                  type="button"
                  className="flex items-start gap-3 rounded-md border border-border bg-[#0f0f0f] px-3 py-3 text-left transition hover:border-focus hover:bg-hover"
                  onClick={() => onInsertCallout(item.key)}
                >
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-[#161616] text-text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-text-primary">{item.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-text-secondary">
                      {item.hint}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          <p className="mt-3 text-xs leading-6 text-text-secondary">
            {t('note.calloutsFooter')}
          </p>
        </div>
      </div>
    </section>
  )
}
