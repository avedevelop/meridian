import { app, clipboard, nativeImage } from 'electron'
import { join } from 'path'
import { getVaultManager } from '../ipc'
import { readPreferences } from '../preferences'
import { ClipboardService } from './service'
import { broadcastClipboardChanged, registerClipboardIpc } from './ipc'
import { ClipboardWindowController } from './window'

export interface ClipboardHistoryHandle {
  stop: () => Promise<void>
  toggleWindow: () => void
}

/** Start clipboard history (recording stays off until the user enables it). */
export function startClipboardHistory(): ClipboardHistoryHandle {
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

  return {
    stop: async () => {
      unregister()
      controller.dispose()
      await service.stop()
    },
    toggleWindow: () => controller.toggle()
  }
}
