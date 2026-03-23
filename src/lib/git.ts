import { invoke } from '@tauri-apps/api/core'
import { useSettingsStore } from '@/store/settings'

export interface GitResult {
  success: boolean
  output: string
  error: string | null
}

export async function isGitInstalled(): Promise<boolean> {
  return invoke<boolean>('git_is_installed')
}

export async function isGitRepo(): Promise<boolean> {
  return invoke<boolean>('git_is_repo')
}

export async function initGitRepo(): Promise<GitResult> {
  return invoke<GitResult>('git_init')
}

export async function setGitRemote(url: string): Promise<GitResult> {
  return invoke<GitResult>('git_set_remote', { url })
}

export async function syncGitRepo(): Promise<GitResult> {
  return invoke<GitResult>('git_sync')
}

export async function performFullGitSync(): Promise<{ success: boolean; detail?: string; errorKey?: string }> {
  try {
    const installed = await isGitInstalled()
    if (!installed) {
      return { success: false, errorKey: 'notInstalled' }
    }

    const settings = useSettingsStore.getState().settings
    if (!settings.gitRepoUrl) {
      return { success: false, errorKey: 'noUrl' }
    }

    const repo = await isGitRepo()
    if (!repo) {
      const initRes = await initGitRepo()
      if (!initRes.success) {
        return { success: false, errorKey: 'initFailed', detail: initRes.error || 'Unknown error' }
      }
    }

    const remoteRes = await setGitRemote(settings.gitRepoUrl)
    if (!remoteRes.success) {
      return { success: false, errorKey: 'remoteFailed', detail: remoteRes.error || 'Unknown error' }
    }

    const syncRes = await syncGitRepo()
    if (!syncRes.success) {
      return { success: false, errorKey: 'syncFailed', detail: syncRes.error || 'Unknown error' }
    }

    return { success: true }
  } catch (err) {
    return { success: false, errorKey: 'unknown', detail: String(err) }
  }
}
