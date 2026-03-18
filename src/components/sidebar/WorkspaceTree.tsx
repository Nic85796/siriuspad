import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'

import { getWorkspaceIcon } from '@/lib/icons'
import type { Workspace } from '@/types'

interface WorkspaceTreeProps {
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  onSelectWorkspace: (workspaceId: string | null) => void
  onCreateWorkspace: () => Promise<void>
  onRenameWorkspace: (workspaceId: string) => Promise<void>
  onDeleteWorkspace: (workspaceId: string) => Promise<void>
  onCycleWorkspaceColor: (workspaceId: string) => Promise<void>
  onCycleWorkspaceIcon: (workspaceId: string) => Promise<void>
}

interface ContextMenuState {
  workspaceId: string
  x: number
  y: number
}

export function WorkspaceTree({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  onRenameWorkspace,
  onDeleteWorkspace,
  onCycleWorkspaceColor,
  onCycleWorkspaceIcon,
}: WorkspaceTreeProps) {
  const [menu, setMenu] = useState<ContextMenuState | null>(null)

  useEffect(() => {
    if (!menu) {
      return
    }

    const closeMenu = () => setMenu(null)
    window.addEventListener('click', closeMenu)
    return () => {
      window.removeEventListener('click', closeMenu)
    }
  }, [menu])

  return (
    <section className="relative border-b border-border/80 px-3 py-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
          Workspaces
        </h2>
        <button
          type="button"
          className="rounded-md border border-border p-1 text-text-secondary transition hover:border-focus hover:bg-hover hover:text-text-primary"
          onClick={() => void onCreateWorkspace()}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <button
        type="button"
        className={`mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition ${
          activeWorkspaceId === null
            ? 'bg-active text-text-primary'
            : 'text-text-secondary hover:bg-hover hover:text-text-primary'
        }`}
        onClick={() => onSelectWorkspace(null)}
      >
        <span className="h-2 w-2 rounded-full bg-text-muted" />
        <span>All notes</span>
      </button>

      <div className="grid gap-1">
        {workspaces.map((workspace) => {
          const Icon = getWorkspaceIcon(workspace.icon)
          const isActive = workspace.id === activeWorkspaceId

          return (
            <button
              key={workspace.id}
              type="button"
              className={`flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition ${
                isActive
                  ? 'bg-active text-text-primary'
                  : 'text-text-secondary hover:bg-hover hover:text-text-primary'
              }`}
              onClick={() => onSelectWorkspace(workspace.id)}
              onContextMenu={(event) => {
                event.preventDefault()
                setMenu({
                  workspaceId: workspace.id,
                  x: event.clientX,
                  y: event.clientY,
                })
              }}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: workspace.color }}
              />
              <Icon className="h-4 w-4" />
              <span className="truncate">{workspace.name}</span>
            </button>
          )
        })}
      </div>

      {menu ? (
        <div
          className="fixed z-[65] w-44 rounded-xl border border-border bg-elevated p-1 shadow-2xl"
          style={{ left: menu.x, top: menu.y }}
        >
          <button
            type="button"
            className="workspace-menu-item"
            onClick={() => void onRenameWorkspace(menu.workspaceId)}
          >
            Rename
          </button>
          <button
            type="button"
            className="workspace-menu-item"
            onClick={() => void onCycleWorkspaceColor(menu.workspaceId)}
          >
            Next color
          </button>
          <button
            type="button"
            className="workspace-menu-item"
            onClick={() => void onCycleWorkspaceIcon(menu.workspaceId)}
          >
            Next icon
          </button>
          {menu.workspaceId !== 'geral' ? (
            <button
              type="button"
              className="workspace-menu-item text-red hover:bg-red/10"
              onClick={() => void onDeleteWorkspace(menu.workspaceId)}
            >
              Delete
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
