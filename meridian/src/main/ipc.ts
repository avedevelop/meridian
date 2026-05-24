import { BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { basename, isAbsolute, resolve, sep } from 'path'
import chokidar, { type FSWatcher } from 'chokidar'
import {
  IPC,
  type PluginManifest,
  type PluginFileChangeEvent,
  type VaultFileChangeEvent,
  type VaultFileChangeType
} from '../shared/types'
import { buildAppPluginUrl, buildPluginUrl } from '../shared/pluginUrl'
import { VaultManager } from './vault'
import { AppSettings } from './settings'
import { ensureUserPluginsDir, listAppPluginManifests, resolveAppPluginFile } from './plugins'

let vaultManager: VaultManager | null = null
let vaultWatcher: FSWatcher | null = null
let watcherSession = 0
let pluginWatcher: FSWatcher | null = null
let pluginWatcherSession = 0
const pluginChangeDebounce = new Map<string, NodeJS.Timeout>()
const PLUGIN_DEBOUNCE_MS = 300

const WATCH_EVENT_TYPES = new Set<VaultFileChangeType>([
  'add',
  'change',
  'unlink',
  'addDir',
  'unlinkDir'
])

async function listAvailablePluginManifests(): Promise<PluginManifest[]> {
  const manifests = await listAppPluginManifests()
  const seenIds = new Set(manifests.map((manifest) => manifest.id))

  if (vaultManager) {
    const vaultManifests = await vaultManager.listPluginManifests()
    for (const manifest of vaultManifests) {
      if (!seenIds.has(manifest.id)) {
        manifests.push(manifest)
        seenIds.add(manifest.id)
      }
    }
  }

  return manifests
}

function toAbsoluteVaultPath(manager: VaultManager, changedPath: string): string {
  return isAbsolute(changedPath) ? changedPath : resolve(manager.vaultPath, changedPath)
}

async function emitVaultFileChange(
  manager: VaultManager,
  type: VaultFileChangeType,
  changedPath: string
): Promise<void> {
  const absolutePath = toAbsoluteVaultPath(manager, changedPath)
  const event: VaultFileChangeEvent = {
    type,
    path: absolutePath,
    vaultPath: manager.vaultPath,
    file: null
  }

  if (type === 'add' || type === 'change' || type === 'addDir') {
    try {
      event.file = await manager.getFile(absolutePath)
    } catch {
      // File may have disappeared between chokidar emitting and stat/read.
    }
  }

  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send(IPC.FILE_CHANGED, event)
  })
}

function startVaultWatcher(manager: VaultManager): void {
  watcherSession += 1
  const session = watcherSession
  const previousWatcher = vaultWatcher
  if (previousWatcher) void previousWatcher.close()

  vaultWatcher = chokidar.watch(manager.vaultPath, {
    ignoreInitial: true,
    ignored: /(^|[/\\])\../,
    awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 }
  })

  vaultWatcher.on('all', (eventName, changedPath) => {
    if (!WATCH_EVENT_TYPES.has(eventName as VaultFileChangeType)) return
    if (session !== watcherSession || manager !== vaultManager) return
    void emitVaultFileChange(manager, eventName as VaultFileChangeType, String(changedPath))
  })

  vaultWatcher.on('error', (error) => {
    console.error('[Watcher] vault watcher error:', error)
  })
}

export function stopVaultWatcher(): void {
  watcherSession += 1
  const currentWatcher = vaultWatcher
  vaultWatcher = null
  if (currentWatcher) void currentWatcher.close()
  stopPluginWatcher()
}

function emitPluginFileChanged(manager: VaultManager, pluginId: string): void {
  const event: PluginFileChangeEvent = {
    pluginId,
    vaultPath: manager.vaultPath
  }
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send(IPC.PLUGIN_FILE_CHANGED, event)
  })
}

