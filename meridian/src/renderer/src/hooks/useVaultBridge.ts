import { useCallback } from 'react'
import { useVaultStore } from '../store/useVaultStore'
import type { VaultConfig } from '@shared/types'

declare global {
  interface Window {
    vault: {
      openDialog: () => Promise<VaultConfig | null>
      listFiles: () => Promise<import('@shared/types').VaultFile[]>
      readFile: (path: string) => Promise<string>
      writeFile: (path: string, content: string) => Promise<void>
      createFile: (dir: string, name: string) => Promise<string>
      deleteFile: (path: string) => Promise<void>
      onFileChanged: (cb: (file: import('@shared/types').VaultFile) => void) => void
    }
    settings: {
      get: () => Promise<import('@shared/types').AppConfig>
      set: (key: string, value: unknown) => Promise<void>
    }
  }
}

export function useVaultBridge() {
  const { setVault, setFiles, openTab, setTabContent, markTabDirty } = useVaultStore()

  const openVault = useCallback(async () => {
    const config = await window.vault.openDialog()
    if (!config) return
    setVault(config)
    const files = await window.vault.listFiles()
    setFiles(files)
  }, [setVault, setFiles])

  const refreshFiles = useCallback(async () => {
    const files = await window.vault.listFiles()
    setFiles(files)
  }, [setFiles])

  const openFile = useCallback(async (path: string, name: string) => {
    openTab(path, name)
    const content = await window.vault.readFile(path)
    setTabContent(path, content)
  }, [openTab, setTabContent])

  const saveFile = useCallback(async (path: string, content: string) => {
    await window.vault.writeFile(path, content)
    markTabDirty(path, false)
  }, [markTabDirty])

  const createFile = useCallback(async (dir: string, name: string) => {
    const filePath = await window.vault.createFile(dir, name.endsWith('.md') ? name : `${name}.md`)
    await refreshFiles()
    await openFile(filePath, name.endsWith('.md') ? name : `${name}.md`)
  }, [refreshFiles, openFile])

  return { openVault, refreshFiles, openFile, saveFile, createFile }
}
