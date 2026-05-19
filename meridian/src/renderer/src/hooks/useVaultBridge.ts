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
      deleteFile: (path: string) => Promise<void>
      onFileChanged: (cb: (file: VaultFile) => void) => () => void
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

  const openVault = useCallback(async () => {
    const config = await window.vault.openDialog()
    if (!config) return
    // Reset state for new vault
    setVault(config)
    useVaultStore.setState({ openTabs: [], activeTabPath: null })
    useLinkStore.getState().reset()
    const files = await window.vault.listFiles()
    setFiles(files)
    // Build link + search index — only .md files, skip errors
    const { indexFile } = useLinkStore.getState()
    const flatFiles = flattenFiles(files)
    for (const f of flatFiles) {
      if (!f.isDirectory && f.name.endsWith('.md')) {
        try {
          const content = await window.vault.readFile(f.path)
          indexFile(f.path, f.name, content, config.path)
        } catch {
          // skip unreadable files
        }
      }
    }
  }, [setVault, setFiles])

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
    await refreshFiles()
    await openFile(filePath, fileName)
  }, [refreshFiles, openFile])

  return { openVault, refreshFiles, openFile, saveFile, createFile }
}
