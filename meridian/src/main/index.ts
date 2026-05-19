import { app, BrowserWindow, shell, protocol } from 'electron'
import { join, resolve, sep, extname } from 'path'
import { readFile } from 'fs/promises'
import { AppSettings } from './settings'
import { registerIpcHandlers, getVaultManager } from './ipc'

const MIME: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4', '.pdf': 'application/pdf',
}

const settings = new AppSettings()

function createWindow(): BrowserWindow {
  const { windowBounds } = settings.get()

  const win = new BrowserWindow({
    width: windowBounds.width,
    height: windowBounds.height,
    x: windowBounds.x,
    y: windowBounds.y,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
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
    shell.openExternal(url)
    return { action: 'deny' }
  })

  return win
}

app.whenReady().then(() => {
  protocol.handle('vault', async (request) => {
    const url = new URL(request.url)
    const relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, '')
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

  registerIpcHandlers(settings)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
