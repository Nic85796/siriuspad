import { Plus, Search, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useUiStore } from '@/store/ui'

interface MobileFABProps {
  onCreateNote: () => Promise<void>
  onOpenAi: () => void
}

export function MobileFAB({ onCreateNote, onOpenAi }: MobileFABProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const { setCommandPaletteOpen } = useUiStore()

  const toggleOpen = () => setIsOpen(!isOpen)

  const handleAction = (action: () => void | Promise<void>) => {
    setIsOpen(false)
    void action()
  }

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3 md:hidden">
      {/* Action Menu */}
      {isOpen && (
        <div className="flex flex-col items-end gap-3 pb-2 motion-fade-up">
          <button
            onClick={() => handleAction(() => setCommandPaletteOpen(true))}
            className="flex items-center gap-3 rounded-full border border-border bg-elevated px-4 py-2.5 shadow-lg active:scale-95"
          >
            <span className="text-sm font-medium text-text-primary">{t('commands.title')}</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-accent">
              <Search size={20} />
            </div>
          </button>

          <button
            onClick={() => handleAction(onOpenAi)}
            className="flex items-center gap-3 rounded-full border border-border bg-elevated px-4 py-2.5 shadow-lg active:scale-95"
          >
            <span className="text-sm font-medium text-text-primary">Sirius AI</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-accent">
              <Sparkles size={20} />
            </div>
          </button>

          <button
            onClick={() => handleAction(onCreateNote)}
            className="flex items-center gap-3 rounded-full border border-border bg-elevated px-4 py-2.5 shadow-lg active:scale-95"
          >
            <span className="text-sm font-medium text-text-primary">{t('sidebar.newNote')}</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white">
              <Plus size={20} />
            </div>
          </button>
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={toggleOpen}
        className={`flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all active:scale-90 ${
          isOpen ? 'bg-surface text-text-primary border border-border rotate-90' : 'bg-accent text-white'
        }`}
        aria-label="Abrir menu de ações"
      >
        {isOpen ? <X size={24} /> : <Plus size={24} />}
      </button>

      {/* Backdrop for closing */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[-1] bg-black/20 backdrop-blur-[2px]" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
