import { app, BrowserWindow, shell } from 'electron'
import type { BrowserWindowConstructorOptions, MenuItemConstructorOptions } from 'electron'
import { join } from 'path'

type WindowSize = Pick<BrowserWindowConstructorOptions, 'width' | 'height' | 'x' | 'y'>

function send(action: string): void {
  BrowserWindow.getFocusedWindow()?.webContents.send('menu:action', action)
}

export function getWindowOptions(
  platform: NodeJS.Platform,
  size: WindowSize
): BrowserWindowConstructorOptions {
  return {
    width: size.width,
    height: size.height,
    x: size.x,
    y: size.y,
    icon: join(__dirname, '../../resources/icon.png'),
    titleBarStyle: platform === 'darwin' ? 'hiddenInset' : undefined,
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  }
}

export function buildAppMenuTemplate(platform: NodeJS.Platform): MenuItemConstructorOptions[] {
  const template: MenuItemConstructorOptions[] = [
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
      submenu:
        platform === 'darwin'
          ? [{ role: 'minimize' }, { role: 'zoom' }, { type: 'separator' }, { role: 'front' }]
          : [{ role: 'minimize' }]
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

  if (platform === 'darwin') {
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

  return template
}
