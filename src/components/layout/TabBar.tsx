import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { withAlpha } from '@/lib/color'
import type { NoteTab } from '@/types'

interface TabBarProps {
  tabs: NoteTab[]
  activeTabId: string | null
  onTabClick: (id: string) => Promise<void>
  onTabClose: (id: string) => Promise<void>
}

export function TabBar({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
}: TabBarProps) {
  const { t } = useTranslation()

  if (!tabs.length) {
    return null
  }

  return (
    <div className="border-b border-border bg-[#0f0f0f]">
      <div className="flex h-8 overflow-x-auto px-2">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId

          return (
            <div
              key={tab.id}
              className={`group inline-flex h-full min-w-0 shrink-0 cursor-pointer items-center gap-2 border-r border-border px-3 text-[12px] transition ${
                isActive
                  ? 'bg-[#161616] text-text-primary'
                  : 'bg-transparent text-text-secondary hover:bg-hover hover:text-text-primary'
              }`}
              style={{
                boxShadow: tab.color ? `inset 0 -2px 0 ${tab.color}` : undefined,
                backgroundImage:
                  isActive && withAlpha(tab.color, 0.08)
                    ? `linear-gradient(180deg, ${withAlpha(tab.color, 0.08)}, transparent 70%)`
                    : undefined,
              }}
              title={t('note.open', { title: tab.title })}
              onClick={() => void onTabClick(tab.id)}
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                {tab.color ? (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: tab.color }}
                  />
                ) : null}
                {tab.isDirty ? <span className="text-red">●</span> : null}
                <span className="max-w-[160px] truncate">{tab.title}</span>
              </span>
              <button
                type="button"
                className="rounded p-0.5 text-text-muted transition hover:bg-hover hover:text-text-primary"
                title={t('commands.closeNote')}
                onClick={(event) => {
                  event.stopPropagation()
                  void onTabClose(tab.id)
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
