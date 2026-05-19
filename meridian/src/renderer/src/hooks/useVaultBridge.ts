import { useCallback } from 'react'
import { useVaultStore } from '../store/useVaultStore'
import { useLinkStore } from '../store/useLinkStore'
import type { VaultConfig, VaultFile } from '@shared/types'

declare global {
  interface Window {
    vault: {
      openDialog: () => Promise<VaultConfig | null>
      listFiles: () => Promise<VaultFile[]>
      readFile: (path: string) => Promise<string>
      writeFile: (path: string, content: string) => Promise<void>
      createFile: (dir: string, name: string) => Promise<string>
      createDir: (parentDir: string, name: string) => Promise<string>
      deleteFile: (path: string) => Promise<void>
      renameFile: (oldPath: string, newName: string) => Promise<string>
      openByPath: (path: string) => Promise<VaultConfig | null>
      onFileChanged: (cb: (file: VaultFile) => void) => () => void
      writeBinary: (filePath: string, base64: string) => Promise<string>
    }
    settings: {
      get: () => Promise<import('@shared/types').AppConfig>
      set: (key: string, value: unknown) => Promise<void>
    }
  }
}

function flattenFiles(files: VaultFile[]): VaultFile[] {
  const result: VaultFile[] = []
  for (const f of files) {
    result.push(f)
    if (f.children) result.push(...flattenFiles(f.children))
  }
  return result
}

export function useVaultBridge() {
  const { setVault, setFiles, openTab, setTabContent, markTabDirty } = useVaultStore()

  const initVault = useCallback(async (config: import('@shared/types').VaultConfig) => {
    useVaultStore.setState({ openTabs: [], activeTabPath: null })
    useLinkStore.getState().reset()
    setVault(config)
    const files = await window.vault.listFiles()
    setFiles(files)
    const { indexFile } = useLinkStore.getState()
    for (const f of flattenFiles(files)) {
      if (!f.isDirectory && f.name.endsWith('.md')) {
        try {
          const content = await window.vault.readFile(f.path)
          indexFile(f.path, f.name, content, config.path)
        } catch {}
      }
    }
  }, [setVault, setFiles])

  const openVault = useCallback(async () => {
    const config = await window.vault.openDialog()
    if (!config) return
    await initVault(config)
  }, [initVault])

  const refreshFiles = useCallback(async () => {
    const files = await window.vault.listFiles()
    setFiles(files)
  }, [setFiles])

  const openFile = useCallback(async (path: string, name: string) => {
    // Only open text-like files
    const ext = path.split('.').pop()?.toLowerCase() ?? ''
    const textExts = ['md', 'txt', 'markdown', 'mdx', 'mdown', 'canvas', 'json', 'yaml', 'yml', 'toml', 'csv']
    if (!textExts.includes(ext)) return
    openTab(path, name)
    try {
      const content = await window.vault.readFile(path)
      setTabContent(path, content)
    } catch {
      setTabContent(path, `<!-- Could not read file: ${name} -->`)
    }
  }, [openTab, setTabContent])

  const saveFile = useCallback(async (path: string, content: string) => {
    await window.vault.writeFile(path, content)
    markTabDirty(path, false)
    // Re-index this file
    const vault = useVaultStore.getState().vault
    if (vault) {
      const name = path.split('/').pop() ?? ''
      useLinkStore.getState().indexFile(path, name, content, vault.path)
    }
  }, [markTabDirty])

  const createFile = useCallback(async (dir: string, name: string) => {
    const fileName = name.endsWith('.md') ? name : `${name}.md`
    const filePath = await window.vault.createFile(dir, fileName)
    // Index new file so it appears in autocomplete and backlinks
    const vault = useVaultStore.getState().vault
    if (vault) useLinkStore.getState().indexFile(filePath, fileName, '', vault.path)
    await refreshFiles()
    await openFile(filePath, fileName)
  }, [refreshFiles, openFile])

  const createFolder = useCallback(async (parentDir: string) => {
    const name = window.prompt('Folder name:')
    if (!name?.trim()) return
    try {
      await window.vault.createDir(parentDir, name.trim())
      await refreshFiles()
    } catch (e) {
      console.error('[Bridge] createFolder error', e)
      window.alert(`Could not create folder: ${e instanceof Error ? e.message : String(e)}`)
    }
  }, [refreshFiles])

  const renameFile = useCallback(async (oldPath: string, newName: string) => {
    console.log('[Bridge] renameFile', { oldPath, newName })
    try {
      const newPath = await window.vault.renameFile(oldPath, newName)
      console.log('[Bridge] renameFile success', newPath)
      const { openTabs, activeTabPath } = useVaultStore.getState()
      const wasActive = activeTabPath === oldPath
      useVaultStore.setState({
        openTabs: openTabs.map(t => t.path === oldPath ? { ...t, path: newPath, name: newName } : t),
        activeTabPath: wasActive ? newPath : activeTabPath,
      })
      await refreshFiles()
    } catch (e) {
      console.error('[Bridge] renameFile error', e)
    }
  }, [refreshFiles])

  const deleteFile = useCallback(async (path: string) => {
    try {
      await window.vault.deleteFile(path)
      const { openTabs } = useVaultStore.getState()
      if (openTabs.some(t => t.path === path)) {
        useVaultStore.getState().closeTab(path)
      }
      const vault = useVaultStore.getState().vault
      if (vault) {
        useLinkStore.getState().removeFile(path, vault.path)
      }
      await refreshFiles()
    } catch (e) {
      console.error('[Bridge] deleteFile error', e)
    }
  }, [refreshFiles])

  const openVaultByPath = useCallback(async (vaultPath: string) => {
    try {
      const config = await window.vault.openByPath(vaultPath)
      if (!config) return  // null = path doesn't exist or not a directory
      await initVault(config)
    } catch (e) {
      console.error('[Bridge] openVaultByPath error', e)
    }
  }, [initVault])

  const openDailyNote = useCallback(async () => {
    const vault = useVaultStore.getState().vault
    if (!vault) return

    const d = new Date()
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const fileName = `${today}.md`
    const dailyDir = `${vault.path}/Daily`
    const fullPath = `${dailyDir}/${fileName}`

    const existing = useLinkStore.getState().allFiles().find(f => f === fullPath)
    if (existing) {
      await openFile(existing, fileName)
      return
    }

    try {
      await window.vault.createDir(vault.path, 'Daily')
    } catch {}

    try {
      const filePath = await window.vault.createFile(dailyDir, fileName)
      useLinkStore.getState().indexFile(filePath, fileName, '', vault.path)
      await refreshFiles()
      await openFile(filePath, fileName)
    } catch (e) {
      console.error('[Bridge] openDailyNote error', e)
    }
  }, [openFile, refreshFiles])

  const saveImage = useCallback(async (base64: string, ext: string): Promise<string | null> => {
    const vault = useVaultStore.getState().vault
    if (!vault) return null
    const timestamp = Date.now()
    const fileName = `image-${timestamp}.${ext}`
    const filePath = `${vault.path}/assets/${fileName}`
    try {
      await window.vault.writeBinary(filePath, base64)
      await refreshFiles()
      return `assets/${fileName}`
    } catch (e) {
      console.error('[Bridge] saveImage error', e)
      return null
    }
  }, [refreshFiles])

  return { openVault, refreshFiles, openFile, saveFile, createFile, createFolder, renameFile, deleteFile, openVaultByPath, openDailyNote, saveImage }
}
