import { Cloud } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { APP_VERSION } from '@/lib/constants'
import { useSettingsStore } from '@/store/settings'
import type { CursorInfo, Note, SaveStatus } from '@/types'

interface StatusBarProps {
  note: Note | null
  saveStatus: SaveStatus
  cursorInfo: CursorInfo | null
}

const statusColor: Record<SaveStatus, string> = {
  saved: 'bg-text-muted',
  dirty: 'bg-red',
  saving: 'bg-yellow',
  error: 'bg-red',
}

function Separator() {
  return <span className="text-text-muted/60">|</span>
}

export function StatusBar({ note, saveStatus, cursorInfo }: StatusBarProps) {
  const { t } = useTranslation()
  const settings = useSettingsStore((state) => state.settings)
  
  const hasCloudSync = !!settings.supabaseUrl && !!settings.supabaseAnonKey

  return (
    <footer className="relative z-20 flex min-h-[22px] shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-t border-border bg-surface px-3 py-1 text-[10px] uppercase tracking-wide text-text-secondary sm:text-[11px]">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 overflow-hidden">
        <span className="truncate">
          {t('statusBar.workspace')}: {note?.workspace ?? t('common.none')}
        </span>
        <Separator />
        <span>{note?.language ?? t('common.none')}</span>
        <Separator />
        <span className="inline-flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${statusColor[saveStatus]}`} />
          {t(`statusBar.${saveStatus === 'dirty' ? 'unsaved' : saveStatus}`)}
        </span>
        {hasCloudSync && (
          <>
            <Separator />
            <span
              className="inline-flex items-center gap-1 text-accent"
              title={t('statusBar.cloudSync')}
            >
              <Cloud size={10} />
              {t('statusBar.cloudSync')}
            </span>
          </>
        )}
        {cursorInfo ? (
          <>
            <Separator />
            <span>{t('statusBar.line', { line: cursorInfo.line })}</span>
            <Separator />
            <span>{t('statusBar.column', { col: cursorInfo.col })}</span>
            <Separator />
            <span>{t('statusBar.words', { count: cursorInfo.wordCount })}</span>
            <Separator />
            <span>{t('statusBar.chars', { count: cursorInfo.charCount })}</span>
          </>
        ) : null}
      </div>
      <span className="ml-auto shrink-0">{APP_VERSION}</span>
    </footer>
  )
}
