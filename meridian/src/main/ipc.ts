import { BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { basename, isAbsolute, resolve } from 'path'
import chokidar, { type FSWatcher } from 'chokidar'
import { IPC, type VaultFileChangeEvent, type VaultFileChangeType } from '../shared/types'
import { VaultManager } from './vault'
import { AppSettings } from './settings'

let vaultManager: VaultManager | null = null
let vaultWatcher: FSWatcher | null = null
let watcherSession = 0

const WATCH_EVENT_TYPES = new Set<VaultFileChangeType>([
  'add',
  'change',
  'unlink',
  'addDir',
  'unlinkDir'
])

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

  ipcMain.handle(IPC.VAULT_EXPORT_HTML, async (_event, suggestedName: string, html: string) => {
    const result = await dialog.showSaveDialog({
      title: 'Export Note as HTML',
      defaultPath: suggestedName,
      filters: [{ name: 'HTML Files', extensions: ['html'] }],
      buttonLabel: 'Export'
    })
    if (result.canceled || !result.filePath) return null
    const { writeFile } = await import('fs/promises')
    await writeFile(result.filePath, html, 'utf-8')
    return result.filePath
  })

  ipcMain.handle(IPC.VAULT_EXPORT_PDF, async (_event, suggestedName: string, html: string) => {
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

    try {
      await wf(tmpHtml, html, 'utf-8')
      const { BrowserWindow: BW } = await import('electron')
      const win = new BW({ show: false, webPreferences: { javascript: false, sandbox: true } })
      await win.loadFile(tmpHtml)
      const pdfData = await win.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4'
      })
      win.close()
      await wf(filePath, pdfData)
      return filePath
    } finally {
      try { await unlink(tmpHtml) } catch { /* ignore */ }
    }
  })

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

  ipcMain.handle(IPC.VAULT_OPEN_EXTERNAL, async (_event, url: string) => {
    try {
      await shell.openExternal(url)
    } catch (e) {
      console.error('[IPC] openExternal error:', e)
    }
  })

  ipcMain.handle(IPC.GIT_STATUS, async () => {
    if (!vaultManager) return { isRepo: false }
    const cwd = vaultManager.vaultPath
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)

    try {
      await execAsync('git rev-parse --is-inside-work-tree', { cwd })
      const { stdout } = await execAsync('git status --porcelain', { cwd })
      const lines = stdout.split('\n').filter(Boolean)
      return { isRepo: true, clean: lines.length === 0, changesCount: lines.length }
    } catch (e) {
      return { isRepo: false }
    }
  })

  ipcMain.handle(IPC.GIT_COMMIT, async (_event, message?: string) => {
    if (!vaultManager) throw new Error('No vault open')
    const cwd = vaultManager.vaultPath
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)

    const msg = message || `Meridian auto-commit: ${new Date().toISOString()}`
    try {
      await execAsync('git add .', { cwd })
      // Check if there are staged changes to commit
      const { stdout: diffOut } = await execAsync('git diff --cached --name-only', { cwd })
      if (!diffOut.trim()) {
        return { success: true, message: 'Nothing to commit' }
      }
      await execAsync(`git commit -m "${msg.replace(/"/g, '\\"')}"`, { cwd })
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message || String(e) }
    }
  })

  ipcMain.handle(IPC.GIT_SYNC, async () => {
    if (!vaultManager) throw new Error('No vault open')
    const cwd = vaultManager.vaultPath
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)

    try {
      // Pull with rebase, then push
      await execAsync('git pull --rebase', { cwd })
      await execAsync('git push', { cwd })
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message || String(e) }
    }
  })
}

export function getVaultManager(): VaultManager | null {
  return vaultManager
}

export function setVaultManager(vm: VaultManager): void {
  vaultManager = vm
}
