import { Menu, Tray, app, nativeImage } from 'electron'
import { join } from 'path'

/** Preferences that control running in the background. Read from `preferences.json`. */
export interface BackgroundPrefs {
  runInBackground: boolean
  startMinimized: boolean
  launchAtLogin: boolean
}

export const HIDDEN_ARG = '--hidden'

export function readBackgroundPrefs(prefs: Record<string, unknown>): BackgroundPrefs {
  return {
    runInBackground: prefs.runInBackground === true,
    startMinimized: prefs.startMinimized === true,
    launchAtLogin: prefs.launchAtLogin === true
  }
}

/** Closing the window hides it instead, unless the app is really quitting. */
export function shouldHideOnClose(prefs: BackgroundPrefs, quitting: boolean): boolean {
  return prefs.runInBackground && !quitting
}

/** Whether the app should exit when its last window closes. */
export function shouldQuitWhenAllClosed(
  platform: NodeJS.Platform,
  prefs: BackgroundPrefs
): boolean {
  return platform !== 'darwin' && !prefs.runInBackground
}

/**
 * Start without showing the main window only when launched by the OS at login, and only if the
 * user can bring it back (tray enabled). A manual launch always shows the window.
 */
export function shouldStartHidden(
  prefs: BackgroundPrefs,
  launch: { argv: readonly string[]; wasOpenedAtLogin: boolean }
): boolean {
  if (!prefs.runInBackground || !prefs.startMinimized) return false
  return launch.wasOpenedAtLogin || launch.argv.includes(HIDDEN_ARG)
}

/**
 * Whether the OS started the app at login. Electron only implements this query on macOS and
 * Windows (calling it elsewhere can throw), so other platforms rely on the `--hidden` argument.
 */
export function readWasOpenedAtLogin(
  platform: NodeJS.Platform,
  query: () => { wasOpenedAtLogin?: boolean }
): boolean {
  if (platform !== 'darwin' && platform !== 'win32') return false
  try {
    return query().wasOpenedAtLogin === true
  } catch {
    return false
  }
}

export function loginItemSettings(prefs: BackgroundPrefs): {
  openAtLogin: boolean
  args: string[]
} {
  return {
    openAtLogin: prefs.launchAtLogin,
    args: prefs.launchAtLogin && prefs.runInBackground && prefs.startMinimized ? [HIDDEN_ARG] : []
  }
}

export type TrayLanguage = 'en' | 'ru' | 'nb'

const TRAY_LABELS: Record<
  TrayLanguage,
  Record<'open' | 'clipboard' | 'capture' | 'quit' | 'tooltip', string>
> = {
  en: {
    open: 'Open Meridian',
    clipboard: 'Clipboard history',
    capture: 'Quick capture',
    quit: 'Quit Meridian',
    tooltip: 'Meridian'
  },
  ru: {
    open: 'Открыть Meridian',
    clipboard: 'История буфера обмена',
    capture: 'Быстрая заметка',
    quit: 'Выйти из Meridian',
    tooltip: 'Meridian'
  },
  nb: {
    open: 'Åpne Meridian',
    clipboard: 'Utklippstavlehistorikk',
    capture: 'Hurtignotat',
    quit: 'Avslutt Meridian',
    tooltip: 'Meridian'
  }
}

export function trayLanguage(language: unknown): TrayLanguage {
  return language === 'ru' || language === 'nb' ? language : 'en'
}

export function trayLabels(language: unknown): (typeof TRAY_LABELS)['en'] {
  return TRAY_LABELS[trayLanguage(language)]
}

export interface BackgroundActions {
  showMainWindow: () => void
  toggleClipboardWindow: () => void
  toggleCaptureWindow: () => void
  quit: () => void
}

/**
 * Owns the tray icon and OS login-item registration. Everything decided here goes through the
 * pure functions above; this class only talks to Electron.
 */
export class BackgroundController {
  private tray: Tray | null = null
  private prefs: BackgroundPrefs = readBackgroundPrefs({})

  constructor(private readonly actions: BackgroundActions) {}

  get current(): BackgroundPrefs {
    return this.prefs
  }

  /** Apply (or re-apply) preferences: tray on/off, tray menu language, launch at login. */
  apply(rawPrefs: Record<string, unknown>): void {
    this.prefs = readBackgroundPrefs(rawPrefs)
    if (this.prefs.runInBackground) this.showTray(rawPrefs.language)
    else this.hideTray()
    this.applyLoginItem()
  }

  private applyLoginItem(): void {
    // In development this would register the bare Electron binary, not the app.
    if (!app.isPackaged) return
    try {
      app.setLoginItemSettings(loginItemSettings(this.prefs))
    } catch {
      // not supported on this platform (e.g. some Linux desktops)
    }
  }

  private showTray(language: unknown): void {
    const labels = trayLabels(language)
    if (!this.tray) {
      const icon = nativeImage
        .createFromPath(join(__dirname, '../../resources/icon.png'))
        .resize({ width: 18, height: 18 })
      this.tray = new Tray(icon)
      this.tray.on('click', () => this.actions.showMainWindow())
    }
    this.tray.setToolTip(labels.tooltip)
    this.tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: labels.open, click: () => this.actions.showMainWindow() },
        { label: labels.clipboard, click: () => this.actions.toggleClipboardWindow() },
        { label: labels.capture, click: () => this.actions.toggleCaptureWindow() },
        { type: 'separator' },
        { label: labels.quit, click: () => this.actions.quit() }
      ])
    )
  }

  private hideTray(): void {
    this.tray?.destroy()
    this.tray = null
  }

  dispose(): void {
    this.hideTray()
  }
}
