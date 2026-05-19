import { create } from 'zustand'
import { VaultFile, VaultConfig } from '@shared/types'

export interface Tab {
  path: string
  name: string
  content: string
  isDirty: boolean
}

interface VaultState {
  vault: VaultConfig | null
  files: VaultFile[]
  openTabs: Tab[]
  activeTabPath: string | null

  setVault: (vault: VaultConfig) => void
  setFiles: (files: VaultFile[]) => void
  openTab: (path: string, name: string) => void
  closeTab: (path: string) => void
  setActiveTab: (path: string) => void
  setTabContent: (path: string, content: string) => void
  markTabDirty: (path: string, dirty: boolean) => void
}

export const useVaultStore = create<VaultState>((set, get) => ({
  vault: null,
  files: [],
  openTabs: [],
  activeTabPath: null,

  setVault: (vault) => set({ vault }),

  setFiles: (files) => set({ files }),

  openTab: (path, name) => {
    const { openTabs } = get()
    if (openTabs.some(t => t.path === path)) {
      set({ activeTabPath: path })
      return
    }
    set({
      openTabs: [...openTabs, { path, name, content: '', isDirty: false }],
      activeTabPath: path,
    })
  },

  closeTab: (path) => {
    const { openTabs, activeTabPath } = get()
    const index = openTabs.findIndex(t => t.path === path)
    const next = openTabs.filter(t => t.path !== path)
    let nextActive = activeTabPath
    if (activeTabPath === path) {
      nextActive = next[Math.max(0, index - 1)]?.path ?? next[0]?.path ?? null
    }
    set({ openTabs: next, activeTabPath: nextActive })
  },

  setActiveTab: (path) => set({ activeTabPath: path }),

  setTabContent: (path, content) =>
    set(state => ({
      openTabs: state.openTabs.map(t => t.path === path ? { ...t, content } : t),
    })),

  markTabDirty: (path, dirty) =>
    set(state => ({
      openTabs: state.openTabs.map(t => t.path === path ? { ...t, isDirty: dirty } : t),
    })),
}))
