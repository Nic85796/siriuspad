type LogKind = 'log' | 'warn' | 'error' | 'info'

export interface LogEntry {
  id: string
  kind: LogKind
  message: string
  timestamp: string
}

let logs: LogEntry[] = []
let listeners: ((logs: LogEntry[]) => void)[] = []

const MAX_LOGS = 200

function stringifyArg(arg: unknown) {
  if (typeof arg === 'object' && arg !== null) {
    try {
      return JSON.stringify(arg, null, 2)
    } catch {
      return '[unserializable object]'
    }
  }

  return String(arg)
}

function notify() {
  listeners.forEach((listener) => listener([...logs]))
}

/**
 * Intercepts the global console object to capture logs for the internal DevTools.
 */
export function initLogger() {
  const originalLog = console.log
  const originalWarn = console.warn
  const originalError = console.error
  const originalInfo = console.info

  const addLog = (kind: LogKind, ...args: unknown[]) => {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      kind,
      message: args.map(stringifyArg).join(' '),
      timestamp: new Date().toLocaleTimeString(),
    }

    logs = [entry, ...logs].slice(0, MAX_LOGS)
    notify()
  }

  console.log = (...args) => {
    originalLog(...args)
    addLog('log', ...args)
  }
  console.warn = (...args) => {
    originalWarn(...args)
    addLog('warn', ...args)
  }
  console.error = (...args) => {
    originalError(...args)
    addLog('error', ...args)
  }
  console.info = (...args) => {
    originalInfo(...args)
    addLog('info', ...args)
  }
}

export function subscribeLogs(listener: (logs: LogEntry[]) => void) {
  listeners.push(listener)
  listener([...logs])
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

export function clearLogs() {
  logs = []
  notify()
}

export function getLogs() {
  return [...logs]
}
