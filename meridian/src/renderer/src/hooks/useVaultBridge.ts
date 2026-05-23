import { useCallback } from 'react'
import { useVaultStore } from '../store/useVaultStore'
import { useLinkStore } from '../store/useLinkStore'
import { useSettingsStore } from '../store/useSettingsStore'
import type { VaultConfig, VaultFile, VaultFileChangeEvent } from '@shared/types'
import { restoreSession } from './useSessionPersist'

function flattenVaultFiles(files: VaultFile[]): VaultFile[] {
  return files.flatMap((f) => (f.children ? [f, ...flattenVaultFiles(f.children)] : [f]))
}

export function uniqueFileName(dir: string, base: string, ext: string, files: VaultFile[]): string {
  const allNames = new Set(
    flattenVaultFiles(files)
      .filter((f) => !f.isDirectory && f.path.startsWith(dir))
      .map((f) => f.name.toLowerCase())
  )
  const candidate = `${base}.${ext}`
  if (!allNames.has(candidate.toLowerCase())) return candidate
  let n = 2
  while (allNames.has(`${base} ${n}.${ext}`.toLowerCase())) n++
  return `${base} ${n}.${ext}`
}

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
      revealFile: (filePath: string) => Promise<void>
      openByPath: (path: string) => Promise<VaultConfig | null>
      onFileChanged: (cb: (event: VaultFileChangeEvent) => void) => () => void
      writeBinary: (filePath: string, base64: string) => Promise<string>
      exportHtml: (
        suggestedName: string,
        html: string,
        customCSS?: string
      ) => Promise<string | null>
      exportPdf: (
        suggestedName: string,
        html: string,
        pageSize?: string,
        customCSS?: string
      ) => Promise<string | null>
      saveVideo: (data: Uint8Array) => Promise<string | null>
      fetchUrlMetadata: (
        url: string
      ) => Promise<{ title: string; description: string; image: string; url: string }>
      openExternal: (url: string) => Promise<void>
      gitStatus: () => Promise<{
        isRepo: boolean
        clean?: boolean
        changesCount?: number
        hasRemote?: boolean
        changes?: {
          path: string
          status: 'modified' | 'added' | 'deleted' | 'untracked' | 'unknown'
        }[]
      }>
      gitCommit: (
        message?: string
      ) => Promise<{ success: boolean; error?: string; message?: string }>
      gitSync: (
        defaultBranch?: string
      ) => Promise<{ success: boolean; error?: string; noRemote?: boolean }>
      getConfigPath: () => Promise<string>
      setSpellLanguage: (lang: string) => Promise<void>
      openPath: (filePath: string) => Promise<void>
      gitInit: () => Promise<{ success: boolean; error?: string }>
      gitLog: () => Promise<{
        success: boolean
        error?: string
        commits?: {
          hash: string
          shortHash: string
          author: string
          date: string
          subject: string
        }[]
      }>
      gitShowHead: (relativePath: string) => Promise<{ success: boolean; content: string }>
      gitSetRemote: (url: string) => Promise<{ success: boolean; error?: string }>
      githubDeviceCode: () => Promise<{
        success: boolean
        device_code?: string
        user_code?: string
        verification_uri?: string
        interval?: number
        error?: string
      }>
      githubPollToken: (
        deviceCode: string
      ) => Promise<{ success: boolean; username?: string; pending?: boolean; error?: string }>
      githubLogout: () => Promise<{ success: boolean }>
      githubStatus: () => Promise<{ connected: boolean; username: string }>
      listPlugins: () => Promise<any[]>
      loadPlugin: (id: string) => Promise<string>
    }
    settings: {
      get: () => Promise<import('@shared/types').AppConfig>
      set: (key: string, value: unknown) => Promise<void>
      getPreferences: () => Promise<Record<string, unknown>>
      setPreferences: (prefs: Record<string, unknown>) => Promise<void>
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

  const refreshFiles = useCallback(async () => {
    const files = await window.vault.listFiles()
    setFiles(files)
  }, [setFiles])

  const openFile = useCallback(
    async (path: string, name: string) => {
      // Only open text-like files
      const ext = path.split('.').pop()?.toLowerCase() ?? ''
      const textExts = [
        'md',
        'txt',
        'markdown',
        'mdx',
        'mdown',
        'canvas',
        'excalidraw',
        'json',
        'yaml',
        'yml',
        'toml',
        'csv'
      ]
      if (!textExts.includes(ext)) return
      // If tab already open, just activate it — don't overwrite unsaved content
      const existing = useVaultStore.getState().openTabs.find((t) => t.path === path)
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
    },
    [openTab, setTabContent]
  )

  const initVault = useCallback(
    async (config: import('@shared/types').VaultConfig) => {
      // Read saved session BEFORE resetting state — the store subscriber will overwrite
      // localStorage with empty tabs as soon as setState fires, so we must capture it first.
      const savedSession = localStorage.getItem(`meridian-tabs-${config.path}`)
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
      await restoreSession(config.path, openFile, savedSession)
    },
    [setVault, setFiles, openFile]
  )

  const openVault = useCallback(async () => {
    const config = await window.vault.openDialog()
    if (!config) return
    await initVault(config)
  }, [initVault])

  const saveFile = useCallback(
    async (path: string, content: string) => {
      await window.vault.writeFile(path, content)
      markTabDirty(path, false)
      // Re-index this file
      const vault = useVaultStore.getState().vault
      if (vault) {
        const name = path.split('/').pop() ?? ''
        useLinkStore.getState().indexFile(path, name, content, vault.path)
      }
    },
    [markTabDirty]
  )

  const createFile = useCallback(
    async (dir: string, name: string) => {
      const fileName = name.endsWith('.md') ? name : `${name}.md`
      const filePath = await window.vault.createFile(dir, fileName)
      // Index new file so it appears in autocomplete and backlinks
      const vault = useVaultStore.getState().vault
      if (vault) useLinkStore.getState().indexFile(filePath, fileName, '', vault.path)
      await refreshFiles()
      await openFile(filePath, fileName)
    },
    [refreshFiles, openFile]
  )

  const createCanvas = useCallback(
    async (dir: string, name: string) => {
      const fileName = name.endsWith('.canvas') ? name : `${name}.canvas`
      const filePath = await window.vault.createFile(dir, fileName)
      await window.vault.writeFile(filePath, '{"nodes":[], "edges":[]}')
      await refreshFiles()
      await openFile(filePath, fileName)
    },
    [refreshFiles, openFile]
  )

  const createDrawing = useCallback(
    async (dir: string, name: string) => {
      const fileName = name.endsWith('.excalidraw') ? name : `${name}.excalidraw`
      const filePath = await window.vault.createFile(dir, fileName)
      await window.vault.writeFile(filePath, '{"type":"meridian-drawing","elements":[]}')
      await refreshFiles()
      await openFile(filePath, fileName)
    },
    [refreshFiles, openFile]
  )

  const createFolder = useCallback(
    async (parentDir: string) => {
      const name = window.prompt('Folder name:')
      if (!name?.trim()) return
      try {
        await window.vault.createDir(parentDir, name.trim())
        await refreshFiles()
      } catch (e) {
        console.error('[Bridge] createFolder error', e)
        window.alert(`Could not create folder: ${e instanceof Error ? e.message : String(e)}`)
      }
    },
    [refreshFiles]
  )

  const renameFile = useCallback(
    async (oldPath: string, newName: string) => {
      try {
        const newPath = await window.vault.renameFile(oldPath, newName)
        const { openTabs, activeTabPath } = useVaultStore.getState()
        const wasActive = activeTabPath === oldPath
        useVaultStore.setState({
          openTabs: openTabs.map((t) =>
            t.path === oldPath ? { ...t, path: newPath, name: newName } : t
          ),
          activeTabPath: wasActive ? newPath : activeTabPath
        })
        // Update link index: remove old path, re-index under new name
        const vault = useVaultStore.getState().vault
        if (vault) {
          const tab = openTabs.find((t) => t.path === oldPath)
          const content = tab?.content ?? ''
          useLinkStore.getState().removeFile(oldPath, vault.path)
          useLinkStore.getState().indexFile(newPath, newName, content, vault.path)
        }
        await refreshFiles()
      } catch (e) {
        console.error('[Bridge] renameFile error', e)
      }
    },
    [refreshFiles]
  )

  const moveFile = useCallback(
    async (sourcePath: string, targetDir: string) => {
      try {
        const newPath = await window.vault.moveFile(sourcePath, targetDir)
        const name = newPath.split('/').pop() ?? ''
        const { openTabs, activeTabPath } = useVaultStore.getState()
        const wasActive = activeTabPath === sourcePath
        useVaultStore.setState({
          openTabs: openTabs.map((t) =>
            t.path === sourcePath ? { ...t, path: newPath, name } : t
          ),
          activeTabPath: wasActive ? newPath : activeTabPath
        })
        const vault = useVaultStore.getState().vault
        if (vault) {
          const tab = openTabs.find((t) => t.path === sourcePath)
          useLinkStore.getState().removeFile(sourcePath, vault.path)
          useLinkStore.getState().indexFile(newPath, name, tab?.content ?? '', vault.path)
        }
        await refreshFiles()
      } catch (e) {
        console.error('[Bridge] moveFile error', e)
        window.alert(`Could not move file: ${e instanceof Error ? e.message : String(e)}`)
      }
    },
    [refreshFiles]
  )

  const revealFile = useCallback(async (path: string) => {
    try {
      await window.vault.revealFile(path)
    } catch (e) {
      console.error('[Bridge] revealFile error', e)
    }
  }, [])

  const deleteFile = useCallback(
    async (path: string) => {
      try {
        const { confirmDelete } = useSettingsStore.getState()
        if (confirmDelete) {
          const fileName = path.split('/').pop() ?? path
          if (!window.confirm(`Delete "${fileName}"? This cannot be undone.`)) return
        }
        await window.vault.deleteFile(path)
        const { openTabs } = useVaultStore.getState()
        if (openTabs.some((t) => t.path === path)) {
          useVaultStore.getState().closeTab(path)
        }
        const vault = useVaultStore.getState().vault
        if (vault) {
          const linkStore = useLinkStore.getState()
          const paths = linkStore.allFiles().filter((filePath) => isSameOrChildPath(path, filePath))
          for (const filePath of paths) {
            linkStore.removeFile(filePath, vault.path)
          }
        }
        await refreshFiles()
      } catch (e) {
        console.error('[Bridge] deleteFile error', e)
      }
    },
    [refreshFiles]
  )

  const openVaultByPath = useCallback(
    async (vaultPath: string) => {
      try {
        const config = await window.vault.openByPath(vaultPath)
        if (!config) return // null = path doesn't exist or not a directory
        await initVault(config)
      } catch (e) {
        console.error('[Bridge] openVaultByPath error', e)
      }
    },
    [initVault]
  )

  const openDailyNote = useCallback(async () => {
    const vault = useVaultStore.getState().vault
    if (!vault) return

    const d = new Date()
    const { dailyNoteDateFormat } = useSettingsStore.getState()
    const Y = String(d.getFullYear())
    const M = String(d.getMonth() + 1).padStart(2, '0')
    const D = String(d.getDate()).padStart(2, '0')
    const today = dailyNoteDateFormat.replace('YYYY', Y).replace('MM', M).replace('DD', D)
    const fileName = `${today}.md`
    const dailyDir = `${vault.path}/Daily`
    const fullPath = `${dailyDir}/${fileName}`

    const existing = useLinkStore
      .getState()
      .allFiles()
      .find((f) => f === fullPath)
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

  const saveImage = useCallback(
    async (base64: string, ext: string): Promise<string | null> => {
      const vault = useVaultStore.getState().vault
      if (!vault) return null
      const { attachmentFolder } = useSettingsStore.getState()
      const folder = attachmentFolder.trim() || 'assets'
      const timestamp = Date.now()
      const fileName = `image-${timestamp}.${ext}`
      const filePath = `${vault.path}/${folder}/${fileName}`
      try {
        try {
          await window.vault.createDir(vault.path, folder)
        } catch {
          /* may already exist */
        }
        await window.vault.writeBinary(filePath, base64)
        await refreshFiles()
        return `${folder}/${fileName}`
      } catch (e) {
        console.error('[Bridge] saveImage error', e)
        return null
      }
    },
    [refreshFiles]
  )

  const exportNote = useCallback(async () => {
    const { openTabs, activeTabPath } = useVaultStore.getState()
    const activeTab = openTabs.find((t) => t.path === activeTabPath)
    if (!activeTab) return

    try {
      const { exportCustomCSS, exportIncludeFrontmatter } = useSettingsStore.getState()

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

      let mdContent = activeTab.content
      if (!exportIncludeFrontmatter) {
        mdContent = mdContent.replace(/^---[\s\S]*?---\n?/, '')
      }

      const bodyHtml = String(processor.processSync(mdContent))
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

      const result = await window.vault.exportHtml(`${title}.html`, fullHtml, exportCustomCSS)
      if (result) console.log('[Bridge] exported to', result)
    } catch (e) {
      console.error('[Bridge] exportNote error', e)
      window.alert(`Could not export note: ${e instanceof Error ? e.message : String(e)}`)
    }
  }, [])

  const exportPdf = useCallback(async () => {
    const { panes, activePaneId } = useVaultStore.getState()
    const activePane = panes.find((p) => p.id === activePaneId) ?? panes[0]
    const activeTab = activePane?.openTabs.find((t) => t.path === activePane?.activeTabPath)
    if (!activeTab) return

    try {
      const { exportCustomCSS, pdfPageSize, exportIncludeFrontmatter } = useSettingsStore.getState()

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

      let mdContent = activeTab.content
      if (!exportIncludeFrontmatter) {
        mdContent = mdContent.replace(/^---[\s\S]*?---\n?/, '')
      }

      const bodyHtml = String(processor.processSync(mdContent))
      const title = activeTab.name.replace(/\.md$/i, '')
      const escapedTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

      const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapedTitle}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { max-width: 720px; margin: 0 auto; padding: 48px 32px; font-family: Georgia, serif; line-height: 1.8; color: #1a1a1a; }
    h1, h2, h3, h4, h5, h6 { font-weight: 700; line-height: 1.3; margin-top: 2em; margin-bottom: 0.5em; }
    h1 { font-size: 2em; border-bottom: 2px solid #eee; padding-bottom: 0.3em; margin-top: 0; }
    p { margin: 0 0 1em; }
    a { color: #5b4fcf; }
    code { background: #f0eff5; padding: 2px 5px; border-radius: 3px; font-size: 0.88em; font-family: monospace; }
    pre { background: #f5f4fa; padding: 16px 20px; border-radius: 6px; overflow-x: auto; margin: 1.5em 0; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #ddd; margin: 1em 0; padding: 0.5em 1em; color: #555; }
    img { max-width: 100%; border-radius: 4px; }
    table { border-collapse: collapse; width: 100%; margin: 1.5em 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f5f4fa; font-weight: 600; }
    ul, ol { padding-left: 1.5em; margin: 0 0 1em; }
  </style>
</head>
<body>${bodyHtml}</body>
</html>`

      const result = await window.vault.exportPdf(
        `${title}.pdf`,
        fullHtml,
        pdfPageSize,
        exportCustomCSS
      )
      if (result) console.log('[Bridge] PDF exported to', result)
    } catch (e) {
      console.error('[Bridge] exportPdf error', e)
      window.alert(`Could not export PDF: ${e instanceof Error ? e.message : String(e)}`)
    }
  }, [])

  const listTemplates = useCallback(async (): Promise<Array<{ name: string; path: string }>> => {
    const allFiles = useVaultStore.getState().files

    function findTemplates(
      items: import('@shared/types').VaultFile[]
    ): Array<{ name: string; path: string }> {
      for (const f of items) {
        if (f.isDirectory && f.name === '_templates') {
          return (f.children ?? [])
            .filter((c) => !c.isDirectory && c.name.endsWith('.md'))
            .map((c) => ({ name: c.name.replace(/\.md$/i, ''), path: c.path }))
        }
        if (f.isDirectory && f.children) {
          const found = findTemplates(f.children)
          if (found.length > 0) return found
        }
      }
      return []
    }

    return findTemplates(allFiles)
  }, [])

  const applyTemplate = useCallback(async (templatePath: string) => {
    try {
      const templateContent = await window.vault.readFile(templatePath)
      const { panes, activePaneId } = useVaultStore.getState()
      const activePane = panes.find((p) => p.id === activePaneId) ?? panes[0]
      const activeTab = activePane?.openTabs.find((t) => t.path === activePane?.activeTabPath)
      if (!activeTab) return

      const d = new Date()
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const title = activeTab.name.replace(/\.md$/i, '')

      const processed = templateContent
        .replace(/\{\{date\}\}/gi, date)
        .replace(/\{\{title\}\}/gi, title)

      const newContent = activeTab.content.trim()
        ? processed + '\n\n' + activeTab.content
        : processed

      useVaultStore.getState().setTabContent(activeTab.path, newContent)
      useVaultStore.getState().markTabDirty(activeTab.path, true)
    } catch (e) {
      console.error('[Bridge] applyTemplate error', e)
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
        "- **Daily note** — press `⌘D` to open today's note",
        '- **Search** — press `⌘K` to search across all notes',
        '- **Graph** — click the Graph tab in the sidebar to see your note network',
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
        'Happy writing! 📓'
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

  return {
    openVault,
    refreshFiles,
    openFile,
    saveFile,
    createFile,
    createCanvas,
    createDrawing,
    createFolder,
    renameFile,
    moveFile,
    deleteFile,
    revealFile,
    openVaultByPath,
    openDailyNote,
    saveImage,
    exportNote,
    exportPdf,
    createNewVault,
    listTemplates,
    applyTemplate
  }
}
