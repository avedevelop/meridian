import { create } from 'zustand'
import { VaultFile, VaultConfig } from '@shared/types'

export interface Tab {
  path: string
  name: string
  content: string
  isDirty: boolean
}

export interface Pane {
  id: string
  openTabs: Tab[]
  activeTabPath: string | null
  direction?: 'horizontal' | 'vertical'
}

interface VaultState {
  vault: VaultConfig | null
  files: VaultFile[]
  
  // Legacy fields (synced with active pane for backward compatibility)
  openTabs: Tab[]
  activeTabPath: string | null

  // Pane State
  panes: Pane[]
  activePaneId: string

  setVault: (vault: VaultConfig) => void
  setFiles: (files: VaultFile[]) => void
  
  // Tab management (targets active pane or custom pane)
  openTab: (path: string, name: string) => void
  closeTab: (path: string, paneId?: string) => void
  setActiveTab: (path: string, paneId?: string) => void
  setTabContent: (path: string, content: string) => void
  markTabDirty: (path: string, dirty: boolean) => void
  reorderTabs: (openTabs: Tab[], paneId?: string) => void

  // Pane actions
  splitPane: (paneId: string, direction: 'vertical' | 'horizontal') => void
  closePane: (paneId: string) => void
  setActivePane: (paneId: string) => void
  moveTab: (fromPaneId: string, toPaneId: string, tabPath: string, toIndex?: number) => void
  mergeAllPanes: () => void
}

