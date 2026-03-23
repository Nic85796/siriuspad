import { Cloud, GitBranch, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { APP_VERSION } from '@/lib/constants'
import { performFullGitSync } from '@/lib/git'
import { useSettingsStore } from '@/store/settings'
import { useUiStore } from '@/store/ui'
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
  const isMobile = useUiStore((state) => state.platform === 'android' || state.platform === 'ios')
  const syncStatus = useUiStore((state) => state.syncStatus)
  const { t } = useTranslation()
  const settings = useSettingsStore((state) => state.settings)
  const pushToast = useUiStore((state) => state.pushToast)
  const [isSyncing, setIsSyncing] = useState(false)
  
  const hasCloudSync = !!settings.supabaseUrl && !!settings.supabaseAnonKey
  const hasGitUrl = !!settings.gitRepoUrl

  const handleGitSync = async () => {
    if (isSyncing) return
    setIsSyncing(true)

    const res = await performFullGitSync()
    
    if (res.success) {
      pushToast({
        kind: 'success',
        title: t('statusBar.gitSyncSuccess'),
      })
    } else {
      pushToast({
        kind: 'error',
        title: t(`statusBar.gitSyncError_${res.errorKey}`),
        description: res.detail,
      })
    }

    setIsSyncing(false)
  }

  return (
    <footer className="relative z-20 flex min-h-[22px] shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-t border-border bg-surface px-3 py-1 text-[10px] uppercase tracking-wide text-text-secondary sm:text-[11px]">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 overflow-hidden">
        <span className="truncate">
          {isMobile ? note?.title || t('common.untitled') : `${t('statusBar.workspace')}: ${note?.workspace ?? t('common.none')}`}
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
              className={`inline-flex items-center gap-1 transition-colors ${
                syncStatus === 'error' ? 'text-red' :
                syncStatus === 'syncing' ? 'text-accent font-bold' :
                syncStatus === 'synced' ? 'text-green' :
                'hover:text-text-primary'
              }`}
              title={t('statusBar.cloudSync')}
            >
              <Cloud 
                size={12} 
                className={syncStatus === 'syncing' ? 'animate-pulse' : ''} 
              />
              <span className={isMobile ? 'hidden sm:inline' : 'inline'}>
                {syncStatus === 'syncing' ? t('statusBar.saving') : t('statusBar.cloudSync')}
              </span>
            </span>
          </>
        )}
        {(!isMobile && hasGitUrl) || isSyncing ? (
          <>
            <Separator />
            <button
              type="button"
              onClick={() => void handleGitSync()}
              disabled={isSyncing}
              className={`inline-flex items-center gap-1 transition-colors ${isSyncing ? 'text-accent font-bold cursor-wait' : 'hover:text-text-primary'}`}
              title={t('statusBar.gitSync')}
            >
              {isSyncing ? (
                <RefreshCw size={12} className="animate-spin" />
              ) : (
                <GitBranch size={12} />
              )}
              <span className={isMobile ? 'hidden sm:inline' : 'inline'}>
                {isSyncing ? t('statusBar.gitSyncing') : t('statusBar.gitSync')}
              </span>
            </button>
          </>
        ) : null}
        {!isMobile && cursorInfo ? (
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
