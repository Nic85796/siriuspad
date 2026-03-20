import {
  Check,
  Lightbulb,
  NotebookText,
  Plus,
  ShieldAlert,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { withAlpha } from '@/lib/color'
import type { ChecklistItem, Note } from '@/types'

type CalloutTone = 'note' | 'tip' | 'warning'

interface NoteBlocksProps {
  note: Note
  onNoteChange: (patch: Partial<Note>) => void
  onInsertCallout: (input: { tone: CalloutTone; title?: string }) => void
}

function createChecklistItem(text: string): ChecklistItem {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text,
    done: false,
  }
}

function panelInputClassName() {
  return 'h-9 w-full rounded-md border border-border bg-[#101010] px-3 text-sm text-text-primary outline-none placeholder:text-text-muted transition focus:border-focus'
}

export function NoteBlocks({
  note,
  onNoteChange,
  onInsertCallout,
}: NoteBlocksProps) {
  const { t } = useTranslation()
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [calloutTitle, setCalloutTitle] = useState('')

  const checklist = note.checklist ?? []
  const checklistDoneCount = checklist.filter((item) => item.done).length
  const sectionTint = note.color ? withAlpha(note.color, 0.08) : undefined

  const updateChecklist = (nextChecklist: ChecklistItem[]) => {
    onNoteChange({ checklist: nextChecklist })
  }

  const addChecklistItem = () => {
    const text = newChecklistItem.trim()
    if (!text) {
      return
    }

    updateChecklist([...checklist, createChecklistItem(text)])
    setNewChecklistItem('')
  }

  return (
    <section
      className="border-t border-border bg-[#0d0d0d] px-4 py-3"
      style={{
        backgroundImage: sectionTint
          ? `linear-gradient(180deg, ${sectionTint}, transparent 70%)`
          : undefined,
      }}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t('note.blocksTitle')}
          </h2>
          <p className="mt-1 text-xs leading-6 text-text-secondary">
            {t('note.blocksHint')}
          </p>
        </div>
        <span
          className="rounded-md border px-2.5 py-1 text-[11px] text-text-primary"
          style={{
            borderColor: note.color ?? 'var(--border)',
            backgroundColor: withAlpha(note.color, 0.14) ?? '#161616',
          }}
        >
          {checklistDoneCount}/{checklist.length}
        </span>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <div className="motion-fade-up surface-hover rounded-lg border border-border bg-[#111111] p-3">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">
                {t('note.checklistTitle')}
              </h3>
              <p className="mt-1 text-xs leading-6 text-text-secondary">
                {t('note.checklistHint')}
              </p>
            </div>
            <span
              className="rounded-md border px-2 py-1 text-[11px] text-text-primary"
              style={{
                borderColor: note.color ?? 'var(--border)',
                backgroundColor: withAlpha(note.color, 0.14) ?? '#161616',
              }}
            >
              {checklistDoneCount}/{checklist.length}
            </span>
          </div>

          <div className="grid gap-2">
            {checklist.length ? (
              checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-md border border-border bg-[#0f0f0f] px-2 py-2 transition hover:border-focus"
                >
                  <button
                    type="button"
                    className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                      item.done
                        ? 'border-transparent text-black'
                        : 'border-border bg-[#111111] text-transparent hover:border-focus'
                    }`}
                    style={{
                      backgroundColor: item.done
                        ? note.color ?? 'var(--accent)'
                        : undefined,
                    }}
                    onClick={() =>
                      updateChecklist(
                        checklist.map((entry) =>
                          entry.id === item.id
                            ? { ...entry, done: !entry.done }
                            : entry,
                        ),
                      )
                    }
                    aria-label={
                      item.done
                        ? t('note.checklistMarkPending')
                        : t('note.checklistMarkDone')
                    }
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>

                  <input
                    className={`min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-text-muted ${
                      item.done ? 'text-text-secondary line-through' : 'text-text-primary'
                    }`}
                    value={item.text}
                    onChange={(event) =>
                      updateChecklist(
                        checklist.map((entry) =>
                          entry.id === item.id
                            ? { ...entry, text: event.target.value }
                            : entry,
                        ),
                      )
                    }
                    placeholder={t('note.checklistPlaceholder')}
                  />

                  <button
                    type="button"
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-[#111111] text-text-secondary transition hover:border-[#4a2020] hover:bg-[#2d1515] hover:text-[#f87171]"
                    onClick={() =>
                      updateChecklist(
                        checklist.filter((entry) => entry.id !== item.id),
                      )
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

          <div className="mt-3 flex gap-2">
            <input
              className={panelInputClassName()}
              placeholder={t('note.checklistPlaceholder')}
              value={newChecklistItem}
              onChange={(event) => setNewChecklistItem(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addChecklistItem()
                }
              }}
            />
            <button
              type="button"
              className="interactive-lift inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-border bg-[#161616] px-3 text-sm text-text-primary transition hover:border-focus hover:bg-hover"
              onClick={addChecklistItem}
            >
              <Plus className="h-4 w-4" />
              {t('note.checklistAdd')}
            </button>
          </div>
        </div>

        <div
          className="motion-fade-up surface-hover rounded-lg border border-border bg-[#111111] p-3"
          style={{ animationDelay: '70ms' }}
        >
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-text-primary">
              {t('note.calloutsTitle')}
            </h3>
            <p className="mt-1 text-xs leading-6 text-text-secondary">
              {t('note.calloutsHint')}
            </p>
          </div>

          <input
            className={`${panelInputClassName()} mb-3`}
            placeholder={t('rightPanel.calloutTitlePlaceholder')}
            value={calloutTitle}
            onChange={(event) => setCalloutTitle(event.target.value)}
          />

          <div className="grid gap-2">
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
                  className="interactive-lift flex items-start gap-3 rounded-md border border-border bg-[#0f0f0f] px-3 py-3 text-left transition hover:border-focus hover:bg-hover"
                  onClick={() => {
                    onInsertCallout({
                      tone: item.key,
                      title: calloutTitle.trim() || undefined,
                    })
                    setCalloutTitle('')
                  }}
                >
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-[#161616] text-text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-text-primary">
                      {item.label}
                    </span>
                    <span className="mt-1 block text-xs leading-6 text-text-secondary">
                      {item.hint}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-3 rounded-md border border-border bg-[#0f0f0f] px-3 py-3 text-xs leading-6 text-text-secondary">
            {t('note.calloutsFooter')}
          </div>
        </div>
      </div>
    </section>
  )
}
