import { app, BrowserWindow, shell, protocol, Menu } from 'electron'
import { join, resolve, sep, extname } from 'path'
import { readFile } from 'fs/promises'
import { AppSettings } from './settings'
import { parseAppPluginUrl, parsePluginUrl } from '../shared/pluginUrl'
import { registerIpcHandlers, getVaultManager, stopVaultWatcher } from './ipc'
import { resolveAppPluginFile } from './plugins'
import { buildWindowOptions } from './platform'

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

function send(action: string) {
  BrowserWindow.getFocusedWindow()?.webContents.send('menu:action', action)
}

function buildMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'New Note', accelerator: 'CmdOrCtrl+N', click: () => send('new-file') },
        { label: 'New Daily Note', accelerator: 'CmdOrCtrl+D', click: () => send('daily-note') },
        { type: 'separator' },
        { label: 'Open Vault…', accelerator: 'CmdOrCtrl+O', click: () => send('open-vault') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => send('save') },
        { label: 'Export to HTML…', accelerator: 'CmdOrCtrl+E', click: () => send('export-html') },
        {
          label: 'Export to PDF…',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => send('export-pdf')
        },
        { type: 'separator' },
        { label: 'Close Tab', accelerator: 'CmdOrCtrl+W', click: () => send('close-tab') }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Command Palette',
          accelerator: 'CmdOrCtrl+K',
          click: () => send('command-palette')
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: () => send('settings') },
        { type: 'separator' },
        { label: 'Graph View', accelerator: 'CmdOrCtrl+Shift+G', click: () => send('graph-view') },
        { label: 'Reset Layout', click: () => send('reset-layout') },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { type: 'separator' }, { role: 'front' }]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'GitHub Repository',
          click: () => shell.openExternal('https://github.com/avedevelop/meridian')
        }
      ]
    }
  ]

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    })
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function createWindow(): BrowserWindow {
  const { windowBounds } = settings.get()
  const width = windowBounds?.width ?? 1200
  const height = windowBounds?.height ?? 800
  const x = windowBounds?.x
  const y = windowBounds?.y

  const win = new BrowserWindow({
    ...buildWindowOptions(process.platform, { width, height, x, y }),
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

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
    const vaultResolved = resolve(vm.vaultPath)
    const fullPath = resolve(vm.vaultPath, relativePath)
    if (!fullPath.startsWith(vaultResolved + sep)) {
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
    const fullPath = resolve(pluginRoot, fileSubpath)

    // Security check: must be inside the specific plugin root directory
    if (!fullPath.startsWith(pluginRoot + sep) && fullPath !== pluginRoot) {
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

    const { root: pluginRoot, fullPath } = pluginFile
    if (!fullPath.startsWith(pluginRoot + sep) && fullPath !== pluginRoot) {
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
