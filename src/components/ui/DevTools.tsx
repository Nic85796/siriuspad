import { useEffect, useState, useRef, useCallback, type ReactNode } from 'react'
import { 
  Terminal, 
  Trash2, 
  X, 
  ChevronRight, 
  ChevronDown,
  AlertTriangle,
  AlertCircle,
  GripHorizontal,
  RefreshCw,
  Search,
  Eraser
} from 'lucide-react'

import { subscribeLogs, clearLogs, type LogEntry } from '@/lib/logger'
import { useSettingsStore } from '@/store/settings'
import { useNotesStore } from '@/store/notes'

interface DevToolsProps {
  open: boolean
  onClose: () => void
}

type FilterLevel = 'all' | 'error' | 'warn' | 'info'

interface PerformanceWithMemory extends Performance {
  memory?: {
    usedJSHeapSize: number
  }
}

function maskSecret(value: string) {
  if (!value) {
    return ''
  }

  if (value.length <= 8) {
    return '••••••••'
  }

  return `${value.slice(0, 4)}••••${value.slice(-4)}`
}

export function DevTools({ open, onClose }: DevToolsProps) {
  const [activeTab, setActiveTab] = useState<'console' | 'application'>('console')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filter, setFilter] = useState<FilterLevel>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [uptimeSeconds, setUptimeSeconds] = useState(0)
  const { settings } = useSettingsStore()
  const { activeNoteId } = useNotesStore()
  
  // Floating Window State
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!open) return
    return subscribeLogs(setLogs)
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    const startedAt = performance.now()

    const interval = window.setInterval(() => {
      setUptimeSeconds(Math.floor((performance.now() - startedAt) / 1000))
    }, 1000)

    return () => {
      window.clearInterval(interval)
    }
  }, [open])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true)
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    }
  }, [position])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y
      })
    }
    const handleMouseUp = () => setIsDragging(false)

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  if (!open) return null

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'all' || log.kind === filter
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const clearAppStorage = () => {
    if (confirm('Deseja realmente limpar o LocalStorage? Isso pode deslogar e resetar configurações.')) {
      localStorage.clear()
      window.location.reload()
    }
  }

  const performanceWithMemory = performance as PerformanceWithMemory
  const visibleSettings = {
    ...settings,
    githubToken: maskSecret(settings.githubToken),
    aiApiKey: maskSecret(settings.aiApiKey),
    supabaseAnonKey: maskSecret(settings.supabaseAnonKey || ''),
  }

  return (
    <div 
      className="fixed z-[9999] flex flex-col overflow-hidden rounded-lg border border-[#333] bg-[#0c0c0c] shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-shadow duration-200"
      style={{ 
        left: position.x, 
        top: position.y, 
        width: '700px', 
        height: '450px',
        boxShadow: isDragging ? '0 30px 60px rgba(0,0,0,0.7)' : undefined
      }}
    >
      {/* Header / Drag Bar */}
      <div 
        onMouseDown={handleMouseDown}
        className="flex cursor-move items-center justify-between border-b border-[#222] bg-[#1a1a1a] px-3 py-1.5"
      >
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#888]">
          <Terminal size={12} className="text-accent" />
          SiriusPad Inspect
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={onClose}
            className="rounded p-1 text-[#666] hover:bg-red/10 hover:text-red transition"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Toolbar / Tabs */}
      <div className="flex items-center gap-1 border-b border-[#222] bg-[#141414] px-1 h-9">
        <button
          onClick={() => setActiveTab('console')}
          className={`px-3 py-1 text-[11px] font-medium transition ${
            activeTab === 'console' ? 'text-accent border-b border-accent bg-[#1a1a1a]' : 'text-[#888] hover:text-text-primary'
          }`}
        >
          Console
        </button>
        <button
          onClick={() => setActiveTab('application')}
          className={`px-3 py-1 text-[11px] font-medium transition ${
            activeTab === 'application' ? 'text-accent border-b border-accent bg-[#1a1a1a]' : 'text-[#888] hover:text-text-primary'
          }`}
        >
          Application
        </button>
        
        <div className="mx-2 h-4 w-px bg-[#333]" />
        
        {activeTab === 'console' && (
          <div className="flex items-center gap-1 flex-1">
            <div className="relative group">
              <div className="flex items-center gap-1 px-2 py-1 text-[10px] text-accent font-bold cursor-pointer hover:bg-[#222] rounded transition">
                {filter === 'all' && 'All Levels'}
                {filter === 'error' && 'Errors'}
                {filter === 'warn' && 'Warnings'}
                {filter === 'info' && 'Info'}
                <ChevronDown size={10} />
              </div>
              <div className="absolute top-full left-0 mt-1 hidden group-hover:block w-32 bg-[#1a1a1a] border border-[#333] rounded shadow-xl z-10 overflow-hidden">
                {(['all', 'error', 'warn', 'info'] as FilterLevel[]).map(level => (
                  <div 
                    key={level}
                    onClick={() => setFilter(level)}
                    className={`px-3 py-1.5 text-[10px] cursor-pointer transition hover:bg-accent hover:text-white ${
                      filter === level ? 'bg-[#222] text-accent' : 'text-[#aaa]'
                    }`}
                  >
                    {level === 'all' ? 'All Levels' : level.charAt(0).toUpperCase() + level.slice(1)}
                  </div>
                ))}
              </div>
            </div>
            <div className="relative flex-1 max-w-[150px]">
              <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#555]" />
              <input 
                type="text"
                placeholder="Filter messages"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#080808] border border-[#222] rounded px-6 py-0.5 text-[10px] text-text-primary outline-none focus:border-accent/40"
              />
            </div>
            <button
              onClick={clearLogs}
              className="ml-auto p-1.5 text-[#666] hover:text-text-primary"
              title="Clear console"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}

        {activeTab === 'application' && (
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-[#888] hover:text-white transition"
            >
              <RefreshCw size={11} />
              Reload
            </button>
            <button
              onClick={clearAppStorage}
              className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-red/70 hover:text-red transition"
            >
              <Eraser size={11} />
              Clear Storage
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-[#0a0a0a] font-mono scrollbar-technical">
        {activeTab === 'console' ? (
          <div className="flex flex-col">
            {filteredLogs.map((log) => (
              <div 
                key={log.id} 
                className={`group flex items-start gap-2 border-b border-[#111] px-3 py-1 text-[11px] leading-relaxed transition ${
                  log.kind === 'error' ? 'bg-red/5 text-red/90' : 
                  log.kind === 'warn' ? 'bg-yellow/5 text-yellow/90' : 
                  'text-[#ccc] hover:bg-[#111]'
                }`}
              >
                <span className="mt-1 opacity-40 shrink-0">
                  {log.kind === 'error' ? <AlertCircle size={10} /> : 
                   log.kind === 'warn' ? <AlertTriangle size={10} /> : 
                   <ChevronRight size={10} />}
                </span>
                <div className="flex-1 whitespace-pre-wrap break-words">
                  {log.message}
                </div>
                <div className="text-[9px] opacity-20 group-hover:opacity-60 whitespace-nowrap">
                  {log.timestamp}
                </div>
              </div>
            ))}
            {filteredLogs.length === 0 && (
              <div className="flex h-40 items-center justify-center text-[11px] text-[#444] italic">
                No logs to display
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <TechnicalJson 
              title="System Settings" 
              data={visibleSettings} 
              icon={<ChevronDown size={14} className="text-blue-400" />}
            />
            <TechnicalJson 
              title="Runtime Context" 
              data={{
                activeNoteId,
                uptime: `${uptimeSeconds}s`,
                memory: performanceWithMemory.memory
                  ? `${Math.round(performanceWithMemory.memory.usedJSHeapSize / 1048576)}MB`
                  : 'N/A'
              }} 
              icon={<ChevronDown size={14} className="text-green-400" />}
            />
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[#222] bg-[#141414] px-2 py-0.5 text-[9px] text-[#555]">
        <div className="flex gap-3">
          <span>Items: {filteredLogs.length}</span>
          <span>Errors: {logs.filter(l => l.kind === 'error').length}</span>
        </div>
        <div className="flex items-center gap-1 opacity-50">
          <GripHorizontal size={10} />
          <span>F12 to close</span>
        </div>
      </div>
    </div>
  )
}

function TechnicalJson({ title, data, icon }: { title: string, data: unknown, icon: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  
  return (
    <div className="border border-[#222] rounded bg-[#080808] overflow-hidden">
      <div 
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 px-2 py-1 bg-[#111] border-b border-[#222] cursor-pointer hover:bg-[#161616]"
      >
        {collapsed ? <ChevronRight size={14} /> : icon}
        <span className="text-[10px] font-bold text-[#888] uppercase tracking-wider">{title}</span>
      </div>
      {!collapsed && (
        <div className="p-2 overflow-x-auto">
          <pre className="text-[10px] text-accent/80 leading-normal">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
