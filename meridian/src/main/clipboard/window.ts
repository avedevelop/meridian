import { BrowserWindow, app, globalShortcut } from 'electron'
import { join } from 'path'
import { CLIPBOARD_IPC } from '../../shared/clipboard'

/** The hidden, always-on-top history window and its global hotkey (same pattern as Quick Capture). */
export class ClipboardWindowController {
  private win: BrowserWindow | null = null
  private accelerator: string | null = null
  hotkeyRegistered = false

  constructor(private readonly getHotkey: () => string) {}

  private create(): BrowserWindow {
    const win = new BrowserWindow({
      width: 600,
      height: 500,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      show: false,
      resizable: false,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: true,
        additionalArguments: [`--meridian-home-dir=${app.getPath('home')}`],
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    if (process.env['ELECTRON_RENDERER_URL']) {
      void win.loadURL(process.env['ELECTRON_RENDERER_URL'] + '?clipboard=1')
    } else {
      void win.loadFile(join(__dirname, '../renderer/index.html'), { query: { clipboard: '1' } })
    }

    win.on('blur', () => win.hide())
    win.on('closed', () => {
      this.win = null
    })
    return win
  }

  show(): void {
    if (!this.win || this.win.isDestroyed()) this.win = this.create()
    const win = this.win
    win.center()
    win.show()
    win.focus()
    win.webContents.send(CLIPBOARD_IPC.SHOWN)
  }

  hide(): void {
    if (this.win && !this.win.isDestroyed()) this.win.hide()
  }

  toggle(): void {
    if (this.win && !this.win.isDestroyed() && this.win.isVisible()) this.hide()
    else this.show()
  }

  /** Warm up the window so the first hotkey press is instant. */
  preload(): void {
    if (!this.win || this.win.isDestroyed()) this.win = this.create()
  }

  /** (Re)register the global hotkey. Returns false if another app owns it or the accelerator is invalid. */
  registerHotkey(): boolean {
    const next = this.getHotkey()
    if (this.accelerator && this.accelerator !== next) globalShortcut.unregister(this.accelerator)
    this.accelerator = null
    try {
      this.hotkeyRegistered = globalShortcut.register(next, () => this.toggle())
    } catch {
      this.hotkeyRegistered = false
    }
    if (this.hotkeyRegistered) this.accelerator = next
    return this.hotkeyRegistered
  }

  /**
   * Switch to another hotkey. The current one is released only if the new one registers, so a
   * shortcut owned by another app (or an invalid accelerator) never leaves the user without one.
   */
  tryHotkey(candidate: string): boolean {
    if (candidate === this.accelerator) return true
    let ok = false
    try {
      ok = globalShortcut.register(candidate, () => this.toggle())
    } catch {
      ok = false
    }
    if (!ok) return false
    if (this.accelerator) globalShortcut.unregister(this.accelerator)
    this.accelerator = candidate
    this.hotkeyRegistered = true
    return true
  }

  dispose(): void {
    if (this.accelerator) globalShortcut.unregister(this.accelerator)
    this.accelerator = null
    if (this.win && !this.win.isDestroyed()) this.win.destroy()
    this.win = null
  }
}
