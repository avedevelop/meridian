import { app, BrowserWindow, shell, protocol, net } from 'electron'
import { join } from 'path'
import { AppSettings } from './settings'
import { registerIpcHandlers, getVaultManager } from './ipc'

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
  protocol.handle('vault', (request) => {
    const url = new URL(request.url)
    const relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, '')
    const vm = getVaultManager()
    if (!vm) return new Response('No vault', { status: 503 })
    const { resolve: res } = require('path')
    const fullPath = res(vm.vaultPath, relativePath)
    if (!fullPath.startsWith(res(vm.vaultPath))) {
      return new Response('Forbidden', { status: 403 })
    }
    return net.fetch(`file://${fullPath}`)
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
