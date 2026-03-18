import { invoke } from '@tauri-apps/api/core'
import { create } from 'zustand'

import {
  DEFAULT_WORKSPACE,
  DEFAULT_WORKSPACE_ID,
  WORKSPACE_COLORS,
  WORKSPACE_ICONS,
} from '@/lib/constants'
import { getAppStore } from '@/lib/storage'
import { useSettingsStore } from '@/store/settings'
import type { Workspace } from '@/types'

type WorkspaceMetaMap = Record<string, Workspace>

interface WorkspaceState {
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  ready: boolean
  initialize: () => Promise<void>
  refresh: () => Promise<void>
  setActiveWorkspace: (id: string | null) => void
  createWorkspace: (name: string) => Promise<Workspace | null>
  renameWorkspace: (currentId: string, nextName: string) => Promise<void>
  deleteWorkspace: (workspaceId: string) => Promise<void>
  updateWorkspaceMeta: (
    workspaceId: string,
    patch: Partial<Pick<Workspace, 'color' | 'icon'>>,
  ) => Promise<void>
}

function createWorkspaceFromName(
  name: string,
  index: number,
  persisted?: Workspace,
): Workspace {
  return {
    id: name,
    name,
    color: persisted?.color ?? WORKSPACE_COLORS[index % WORKSPACE_COLORS.length],
    icon: persisted?.icon ?? WORKSPACE_ICONS[index % WORKSPACE_ICONS.length],
    createdAt: persisted?.createdAt ?? new Date().toISOString(),
  }
}

async function loadWorkspaceMeta() {
  const store = await getAppStore()
  return (await store.get<WorkspaceMetaMap>('workspaceMeta')) ?? {
    [DEFAULT_WORKSPACE.id]: DEFAULT_WORKSPACE,
  }
}

async function persistWorkspaceMeta(workspaces: Workspace[]) {
  const store = await getAppStore()
  const meta = workspaces.reduce<WorkspaceMetaMap>((accumulator, workspace) => {
    accumulator[workspace.id] = workspace
    return accumulator
  }, {})

  await store.set('workspaceMeta', meta)
  await store.save()
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  ready: false,
  async initialize() {
    if (get().ready) {
      return
    }

    await get().refresh()
    set({ ready: true })
  },
  async refresh() {
    const names = await invoke<string[]>('list_workspaces')
    const workspaceMeta = await loadWorkspaceMeta()
    const uniqueNames = Array.from(new Set([DEFAULT_WORKSPACE_ID, ...names]))
    const workspaces = uniqueNames.map((name, index) =>
      createWorkspaceFromName(name, index, workspaceMeta[name]),
    )

    set((state) => {
      const currentActive = state.activeWorkspaceId
      const fallbackWorkspace =
        useSettingsStore.getState().settings.defaultWorkspace ?? DEFAULT_WORKSPACE_ID
      const nextActive =
        currentActive && workspaces.some((workspace) => workspace.id === currentActive)
          ? currentActive
          : workspaces.find((workspace) => workspace.id === fallbackWorkspace)?.id ??
            workspaces[0]?.id ??
            null

      return {
        workspaces,
        activeWorkspaceId: nextActive,
      }
    })

    await persistWorkspaceMeta(workspaces)
  },
  setActiveWorkspace(id) {
    set({ activeWorkspaceId: id })
  },
  async createWorkspace(name) {
    const nextName = name.trim()

    if (!nextName) {
      return null
    }

    await invoke('create_workspace', { name: nextName })
    await get().refresh()
    const created = get().workspaces.find((workspace) => workspace.id === nextName) ?? null

    if (created) {
      set({ activeWorkspaceId: created.id })
    }

    return created
  },
  async renameWorkspace(currentId, nextName) {
    const cleanName = nextName.trim()

    if (!cleanName || cleanName === currentId) {
      return
    }

    await invoke('rename_workspace', {
      currentName: currentId,
      nextName: cleanName,
    })

    const workspaces = get().workspaces.map((workspace) =>
      workspace.id === currentId
        ? {
            ...workspace,
            id: cleanName,
            name: cleanName,
          }
        : workspace,
    )

    set({
      workspaces,
      activeWorkspaceId:
        get().activeWorkspaceId === currentId ? cleanName : get().activeWorkspaceId,
    })

    await persistWorkspaceMeta(workspaces)
    await get().refresh()
  },
  async deleteWorkspace(workspaceId) {
    await invoke('delete_workspace', {
      name: workspaceId,
      fallbackWorkspace: DEFAULT_WORKSPACE_ID,
    })
    await get().refresh()
  },
  async updateWorkspaceMeta(workspaceId, patch) {
    const workspaces = get().workspaces.map((workspace) =>
      workspace.id === workspaceId ? { ...workspace, ...patch } : workspace,
    )

    set({ workspaces })
    await persistWorkspaceMeta(workspaces)
  },
}))