function startPluginWatcher(manager: VaultManager): void {
  pluginWatcherSession += 1
  const session = pluginWatcherSession
  const previousWatcher = pluginWatcher
  if (previousWatcher) void previousWatcher.close()
  for (const timer of pluginChangeDebounce.values()) clearTimeout(timer)
  pluginChangeDebounce.clear()

  const pluginsRoot = resolve(manager.vaultPath, '.meridian', 'plugins')

  pluginWatcher = chokidar.watch(pluginsRoot, {
    ignoreInitial: true,
    depth: 4,
    awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 }
  })

  pluginWatcher.on('all', (eventName, changedPath) => {
    if (session !== pluginWatcherSession || manager !== vaultManager) return
    if (eventName !== 'add' && eventName !== 'change' && eventName !== 'unlink') return
    const absolute = isAbsolute(changedPath)
      ? changedPath
      : resolve(pluginsRoot, String(changedPath))
    if (!absolute.startsWith(pluginsRoot + sep)) return

    const relative = absolute.slice(pluginsRoot.length + 1)
    const [pluginId, ...rest] = relative.split(sep)
    if (!pluginId || rest.length === 0) return
    const fileName = rest.join(sep)
    if (fileName !== 'main.js' && fileName !== 'manifest.json') return

    const existing = pluginChangeDebounce.get(pluginId)
    if (existing) clearTimeout(existing)
    const timer = setTimeout(() => {
      pluginChangeDebounce.delete(pluginId)
      if (session !== pluginWatcherSession || manager !== vaultManager) return
      emitPluginFileChanged(manager, pluginId)
    }, PLUGIN_DEBOUNCE_MS)
    pluginChangeDebounce.set(pluginId, timer)
  })

  pluginWatcher.on('error', (error) => {
    console.error('[Watcher] plugin watcher error:', error)
  })
}

function stopPluginWatcher(): void {
  pluginWatcherSession += 1
  const current = pluginWatcher
  pluginWatcher = null
  if (current) void current.close()
  for (const timer of pluginChangeDebounce.values()) clearTimeout(timer)
  pluginChangeDebounce.clear()
}

