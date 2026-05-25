import { app, BrowserWindow, shell, protocol, Menu } from 'electron'
import { join, resolve, extname } from 'path'
import { readFile } from 'fs/promises'
import { AppSettings } from './settings'
import { parseAppPluginUrl, parsePluginUrl } from '../shared/pluginUrl'
import { registerIpcHandlers, getVaultManager, stopVaultWatcher } from './ipc'
import { resolveAppPluginFile } from './plugins'
import { buildAppMenuTemplate, getWindowOptions } from './platform'
import { resolveExistingPathWithinRoot } from './vault'

// Must be called before app is ready — tells Chromium vault:// is a secure scheme
// so it can be loaded from any origin (http://localhost in dev, file:// in prod)
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'vault',
    privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true }
  },
  {
    scheme: 'meridian-plugin',
    privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true }
  },
  {
    scheme: 'meridian-app-plugin',
    privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true }
  }
])

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json'
}

const settings = new AppSettings()

function buildMenu() {
  const template = buildAppMenuTemplate(process.platform)
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function createWindow(): BrowserWindow {
  const { windowBounds } = settings.get()
  const width = windowBounds?.width ?? 1200
  const height = windowBounds?.height ?? 800
  const x = windowBounds?.x
  const y = windowBounds?.y

  const win = new BrowserWindow(getWindowOptions(process.platform, { width, height, x, y }))

  win.on('resize', () => {
    const [width, height] = win.getSize()
    const [x, y] = win.getPosition()
    settings.setWindowBounds({ width, height, x, y })
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
    win.webContents.openDevTools()
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url)
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        shell.openExternal(url)
      } else {
        console.warn('[Main] Blocked window open for non-http/https protocol:', url)
      }
    } catch {
      // Ignore invalid URL
    }
    return { action: 'deny' }
  })

  return win
}

app.whenReady().then(() => {
  protocol.handle('vault', async (request) => {
    const url = new URL(request.url)
    // Chromium normalizes vault:///a/b.png → vault://a/b.png (host=a, path=/b.png)
    // Reconstruct full relative path from hostname + pathname
    const raw = url.hostname ? url.hostname + url.pathname : url.pathname
    const relativePath = decodeURIComponent(raw).replace(/^\/+/, '')
    const vm = getVaultManager()
    if (!vm) return new Response('No vault', { status: 503 })
    let fullPath: string
    try {
      fullPath = await resolveExistingPathWithinRoot(vm.vaultPath, relativePath)
    } catch {
      return new Response('Forbidden', { status: 403 })
    }
    try {
      const data = await readFile(fullPath)
      const contentType = MIME[extname(fullPath).toLowerCase()] ?? 'application/octet-stream'
      return new Response(data, { headers: { 'Content-Type': contentType } })
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })

  protocol.handle('meridian-plugin', async (request) => {
    const parsed = parsePluginUrl(request.url)
    if (!parsed) return new Response('Invalid plugin URL', { status: 400 })
    const { id: pluginId, path: fileSubpath } = parsed

    const vm = getVaultManager()
    if (!vm) return new Response('No vault', { status: 503 })

    const pluginsDir = resolve(vm.vaultPath, '.meridian', 'plugins')
    const pluginRoot = resolve(pluginsDir, pluginId)
    let fullPath: string
    try {
      await resolveExistingPathWithinRoot(vm.vaultPath, pluginRoot)
      fullPath = await resolveExistingPathWithinRoot(pluginRoot, resolve(pluginRoot, fileSubpath))
    } catch {
      return new Response('Forbidden', { status: 403 })
    }

    try {
      const data = await readFile(fullPath)
      const contentType = MIME[extname(fullPath).toLowerCase()] ?? 'application/octet-stream'
      return new Response(data, { headers: { 'Content-Type': contentType } })
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })

  protocol.handle('meridian-app-plugin', async (request) => {
    const parsed = parseAppPluginUrl(request.url)
    if (!parsed) return new Response('Invalid app plugin URL', { status: 400 })
    const { id: pluginId, path: fileSubpath } = parsed

    const pluginFile = await resolveAppPluginFile(pluginId, fileSubpath)
    if (!pluginFile) return new Response('Not found', { status: 404 })

    const { fullPath } = pluginFile

    try {
      const data = await readFile(fullPath)
      const contentType = MIME[extname(fullPath).toLowerCase()] ?? 'application/octet-stream'
      return new Response(data, { headers: { 'Content-Type': contentType } })
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })

  registerIpcHandlers(settings)
  createWindow()
  buildMenu()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  stopVaultWatcher()
})
