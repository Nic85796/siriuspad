import type { LucideIcon } from 'lucide-react'
import {
  BrainCircuit,
  Bug,
  Code2,
  Database,
  FolderCode,
  Network,
  Rocket,
  Sparkles,
  TerminalSquare,
  Wrench,
} from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  star: Sparkles,
  terminal: TerminalSquare,
  code: Code2,
  database: Database,
  wrench: Wrench,
  bug: Bug,
  network: Network,
  rocket: Rocket,
  brain: BrainCircuit,
}

export function getWorkspaceIcon(name: string): LucideIcon {
  return iconMap[name] ?? FolderCode
}

export function listWorkspaceIcons() {
  return Object.keys(iconMap)
}
