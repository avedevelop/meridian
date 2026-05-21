import { useEffect } from 'react'
import { useVaultStore } from '../store/useVaultStore'

const storageKey = (vaultPath: string) => `meridian-tabs-${vaultPath}`

export function useSessionPersist() {
  useEffect(() => {
    return useVaultStore.subscribe((state) => {
      const vault = state.vault
      if (!vault) return
      const activePane = state.panes.find((p) => p.id === state.activePaneId) ?? state.panes[0]
      if (!activePane) return
      const session = {
        tabs: activePane.openTabs.map((t) => ({ path: t.path, name: t.name })),
        activeTabPath: activePane.activeTabPath
      }
      try {
        localStorage.setItem(storageKey(vault.path), JSON.stringify(session))
      } catch {
        // ignore storage errors
      }
    })
  }, [])
}

export async function restoreSession(
  vaultPath: string,
  openFile: (path: string, name: string) => Promise<void>,
  preReadRaw?: string | null
): Promise<void> {
  try {
    const raw = preReadRaw ?? localStorage.getItem(storageKey(vaultPath))
    if (!raw) return
    const session = JSON.parse(raw) as {
      tabs: { path: string; name: string }[]
      activeTabPath: string | null
    }
    const tabs = session.tabs ?? []
    for (const tab of tabs) {
      try {
        await openFile(tab.path, tab.name)
      } catch {
        // skip tabs whose files no longer exist
      }
    }
    if (session.activeTabPath) {
      useVaultStore.getState().setActiveTab(session.activeTabPath)
    }
  } catch {
    // ignore malformed session data
  }
}
