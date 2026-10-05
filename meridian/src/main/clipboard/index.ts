import { app, clipboard, nativeImage } from 'electron'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { getVaultManager } from '../ipc'
import { ClipboardService } from './service'
import { broadcastClipboardChanged, registerClipboardIpc } from './ipc'
import { ClipboardWindowController } from './window'

function readPreferences(): Record<string, unknown> {
  try {
    const path = join(app.getPath('userData'), 'meridian', 'preferences.json')
    if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    // fall back to defaults
  }
  return {}
}

/** Start clipboard history (recording stays off until the user enables it). Returns a stop function. */
export function startClipboardHistory(): () => Promise<void> {
  let windowController: ClipboardWindowController | null = null
  const service = new ClipboardService({
    dir: join(app.getPath('userData'), 'clipboard'),
    platform: process.platform,
    clipboard,
    writer: {
      writeText: (text) => clipboard.writeText(text),
      write: (data) => clipboard.write(data),
      writeImagePng: (png) => clipboard.writeImage(nativeImage.createFromBuffer(png))
    },
    onChanged: broadcastClipboardChanged,
    onSettingsChanged: () => windowController?.registerHotkey()
  })
  windowController = new ClipboardWindowController(() => service.getSettings().hotkey)
  const controller = windowController

  service.start()
  controller.registerHotkey()
  controller.preload()
  const unregister = registerClipboardIpc(service, {
    getVaultPath: () => getVaultManager()?.vaultPath ?? null,
    getPreferences: readPreferences,
    getWindowInfo: () => ({
      hotkey: service.getSettings().hotkey,
      hotkeyRegistered: controller.hotkeyRegistered
    }),
    readClipboardText: () => clipboard.readText(),
    hideWindow: () => controller.hide(),
    platform: process.platform
  })

  return async () => {
    unregister()
    controller.dispose()
    await service.stop()
  }
}