export function registerIpcHandlers(settings: AppSettings): void {
  ipcMain.handle(IPC.VAULT_OPEN_DIALOG, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Open Vault',
      buttonLabel: 'Open Vault'
    })
    if (result.canceled || result.filePaths.length === 0) return null

    const vaultPath = result.filePaths[0]
    const name = basename(vaultPath) || 'Vault'
    vaultManager = new VaultManager(vaultPath)
    startVaultWatcher(vaultManager)
    startPluginWatcher(vaultManager)
    settings.addRecentVault(vaultPath, name)
    settings.setLastVault(vaultPath)
    return { path: vaultPath, name }
  })

  ipcMain.handle(IPC.VAULT_OPEN_BY_PATH, async (_event, vaultPath: string) => {
    const { stat } = await import('fs/promises')
    try {
      const info = await stat(vaultPath)
      if (!info.isDirectory()) throw new Error('Not a directory')
    } catch {
      return null
    }
    const name = basename(vaultPath) || 'Vault'
    vaultManager = new VaultManager(vaultPath)
    startVaultWatcher(vaultManager)
    startPluginWatcher(vaultManager)
    settings.addRecentVault(vaultPath, name)
    settings.setLastVault(vaultPath)
    return { path: vaultPath, name }
  })

  ipcMain.handle(IPC.VAULT_LIST_FILES, async () => {
    if (!vaultManager) throw new Error('No vault open')
    return vaultManager.listFiles()
  })

  ipcMain.handle(IPC.VAULT_READ_FILE, async (_event, filePath: string) => {
    if (!vaultManager) throw new Error('No vault open')
    // Reject binary file extensions before trying to read
    const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
    const binaryExts = [
      'png',
      'jpg',
      'jpeg',
      'gif',
      'webp',
      'svg',
      'ico',
      'bmp',
      'tiff',
      'pdf',
      'zip',
      'gz',
      'tar',
      'exe',
      'dmg',
      'app',
      'bin',
      'dll',
      'so',
      'dylib',
      'mp3',
      'mp4',
      'mov',
      'avi',
      'wav',
      'flac',
      'ogg',
      'woff',
      'woff2',
      'ttf',
      'eot'
    ]
    if (binaryExts.includes(ext)) throw new Error(`Cannot read binary file: ${ext}`)
    return vaultManager.readFile(filePath)
  })

  ipcMain.handle(IPC.VAULT_WRITE_FILE, async (_event, filePath: string, content: string) => {
    if (!vaultManager) throw new Error('No vault open')
    return vaultManager.writeFile(filePath, content)
  })

  ipcMain.handle(IPC.VAULT_CREATE_FILE, async (_event, dir: string, name: string) => {
    if (!vaultManager) throw new Error('No vault open')
    return vaultManager.createFile(dir, name)
  })

  ipcMain.handle(IPC.VAULT_CREATE_DIR, async (_event, parentDir: string, name: string) => {
    if (!vaultManager) throw new Error('No vault open')
    return vaultManager.createDirectory(parentDir, name)
  })

  ipcMain.handle(IPC.VAULT_WRITE_BINARY, async (_event, filePath: string, base64: string) => {
    if (!vaultManager) throw new Error('No vault open')
    const { resolve: res, sep: s } = await import('path')
    const resolved = res(filePath)
    const vaultResolved = res(vaultManager.vaultPath)
    if (!resolved.startsWith(vaultResolved + s)) throw new Error('Path outside vault')
    const { writeFile: wf } = await import('fs/promises')
    const { mkdirSync } = await import('fs')
    mkdirSync(res(resolved, '..'), { recursive: true })
    await wf(filePath, Buffer.from(base64, 'base64'))
    return filePath
  })

  ipcMain.handle(IPC.VAULT_DELETE_FILE, async (_event, filePath: string) => {
    if (!vaultManager) throw new Error('No vault open')
    return vaultManager.deleteFile(filePath)
  })

  ipcMain.handle(IPC.VAULT_MOVE_FILE, async (_event, sourcePath: string, targetDir: string) => {
    if (!vaultManager) throw new Error('No vault open')
    return vaultManager.moveFile(sourcePath, targetDir)
  })

  ipcMain.handle(IPC.VAULT_REVEAL_FILE, async (_event, filePath: string) => {
    shell.showItemInFolder(filePath)
  })

  ipcMain.handle(IPC.VAULT_RENAME_FILE, async (_event, oldPath: string, newName: string) => {
    console.log('[IPC] rename:', oldPath, '->', newName)
    if (!vaultManager) throw new Error('No vault open')
    try {
      const result = await vaultManager.renameFile(oldPath, newName)
      console.log('[IPC] rename success:', result)
      return result
    } catch (e) {
      console.error('[IPC] rename error:', e)
      throw e
    }
  })

  ipcMain.handle(IPC.SETTINGS_GET, async () => {
    return settings.get()
  })

  ipcMain.handle(IPC.SETTINGS_SET, async (_event, key: string, value: unknown) => {
    if (key === 'lastVault') settings.setLastVault(value as string)
  })

  ipcMain.handle(IPC.PREFERENCES_GET, async () => {
    try {
      const { readFileSync, existsSync } = await import('fs')
      const { join } = await import('path')
      const { app } = await import('electron')
      const prefPath = join(app.getPath('userData'), 'meridian', 'preferences.json')
      if (existsSync(prefPath)) {
        return JSON.parse(readFileSync(prefPath, 'utf-8'))
      }
    } catch (e) {
      console.error('[IPC] Error reading preferences:', e)
    }
    return {}
  })

  ipcMain.handle(IPC.PREFERENCES_SET, async (_event, prefs: Record<string, unknown>) => {
    try {
      const { writeFileSync } = await import('fs')
      const { join } = await import('path')
      const { app } = await import('electron')
      const prefPath = join(app.getPath('userData'), 'meridian', 'preferences.json')
      writeFileSync(prefPath, JSON.stringify(prefs, null, 2), 'utf-8')
    } catch (e) {
      console.error('[IPC] Error writing preferences:', e)
    }
  })

  ipcMain.handle(
    IPC.VAULT_EXPORT_HTML,
    async (_event, suggestedName: string, html: string, customCSS: string = '') => {
      const result = await dialog.showSaveDialog({
        title: 'Export Note as HTML',
        defaultPath: suggestedName,
        filters: [{ name: 'HTML Files', extensions: ['html'] }],
        buttonLabel: 'Export'
      })
      if (result.canceled || !result.filePath) return null
      const finalHtml = customCSS
        ? html.replace('</head>', `<style>${customCSS}</style></head>`)
        : html
      const { writeFile } = await import('fs/promises')
      await writeFile(result.filePath, finalHtml, 'utf-8')
      return result.filePath
    }
  )

  ipcMain.handle(
    IPC.VAULT_EXPORT_PDF,
    async (
      _event,
      suggestedName: string,
      html: string,
      pageSize: 'A4' | 'Letter' = 'A4',
      customCSS: string = ''
    ) => {
      const { filePath } = await dialog.showSaveDialog({
        title: 'Export Note as PDF',
        defaultPath: suggestedName,
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
        buttonLabel: 'Export'
      })
      if (!filePath) return null

      const { tmpdir } = await import('os')
      const { join: joinPath } = await import('path')
      const { writeFile: wf, unlink } = await import('fs/promises')
      const tmpHtml = joinPath(tmpdir(), `meridian-pdf-${Date.now()}.html`)

      const finalHtml = customCSS
        ? html.replace('</head>', `<style>${customCSS}</style></head>`)
        : html

      try {
        await wf(tmpHtml, finalHtml, 'utf-8')
        const { BrowserWindow: BW } = await import('electron')
        const win = new BW({ show: false, webPreferences: { javascript: false, sandbox: true } })
        await win.loadFile(tmpHtml)
        const pdfData = await win.webContents.printToPDF({
          printBackground: true,
          pageSize: pageSize
        })
        win.close()
        await wf(filePath, pdfData)
        return filePath
      } finally {
        try {
          await unlink(tmpHtml)
        } catch {
          /* ignore */
        }
      }
    }
  )

  ipcMain.handle(IPC.VAULT_SAVE_VIDEO, async (_event, data: Uint8Array) => {
    const { filePath } = await dialog.showSaveDialog({
      title: 'Export Graph Animation',
      defaultPath: 'meridian-graph.webm',
      filters: [{ name: 'WebM Video', extensions: ['webm'] }]
    })
    if (!filePath) return null
    const { writeFile } = await import('fs/promises')
    await writeFile(filePath, data)
    return filePath
  })

  ipcMain.handle(IPC.VAULT_FETCH_URL_METADATA, async (_event, url: string) => {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      })
      if (!response.ok) throw new Error(`HTTP error ${response.status}`)
      const html = await response.text()

      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
      const title = titleMatch ? titleMatch[1].trim() : ''

      const ogTitleMatch =
        html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)
      const ogTitle = ogTitleMatch ? ogTitleMatch[1].trim() : ''

      const ogDescMatch =
        html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i) ||
        html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)
      const ogDesc = ogDescMatch ? ogDescMatch[1].trim() : ''

      const ogImgMatch =
        html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
        html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i)
      const ogImg = ogImgMatch ? ogImgMatch[1].trim() : ''

      return {
        title: ogTitle || title || url,
        description: ogDesc,
        image: ogImg,
        url
      }
    } catch (e) {
      console.error('[IPC] fetchUrlMetadata error:', e)
      return {
        title: url,
        description: 'Failed to fetch preview metadata',
        image: '',
        url
      }
    }
  })

  ipcMain.handle(IPC.OPEN_PATH, async (_event, filePath: string) => {
    await shell.openPath(filePath)
  })

  ipcMain.handle(IPC.WELCOME_DOWNLOAD, async (_event, destPath: string) => {
    const https = await import('https')
    const { createWriteStream, createReadStream, mkdirSync, rmSync, renameSync, existsSync } =
      await import('fs')
    const { join } = await import('path')
    const { tmpdir } = await import('os')
    const unzipper = await import('unzipper')

    const zipUrl = 'https://github.com/bvsmma/meridian-welcome/archive/refs/heads/main.zip'
    const tmpZip = join(tmpdir(), `meridian-welcome-${Date.now()}.zip`)
    const tmpExtract = join(tmpdir(), `meridian-welcome-extract-${Date.now()}`)

    // Download ZIP
    await new Promise<void>((resolve, reject) => {
      const follow = (url: string) => {
        https
          .get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
              follow(res.headers.location!)
              return
            }
            const file = createWriteStream(tmpZip)
            res.pipe(file)
            file.on('finish', () => file.close(() => resolve()))
            file.on('error', reject)
          })
          .on('error', reject)
      }
      follow(zipUrl)
    })

    // Extract ZIP
    mkdirSync(tmpExtract, { recursive: true })
    await new Promise<void>((resolve, reject) => {
      createReadStream(tmpZip)
        .pipe(unzipper.Extract({ path: tmpExtract }))
        .on('close', resolve)
        .on('error', reject)
    })

    // The ZIP extracts to meridian-welcome-main/ subfolder — move its contents to destPath
    const { readdirSync } = await import('fs')
    const extracted = readdirSync(tmpExtract)[0]
    const extractedPath = join(tmpExtract, extracted)

    if (existsSync(destPath)) rmSync(destPath, { recursive: true, force: true })
    renameSync(extractedPath, destPath)

    // Cleanup
    try {
      rmSync(tmpZip)
    } catch {
      /* ignore */
    }
    try {
      rmSync(tmpExtract, { recursive: true })
    } catch {
      /* ignore */
    }

    return destPath
  })

  ipcMain.handle(IPC.VAULT_OPEN_EXTERNAL, async (_event, url: string) => {
    try {
      const parsed = new URL(url)
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        await shell.openExternal(url)
      } else {
        console.warn('[IPC] Blocked openExternal call for non-http/https protocol:', url)
      }
    } catch (e) {
      console.error('[IPC] openExternal error:', e)
    }
  })

  ipcMain.handle(IPC.GIT_STATUS, async () => {
    if (!vaultManager) return { isRepo: false }
    const cwd = vaultManager.vaultPath
    const { execFile } = await import('child_process')
    const { promisify } = await import('util')
    const execFileAsync = promisify(execFile)

    try {
      await execFileAsync('git', ['rev-parse', '--is-inside-work-tree'], { cwd })
      const { stdout } = await execFileAsync('git', ['status', '--porcelain'], { cwd })
      const lines = stdout.split('\n').filter(Boolean)

      const changes = lines.map((line) => {
        const status = line.slice(0, 2)
        const path = line.slice(2).trim()

        let type: 'modified' | 'added' | 'deleted' | 'untracked' | 'unknown' = 'unknown'
        if (status.includes('M')) type = 'modified'
        else if (status.includes('A')) type = 'added'
        else if (status.includes('D')) type = 'deleted'
        else if (status.includes('?')) type = 'untracked'

        return { path, status: type }
      })

      let hasRemote = false
      try {
        const { stdout: remoteOut } = await execFileAsync('git', ['remote'], { cwd })
        hasRemote = remoteOut.trim().length > 0
      } catch {
        hasRemote = false
      }

      return {
        isRepo: true,
        clean: lines.length === 0,
        changesCount: lines.length,
        changes,
        hasRemote
      }
    } catch {
      return { isRepo: false }
    }
  })

  ipcMain.handle(IPC.GIT_INIT, async () => {
    if (!vaultManager) throw new Error('No vault open')
    const cwd = vaultManager.vaultPath
    const { execFile } = await import('child_process')
    const { promisify } = await import('util')
    const execFileAsync = promisify(execFile)

    try {
      await execFileAsync('git', ['init'], { cwd })
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message || String(e) }
    }
  })

  ipcMain.handle(IPC.GIT_COMMIT, async (_event, message?: string) => {
    if (!vaultManager) throw new Error('No vault open')
    const cwd = vaultManager.vaultPath
    const { execFile } = await import('child_process')
    const { promisify } = await import('util')
    const execFileAsync = promisify(execFile)

    const msg = message || `Meridian auto-commit: ${new Date().toISOString()}`
    try {
      await execFileAsync('git', ['add', '.'], { cwd })
      // Check if there are staged changes to commit
      const { stdout: diffOut } = await execFileAsync('git', ['diff', '--cached', '--name-only'], {
        cwd
      })
      if (!diffOut.trim()) {
        return { success: true, message: 'Nothing to commit' }
      }
      await execFileAsync('git', ['commit', '-m', msg], { cwd })
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message || String(e) }
    }
  })

  ipcMain.handle(IPC.GIT_SYNC, async (_event, defaultBranch: string = 'main') => {
    if (!vaultManager) throw new Error('No vault open')
    const cwd = vaultManager.vaultPath
    const { execFile } = await import('child_process')
    const { promisify } = await import('util')
    const execFileAsync = promisify(execFile)

    try {
      // Check if remote is configured
      const { stdout: remoteStdout } = await execFileAsync('git', ['remote'], { cwd })
      const hasRemote = remoteStdout.trim().length > 0

      if (hasRemote) {
        const { stdout: branchOut } = await execFileAsync(
          'git',
          ['rev-parse', '--abbrev-ref', 'HEAD'],
          { cwd }
        )
        const branch = branchOut.trim() || defaultBranch
        const { githubToken } = settings.get()

        // Get remote URL and temporarily embed token for auth
        const { stdout: remoteUrlOut } = await execFileAsync(
          'git',
          ['remote', 'get-url', 'origin'],
          { cwd }
        )
        const remoteUrl = remoteUrlOut.trim()
        let authUrl = remoteUrl

        if (githubToken && remoteUrl.startsWith('https://')) {
          try {
            const u = new URL(remoteUrl)
            u.username = 'oauth2'
            u.password = githubToken
            authUrl = u.toString()
            await execFileAsync('git', ['remote', 'set-url', 'origin', authUrl], { cwd })
          } catch {
            /* leave URL unchanged */
          }
        }

        try {
          // Check if remote has any refs (empty repo on first push)
          const { stdout: lsRemote } = await execFileAsync(
            'git',
            ['ls-remote', '--heads', 'origin'],
            { cwd }
          ).catch(() => ({ stdout: '' }))
          if (lsRemote.trim().length > 0) {
            await execFileAsync('git', ['pull', '--rebase', 'origin', branch], { cwd })
          }
          await execFileAsync('git', ['push', '-u', 'origin', branch], { cwd })
        } finally {
          // Always restore clean URL (no token in git config)
          if (authUrl !== remoteUrl) {
            await execFileAsync('git', ['remote', 'set-url', 'origin', remoteUrl], { cwd }).catch(
              () => {}
            )
          }
        }
        return { success: true }
      } else {
        return { success: true, noRemote: true }
      }
    } catch (e: any) {
      return { success: false, error: e.message || String(e) }
    }
  })

  ipcMain.handle(IPC.GIT_LOG, async () => {
    if (!vaultManager) throw new Error('No vault open')
    const cwd = vaultManager.vaultPath
    const { execFile } = await import('child_process')
    const { promisify } = await import('util')
    const execFileAsync = promisify(execFile)

    try {
      const { stdout } = await execFileAsync(
        'git',
        ['log', '-n', '50', '--pretty=format:%H|%an|%ad|%s', '--date=short'],
        { cwd }
      )
      const commits = stdout
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => {
          const [hash, author, date, subject] = line.split('|')
          return {
            hash,
            shortHash: hash ? hash.slice(0, 7) : '',
            author: author || '',
            date: date || '',
            subject: subject || ''
          }
        })
      return { success: true, commits }
    } catch (e: any) {
      const errorMsg = e.message || String(e)
      if (
        errorMsg.includes('does not have any commits') ||
        errorMsg.includes('fatal: bad default revision')
      ) {
        return { success: true, commits: [] }
      }
      return { success: false, error: errorMsg }
    }
  })

  ipcMain.handle(IPC.GIT_SHOW_HEAD, async (_event, relativePath: string) => {
    if (!vaultManager) throw new Error('No vault open')
    const cwd = vaultManager.vaultPath
    const { execFile } = await import('child_process')
    const { promisify } = await import('util')
    const execFileAsync = promisify(execFile)

    try {
      const normalizedPath = relativePath.replace(/\\/g, '/')
      const { stdout } = await execFileAsync('git', ['show', `HEAD:${normalizedPath}`], { cwd })
      return { success: true, content: stdout }
    } catch {
      return { success: true, content: '' }
    }
  })

  ipcMain.handle(IPC.GIT_SET_REMOTE, async (_event, url: string) => {
    if (!vaultManager) throw new Error('No vault open')
    const cwd = vaultManager.vaultPath
    const { execFile } = await import('child_process')
    const { promisify } = await import('util')
    const execFileAsync = promisify(execFile)

    try {
      const { stdout } = await execFileAsync('git', ['remote'], { cwd })
      const hasOrigin = stdout.trim().split('\n').includes('origin')
      if (hasOrigin) {
        await execFileAsync('git', ['remote', 'set-url', 'origin', url], { cwd })
      } else {
        await execFileAsync('git', ['remote', 'add', 'origin', url], { cwd })
      }
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message || String(e) }
    }
  })

  const GITHUB_CLIENT_ID = 'Ov23liarJdcZj6OwZFa9'

  ipcMain.handle(IPC.GIT_GITHUB_DEVICE_CODE, async () => {
    try {
      const res = await fetch('https://github.com/login/device/code', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, scope: 'repo' })
      })
      const data = (await res.json()) as {
        device_code: string
        user_code: string
        verification_uri: string
        expires_in: number
        interval: number
      }
      return { success: true, ...data }
    } catch (e: any) {
      return { success: false, error: e.message || String(e) }
    }
  })

  ipcMain.handle(IPC.GIT_GITHUB_POLL_TOKEN, async (_event, deviceCode: string) => {
    try {
      const res = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        })
      })
      const data = (await res.json()) as {
        access_token?: string
        error?: string
        token_type?: string
      }
      if (data.access_token) {
        // Fetch GitHub username
        const userRes = await fetch('https://api.github.com/user', {
          headers: { Authorization: `token ${data.access_token}`, Accept: 'application/json' }
        })
        const user = (await userRes.json()) as { login?: string }
        settings.setGithubToken(data.access_token, user.login ?? '')
        return { success: true, username: user.login ?? '' }
      }
      return {
        success: false,
        pending: data.error === 'authorization_pending' || data.error === 'slow_down'
      }
    } catch (e: any) {
      return { success: false, error: e.message || String(e) }
    }
  })

  ipcMain.handle(IPC.GIT_GITHUB_LOGOUT, () => {
    settings.setGithubToken('', '')
    return { success: true }
  })

  ipcMain.handle(IPC.GIT_GITHUB_STATUS, () => {
    const { githubToken, githubUsername } = settings.get()
    return { connected: !!githubToken, username: githubUsername ?? '' }
  })

  ipcMain.handle(IPC.SPELL_SET_LANGUAGE, async (event, lang: string) => {
    event.sender.session.setSpellCheckerLanguages([lang])
  })

  ipcMain.handle(IPC.GET_CONFIG_PATH, async () => {
    const { app } = await import('electron')
    return app.getPath('userData')
  })

  ipcMain.handle(IPC.PLUGIN_LIST, async () => {
    return listAvailablePluginManifests()
  })

  ipcMain.handle(IPC.PLUGIN_OPEN_FOLDER, async () => {
    const pluginsDir = await ensureUserPluginsDir()
    await shell.openPath(pluginsDir)
    return pluginsDir
  })

  ipcMain.handle(IPC.PLUGIN_LOAD, async (_event, id: string) => {
    const manifests = await listAvailablePluginManifests()
    const manifest = manifests.find((m) => m.id === id)
    if (!manifest) throw new Error(`Plugin not found: ${id}`)
    const mainFile = manifest.main || 'main.js'
    const { join } = await import('path')
    const { stat } = await import('fs/promises')

    if (manifest.source === 'bundled' || manifest.source === 'user') {
      const pluginFile = await resolveAppPluginFile(id, mainFile, manifest.source)
      if (!pluginFile) throw new Error(`Failed to access app plugin main file: ${mainFile}`)
      const url = buildAppPluginUrl(id, mainFile)
      if (!url) throw new Error(`Invalid app plugin id or main file: ${id} / ${mainFile}`)
      return url
    }

    if (!vaultManager) throw new Error('No vault open')
    const pluginsDir = join(vaultManager.vaultPath, '.meridian', 'plugins')
    const mainFilePath = join(pluginsDir, id, mainFile)
    try {
      const stats = await stat(mainFilePath)
      if (!stats.isFile()) throw new Error(`Main file is not a file: ${mainFile}`)
    } catch (err) {
      throw new Error(`Failed to access plugin main file: ${mainFile}. ${err}`)
    }
    const url = buildPluginUrl(id, mainFile)
    if (!url) throw new Error(`Invalid plugin id or main file: ${id} / ${mainFile}`)
    return url
  })
}

export function getVaultManager(): VaultManager | null {
  return vaultManager
}

export function setVaultManager(vm: VaultManager): void {
  vaultManager = vm
}
