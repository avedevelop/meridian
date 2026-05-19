import { useCallback } from 'react'
import { useVaultStore } from '../store/useVaultStore'
import { useLinkStore } from '../store/useLinkStore'
import type { VaultConfig, VaultFile, VaultFileChangeEvent } from '@shared/types'

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
      moveFile: (sourcePath: string, targetDir: string) => Promise<string>
      openByPath: (path: string) => Promise<VaultConfig | null>
      onFileChanged: (cb: (event: VaultFileChangeEvent) => void) => () => void
      writeBinary: (filePath: string, base64: string) => Promise<string>
      exportHtml: (suggestedName: string, html: string) => Promise<string | null>
    }
    settings: {
      get: () => Promise<import('@shared/types').AppConfig>
      set: (key: string, value: unknown) => Promise<void>
    }
  }
}

function isSameOrChildPath(parentPath: string, candidatePath: string): boolean {
  const parent = parentPath.replace(/\\/g, '/').replace(/\/+$/, '')
  const candidate = candidatePath.replace(/\\/g, '/')
  return candidate === parent || candidate.startsWith(`${parent}/`)
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
        } catch {
          // Skip files that disappeared or became unreadable during initial indexing.
        }
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
    // If tab already open, just activate it — don't overwrite unsaved content
    const existing = useVaultStore.getState().openTabs.find(t => t.path === path)
    if (existing) {
      useVaultStore.getState().setActiveTab(path)
      return
    }
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
    try {
      const newPath = await window.vault.renameFile(oldPath, newName)
      const { openTabs, activeTabPath } = useVaultStore.getState()
      const wasActive = activeTabPath === oldPath
      useVaultStore.setState({
        openTabs: openTabs.map(t => t.path === oldPath ? { ...t, path: newPath, name: newName } : t),
        activeTabPath: wasActive ? newPath : activeTabPath,
      })
      // Update link index: remove old path, re-index under new name
      const vault = useVaultStore.getState().vault
      if (vault) {
        const tab = openTabs.find(t => t.path === oldPath)
        const content = tab?.content ?? ''
        useLinkStore.getState().removeFile(oldPath, vault.path)
        useLinkStore.getState().indexFile(newPath, newName, content, vault.path)
      }
      await refreshFiles()
    } catch (e) {
      console.error('[Bridge] renameFile error', e)
    }
  }, [refreshFiles])

  const moveFile = useCallback(async (sourcePath: string, targetDir: string) => {
    try {
      const newPath = await window.vault.moveFile(sourcePath, targetDir)
      const name = newPath.split('/').pop() ?? ''
      const { openTabs, activeTabPath } = useVaultStore.getState()
      const wasActive = activeTabPath === sourcePath
      useVaultStore.setState({
        openTabs: openTabs.map(t =>
          t.path === sourcePath ? { ...t, path: newPath, name } : t
        ),
        activeTabPath: wasActive ? newPath : activeTabPath,
      })
      const vault = useVaultStore.getState().vault
      if (vault) {
        const tab = openTabs.find(t => t.path === sourcePath)
        useLinkStore.getState().removeFile(sourcePath, vault.path)
        useLinkStore.getState().indexFile(newPath, name, tab?.content ?? '', vault.path)
      }
      await refreshFiles()
    } catch (e) {
      console.error('[Bridge] moveFile error', e)
      window.alert(`Could not move file: ${e instanceof Error ? e.message : String(e)}`)
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
        const linkStore = useLinkStore.getState()
        const paths = linkStore.allFiles().filter(filePath => isSameOrChildPath(path, filePath))
        for (const filePath of paths) {
          linkStore.removeFile(filePath, vault.path)
        }
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
    } catch {
      // Daily directory may already exist.
    }

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

  const exportNote = useCallback(async () => {
    const { openTabs, activeTabPath } = useVaultStore.getState()
    const activeTab = openTabs.find(t => t.path === activeTabPath)
    if (!activeTab) return

    try {
      const { unified } = await import('unified')
      const { default: remarkParse } = await import('remark-parse')
      const { default: remarkGfm } = await import('remark-gfm')
      const { default: remarkRehype } = await import('remark-rehype')
      const { default: rehypeSanitize } = await import('rehype-sanitize')
      const { default: rehypeStringify } = await import('rehype-stringify')

      const processor = unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkRehype)
        .use(rehypeSanitize)
        .use(rehypeStringify)

      const bodyHtml = String(processor.processSync(activeTab.content))
      const title = activeTab.name.replace(/\.md$/i, '')
      const escapedTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

      const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapedTitle}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { max-width: 720px; margin: 0 auto; padding: 48px 24px; font-family: Georgia, serif; line-height: 1.8; color: #1a1a1a; background: #fafaf8; }
    h1, h2, h3, h4, h5, h6 { font-weight: 700; line-height: 1.3; margin-top: 2em; margin-bottom: 0.5em; }
    h1 { font-size: 2em; border-bottom: 2px solid #eee; padding-bottom: 0.3em; margin-top: 0; }
    h2 { font-size: 1.5em; }
    h3 { font-size: 1.25em; }
    p { margin: 0 0 1em; }
    a { color: #7c6af7; text-decoration: underline; }
    code { background: #f0eff5; padding: 2px 6px; border-radius: 4px; font-size: 0.88em; font-family: 'SF Mono', 'Fira Code', monospace; }
    pre { background: #f5f4fa; padding: 20px; border-radius: 8px; overflow-x: auto; margin: 1.5em 0; }
    pre code { background: none; padding: 0; font-size: 0.85em; }
    blockquote { border-left: 4px solid #ddd; margin: 1.5em 0; padding: 0.5em 1em; color: #555; }
    img { max-width: 100%; border-radius: 6px; margin: 1em 0; }
    table { border-collapse: collapse; width: 100%; margin: 1.5em 0; }
    th, td { border: 1px solid #ddd; padding: 10px 14px; text-align: left; }
    th { background: #f5f4fa; font-weight: 600; }
    hr { border: none; border-top: 2px solid #eee; margin: 2em 0; }
    ul, ol { padding-left: 1.5em; margin: 0 0 1em; }
    li { margin-bottom: 0.25em; }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`

      const result = await window.vault.exportHtml(`${title}.html`, fullHtml)
      if (result) console.log('[Bridge] exported to', result)
    } catch (e) {
      console.error('[Bridge] exportNote error', e)
      window.alert(`Could not export note: ${e instanceof Error ? e.message : String(e)}`)
    }
  }, [])

  const createNewVault = useCallback(async () => {
    const config = await window.vault.openDialog()
    if (!config) return
    await initVault(config)

    const currentFiles = await window.vault.listFiles()
    if (currentFiles.length === 0) {
      const welcomeContent = [
        '# Welcome to Meridian',
        '',
        'This is your new vault. Here are a few things to try:',
        '',
        '- **Write** — just start typing in any note',
        '- **Link notes** — type `[[Note Name]]` to create a wiki-link',
        '- **Daily note** — press `⌘D` to open today\'s note',
        '- **Search** — press `⌘K` to search across all notes',
        '- **Graph** — click the 🕸️ tab in the sidebar to see your note network',
        '',
        '## Quick shortcuts',
        '',
        '| Shortcut | Action |',
        '|----------|--------|',
        '| `⌘S` | Save note |',
        '| `⌘D` | Open daily note |',
        '| `⌘K` | Command palette |',
        '| `⌘E` | Export to HTML |',
        '| `⌘,` | Settings |',
        '',
        'Happy writing! 📓',
      ].join('\n')

      try {
        const filePath = await window.vault.createFile(config.path, 'Welcome.md')
        await window.vault.writeFile(filePath, welcomeContent)
        useLinkStore.getState().indexFile(filePath, 'Welcome.md', welcomeContent, config.path)
        const updatedFiles = await window.vault.listFiles()
        useVaultStore.getState().setFiles(updatedFiles)
        await openFile(filePath, 'Welcome.md')
      } catch (e) {
        console.error('[Bridge] createNewVault welcome note error', e)
      }
    }
  }, [initVault, openFile])

  return { openVault, refreshFiles, openFile, saveFile, createFile, createFolder, renameFile, moveFile, deleteFile, openVaultByPath, openDailyNote, saveImage, exportNote, createNewVault }
}