export const useVaultStore = create<VaultState>((set, get) => {
  const syncLegacyState = (panes: Pane[], activePaneId: string) => {
    const active = panes.find((p) => p.id === activePaneId) || panes[0]
    return {
      panes,
      activePaneId: active.id,
      openTabs: active ? active.openTabs : [],
      activeTabPath: active ? active.activeTabPath : null
    }
  }

  return {
    vault: null,
    files: [],
    openTabs: [],
    activeTabPath: null,
    panes: [{ id: 'pane-main', openTabs: [], activeTabPath: null }],
    activePaneId: 'pane-main',

    setVault: (vault) => set({ vault }),

    setFiles: (files) => set({ files }),

    openTab: (path, name) => {
      const { panes, activePaneId } = get()
      const updated = panes.map((p) => {
        if (p.id !== activePaneId) return p
        if (p.openTabs.some((t) => t.path === path)) {
          return { ...p, activeTabPath: path }
        }
        return {
          ...p,
          openTabs: [...p.openTabs, { path, name, content: '', isDirty: false }],
          activeTabPath: path
        }
      })
      set(syncLegacyState(updated, activePaneId))
    },

    closeTab: (path, paneId) => {
      const { panes, activePaneId } = get()
      const targetPaneId = paneId || activePaneId
      let updated = panes.map((p) => {
        if (p.id !== targetPaneId) return p
        const index = p.openTabs.findIndex((t) => t.path === path)
        const nextTabs = p.openTabs.filter((t) => t.path !== path)
        let nextActive = p.activeTabPath
        if (p.activeTabPath === path) {
          nextActive = nextTabs[Math.max(0, index - 1)]?.path ?? nextTabs[0]?.path ?? null
        }
        return { ...p, openTabs: nextTabs, activeTabPath: nextActive }
      })
      // Auto-close empty pane if it's not the last one
      if (updated.length > 1) {
        const emptyPane = updated.find((p) => p.id === targetPaneId && p.openTabs.length === 0)
        if (emptyPane) {
          updated = updated.filter((p) => p.id !== targetPaneId)
          const nextActive = updated.find((p) => p.id === activePaneId)?.id ?? updated[0]?.id ?? 'pane-main'
          return set(syncLegacyState(updated, nextActive))
        }
      }
      set(syncLegacyState(updated, activePaneId))
    },

    setActiveTab: (path, paneId) => {
      const { panes, activePaneId } = get()
      const targetPaneId = paneId || activePaneId
      const updated = panes.map((p) => {
        if (p.id !== targetPaneId) return p
        return { ...p, activeTabPath: path }
      })
      set(syncLegacyState(updated, activePaneId))
    },

    setTabContent: (path, content) => {
      const { panes, activePaneId } = get()
      const updated = panes.map((p) => {
        return {
          ...p,
          openTabs: p.openTabs.map((t) => (t.path === path ? { ...t, content } : t))
        }
      })
      set(syncLegacyState(updated, activePaneId))
    },

    markTabDirty: (path, dirty) => {
      const { panes, activePaneId } = get()
      const updated = panes.map((p) => {
        return {
          ...p,
          openTabs: p.openTabs.map((t) => (t.path === path ? { ...t, isDirty: dirty } : t))
        }
      })
      set(syncLegacyState(updated, activePaneId))
    },

    reorderTabs: (openTabs, paneId) => {
      const { panes, activePaneId } = get()
      const targetPaneId = paneId || activePaneId
      const updated = panes.map((p) => {
        if (p.id !== targetPaneId) return p
        return { ...p, openTabs }
      })
      set(syncLegacyState(updated, activePaneId))
    },

    splitPane: (paneId, direction) => {
      const { panes } = get()
      const parentPane = panes.find((p) => p.id === paneId)
      if (!parentPane) return

      const newPaneId = `pane-${Date.now()}`
      // Copy active tab to the new pane if available
      const activeTab = parentPane.openTabs.find((t) => t.path === parentPane.activeTabPath)
      const newPaneTabs = activeTab ? [{ ...activeTab, isDirty: false }] : []
      const newActivePath = activeTab ? activeTab.path : null

      const newPane: Pane = {
        id: newPaneId,
        openTabs: newPaneTabs,
        activeTabPath: newActivePath,
        direction
      }

      set(syncLegacyState([...panes, newPane], newPaneId))
    },

    closePane: (paneId) => {
      const { panes, activePaneId } = get()
      if (panes.length <= 1) return // Keep at least one pane

      const paneToClose = panes.find((p) => p.id === paneId)
      if (!paneToClose) return

      // Find replacement pane to merge remaining tabs into, or just drop them
      const updated = panes.filter((p) => p.id !== paneId)
      let nextActivePaneId = activePaneId
      if (activePaneId === paneId) {
        nextActivePaneId = updated[0].id
      }

      // Merge tabs into first remaining pane
      if (paneToClose.openTabs.length > 0) {
        const mergePane = updated.find((p) => p.id === nextActivePaneId) || updated[0]
        paneToClose.openTabs.forEach((tab) => {
          if (!mergePane.openTabs.some((t) => t.path === tab.path)) {
            mergePane.openTabs.push(tab)
          }
        })
        if (!mergePane.activeTabPath) {
          mergePane.activeTabPath = paneToClose.activeTabPath
        }
      }

      set(syncLegacyState(updated, nextActivePaneId))
    },

    setActivePane: (paneId) => {
      const { panes } = get()
      set(syncLegacyState(panes, paneId))
    },

    moveTab: (fromPaneId, toPaneId, tabPath, toIndex) => {
      const { panes } = get()
      const fromPane = panes.find((p) => p.id === fromPaneId)
      const toPane = panes.find((p) => p.id === toPaneId)
      if (!fromPane || !toPane) return

      const tabToMove = fromPane.openTabs.find((t) => t.path === tabPath)
      if (!tabToMove) return

      // Remove tab from source pane
      const sourceIndex = fromPane.openTabs.findIndex((t) => t.path === tabPath)
      const nextSourceTabs = fromPane.openTabs.filter((t) => t.path !== tabPath)
      let nextSourceActive = fromPane.activeTabPath
      if (fromPane.activeTabPath === tabPath) {
        nextSourceActive = nextSourceTabs[Math.max(0, sourceIndex - 1)]?.path ?? nextSourceTabs[0]?.path ?? null
      }

      // Insert tab into target pane
      const nextTargetTabs = [...toPane.openTabs]
      if (toPane.openTabs.some((t) => t.path === tabPath)) {
        // Tab already in target, just select it
      } else {
        if (typeof toIndex === 'number') {
          nextTargetTabs.splice(toIndex, 0, tabToMove)
        } else {
          nextTargetTabs.push(tabToMove)
        }
      }

      const updated = panes.map((p) => {
        if (p.id === fromPaneId) {
          return { ...p, openTabs: nextSourceTabs, activeTabPath: nextSourceActive }
        }
        if (p.id === toPaneId) {
          return { ...p, openTabs: nextTargetTabs, activeTabPath: tabPath }
        }
        return p
      })

      set(syncLegacyState(updated, toPaneId))
    },

    mergeAllPanes: () => {
      const { panes } = get()
      if (panes.length <= 1) return
      // Collect all unique tabs from all panes into the main pane
      const seen = new Set<string>()
      const mergedTabs: Tab[] = []
      panes.forEach(p => {
        p.openTabs.forEach(t => {
          if (!seen.has(t.path)) { seen.add(t.path); mergedTabs.push(t) }
        })
      })
      const mainPane: Pane = {
        id: 'pane-main',
        openTabs: mergedTabs,
        activeTabPath: mergedTabs[0]?.path ?? null,
      }
      set(syncLegacyState([mainPane], 'pane-main'))
    },
  }
})
