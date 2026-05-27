import { app, BrowserWindow, shell, protocol, Menu } from 'electron'
import { join, resolve, sep, extname } from 'path'
import { readFile } from 'fs/promises'
import { existsSync, readFileSync } from 'fs'
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

type MenuLanguage = 'en' | 'ru'

const menuLabels: Record<
  MenuLanguage,
  {
    file: string
    edit: string
    view: string
    window: string
    help: string
    newNote: string
    newDailyNote: string
    openVault: string
    save: string
    exportHtml: string
    exportPdf: string
    closeTab: string
    undo: string
    redo: string
    cut: string
    copy: string
    paste: string
    selectAll: string
    commandPalette: string
    settings: string
    graphView: string
    resetLayout: string
    reload: string
    toggleDevTools: string
    resetZoom: string
    zoomIn: string
    zoomOut: string
    toggleFullscreen: string
    minimize: string
    zoom: string
    front: string
    githubRepository: string
  }
> = {
  en: {
    file: 'File',
    edit: 'Edit',
    view: 'View',
    window: 'Window',
    help: 'Help',
    newNote: 'New Note',
    newDailyNote: 'New Daily Note',
    openVault: 'Open Vault…',
    save: 'Save',
    exportHtml: 'Export to HTML…',
    exportPdf: 'Export to PDF…',
    closeTab: 'Close Tab',
    undo: 'Undo',
    redo: 'Redo',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    selectAll: 'Select All',
    commandPalette: 'Command Palette',
    settings: 'Settings',
    graphView: 'Graph View',
    resetLayout: 'Reset Layout',
    reload: 'Reload',
    toggleDevTools: 'Toggle Developer Tools',
    resetZoom: 'Actual Size',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    toggleFullscreen: 'Toggle Full Screen',
    minimize: 'Minimize',
    zoom: 'Zoom',
    front: 'Bring All to Front',
    githubRepository: 'GitHub Repository'
  },
  ru: {
    file: 'Файл',
    edit: 'Правка',
    view: 'Вид',
    window: 'Окно',
    help: 'Справка',
    newNote: 'Новая заметка',
    newDailyNote: 'Новая ежедневная заметка',
    openVault: 'Открыть хранилище…',
    save: 'Сохранить',
    exportHtml: 'Экспорт в HTML…',
    exportPdf: 'Экспорт в PDF…',
    closeTab: 'Закрыть вкладку',
    undo: 'Отменить',
    redo: 'Повторить',
    cut: 'Вырезать',
    copy: 'Копировать',
    paste: 'Вставить',
    selectAll: 'Выделить всё',
    commandPalette: 'Палитра команд',
    settings: 'Настройки',
    graphView: 'Граф',
    resetLayout: 'Сбросить макет',
    reload: 'Перезагрузить',
    toggleDevTools: 'Инструменты разработчика',
    resetZoom: 'Реальный размер',
    zoomIn: 'Увеличить',
    zoomOut: 'Уменьшить',
    toggleFullscreen: 'Во весь экран',
    minimize: 'Свернуть',
    zoom: 'Масштабировать',
    front: 'Все окна на передний план',
    githubRepository: 'Репозиторий GitHub'
  }
}

let currentMenuLanguage: MenuLanguage = 'en'

function normalizeMenuLanguage(language: unknown): MenuLanguage {
  return language === 'ru' ? 'ru' : 'en'
}

function readMenuLanguage(): MenuLanguage {
  try {
    const prefPath = join(app.getPath('userData'), 'meridian', 'preferences.json')
    if (!existsSync(prefPath)) return 'en'
    const prefs = JSON.parse(readFileSync(prefPath, 'utf-8')) as { language?: unknown }
    return normalizeMenuLanguage(prefs.language)
  } catch {
    return 'en'
  }
}

function send(action: string) {
  BrowserWindow.getFocusedWindow()?.webContents.send('menu:action', action)
}

function buildMenu() {
  currentMenuLanguage = readMenuLanguage()
  const labels = menuLabels[currentMenuLanguage]
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: labels.file,
      submenu: [
        { label: labels.newNote, accelerator: 'CmdOrCtrl+N', click: () => send('new-file') },
        {
          label: labels.newDailyNote,
          accelerator: 'CmdOrCtrl+D',
          click: () => send('daily-note')
        },
        { type: 'separator' },
        { label: labels.openVault, accelerator: 'CmdOrCtrl+O', click: () => send('open-vault') },
        { type: 'separator' },
        { label: labels.save, accelerator: 'CmdOrCtrl+S', click: () => send('save') },
        { label: labels.exportHtml, accelerator: 'CmdOrCtrl+E', click: () => send('export-html') },
        {
          label: labels.exportPdf,
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => send('export-pdf')
        },
        { type: 'separator' },
        { label: labels.closeTab, accelerator: 'CmdOrCtrl+W', click: () => send('close-tab') }
      ]
    },
    {
      label: labels.edit,
      submenu: [
        { label: labels.undo, role: 'undo' },
        { label: labels.redo, role: 'redo' },
        { type: 'separator' },
        { label: labels.cut, role: 'cut' },
        { label: labels.copy, role: 'copy' },
        { label: labels.paste, role: 'paste' },
        { label: labels.selectAll, role: 'selectAll' },
        { type: 'separator' },
        {
          label: labels.commandPalette,
          accelerator: 'CmdOrCtrl+K',
          click: () => send('command-palette')
        }
      ]
    },
    {
      label: labels.view,
      submenu: [
        { label: labels.settings, accelerator: 'CmdOrCtrl+,', click: () => send('settings') },
        { type: 'separator' },
        { label: labels.graphView, accelerator: 'CmdOrCtrl+Shift+G', click: () => send('graph-view') },
        { label: labels.resetLayout, click: () => send('reset-layout') },
        { type: 'separator' },
        { label: labels.reload, role: 'reload' },
        { label: labels.toggleDevTools, role: 'toggleDevTools' },
        { type: 'separator' },
        { label: labels.resetZoom, role: 'resetZoom' },
        { label: labels.zoomIn, role: 'zoomIn' },
        { label: labels.zoomOut, role: 'zoomOut' },
        { type: 'separator' },
        { label: labels.toggleFullscreen, role: 'togglefullscreen' }
      ]
    },
    {
      label: labels.window,
      submenu: [
        { label: labels.minimize, role: 'minimize' },
        { label: labels.zoom, role: 'zoom' },
        { type: 'separator' },
        { label: labels.front, role: 'front' }
      ]
    },
    {
      label: labels.help,
      submenu: [
        {
          label: labels.githubRepository,
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

  registerIpcHandlers(settings, (preferences) => {
    const nextLanguage = normalizeMenuLanguage(preferences.language)
    if (nextLanguage !== currentMenuLanguage) buildMenu()
  })
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
