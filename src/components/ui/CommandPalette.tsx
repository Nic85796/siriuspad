import { Command } from 'cmdk'
import { Search, X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

import type { CommandItem } from '@/types'
import { useUiStore } from '@/store/ui'

interface CommandPaletteProps {
  open: boolean
  commands: CommandItem[]
  commandHistory: string[]
  onOpenChange: (open: boolean) => void
  onCommandRun: (commandId: string) => Promise<void>
}

export function CommandPalette({
  open,
  commands,
  commandHistory,
  onOpenChange,
  onCommandRun,
}: CommandPaletteProps) {
  const { t } = useTranslation()
  const uiState = useUiStore()
  const isMobile = uiState.platform === 'android' || uiState.platform === 'ios'

  useEffect(() => {
    if (!open) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onOpenChange])

  if (!open || typeof document === 'undefined') {
    return null
  }

  const recents = commandHistory
    .map((id) => commands.find((command) => command.id === id))
    .filter((command): command is CommandItem => Boolean(command))
  const recentIds = new Set(recents.map((command) => command.id))
  const grouped = commands
    .filter((command) => !recentIds.has(command.id))
    .reduce<Record<string, CommandItem[]>>((accumulator, command) => {
      accumulator[command.group] ??= []
      accumulator[command.group].push(command)
      return accumulator
    }, {})

  const runCommand = async (command: CommandItem) => {
    await command.perform()
    await onCommandRun(command.id)
    onOpenChange(false)
  }

  return createPortal(
    <div
      className={`fixed inset-0 z-[60] flex items-start justify-center bg-black/70 backdrop-blur-sm ${
        isMobile ? 'p-0' : 'px-4 pt-24'
      }`}
      onMouseDown={() => onOpenChange(false)}
    >
      <div
        className={`overflow-hidden border-border bg-surface ${
          isMobile ? 'h-full w-full rounded-none' : 'w-full max-w-2xl rounded-xl border shadow-2xl'
        }`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <Command
          loop
          label={t('commands.commandPalette')}
          className="overflow-hidden"
        >
          <div className="border-b border-border px-4 py-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">
                  {t('commands.commandPalette')}
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  {t('searchPanel.commandHelp')}
                </p>
              </div>
              {isMobile ? (
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-hover text-text-secondary active:scale-95"
                  aria-label={t('common.close')}
                >
                  <X size={16} />
                </button>
              ) : (
                <span className="rounded-md border border-border bg-elevated px-2 py-1 text-[11px] text-text-secondary">
                  Ctrl+K
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-base px-3 py-3 focus-within:border-accent">
              <Search className="h-4 w-4 text-text-secondary" />
              <Command.Input
                autoFocus
                placeholder={t('searchPanel.placeholder')}
                className="w-full bg-transparent text-base sm:text-sm text-text-primary outline-none placeholder:text-text-muted"
              />
            </div>
          </div>
          <Command.List className={`${isMobile ? 'max-h-none flex-1' : 'max-h-[60vh]'} overflow-y-auto p-2`}>
            <Command.Empty className="px-3 py-6 text-sm text-text-secondary">
              {t('searchPanel.empty')}
            </Command.Empty>

            {recents.length ? (
              <Command.Group heading={t('searchPanel.recent')} className="command-group">
                {recents.map((command) => (
                  <Command.Item
                    key={command.id}
                    value={[command.label, command.keywords?.join(' ')]
                      .filter(Boolean)
                      .join(' ')}
                    className="command-item"
                    onSelect={() => void runCommand(command)}
                  >
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm text-text-primary">
                          {command.label}
                        </div>
                        {command.description ? (
                          <div className="mt-1 truncate text-xs text-text-secondary">
                            {command.description}
                          </div>
                        ) : null}
                      </div>
                      {command.shortcut ? (
                        <span className="shrink-0 rounded-md border border-border bg-elevated px-2 py-1 text-[11px] text-text-secondary">
                          {command.shortcut}
                        </span>
                      ) : null}
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            {Object.entries(grouped).map(([group, groupCommands]) =>
              groupCommands.length ? (
                <Command.Group key={group} heading={group} className="command-group">
                  {groupCommands.map((command) => (
                    <Command.Item
                      key={command.id}
                      value={[command.label, command.keywords?.join(' ')]
                        .filter(Boolean)
                        .join(' ')}
                      className="command-item"
                      onSelect={() => void runCommand(command)}
                    >
                      <div className="flex min-w-0 items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm text-text-primary">
                            {command.label}
                          </div>
                          {command.description ? (
                            <div className="mt-1 truncate text-xs text-text-secondary">
                              {command.description}
                            </div>
                          ) : null}
                        </div>
                        {command.shortcut ? (
                          <span className="shrink-0 rounded-md border border-border bg-elevated px-2 py-1 text-[11px] text-text-secondary">
                            {command.shortcut}
                          </span>
                        ) : null}
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : null,
            )}
          </Command.List>
          
          {!isMobile && (
            <div className="flex items-center justify-between gap-3 border-t border-border bg-base px-4 py-3 text-[11px] text-text-secondary">
              <span>{t('searchPanel.hints.navigate')}</span>
              <span>{t('searchPanel.hints.execute')}</span>
              <span>{t('searchPanel.hints.close')}</span>
            </div>
          )}
        </Command>
      </div>
    </div>,
    document.body,
  )
}
