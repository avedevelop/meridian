import { app, clipboard, dialog, nativeImage, type BrowserWindow } from 'electron'
import { join } from 'path'
import { getVaultManager } from '../ipc'
import { readPreferences } from '../preferences'
import { ClipboardService } from './service'
import { broadcastClipboardChanged, registerClipboardIpc } from './ipc'
import { ClipboardWindowController } from './window'
import { consentText } from './consent'

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
    tryHotkey: (hotkey) => windowController?.tryHotkey(hotkey) ?? true
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
    confirmEnableRecording: async (parent: BrowserWindow | null) => {
      const text = consentText(readPreferences().language)
      const options = {
        type: 'question' as const,
        message: text.title,
        detail: text.detail,
        buttons: [text.confirm, text.cancel],
        defaultId: 1, // Cancel: pressing Enter must never turn recording on by accident
        cancelId: 1,
        noLink: true
      }
      const result = parent
        ? await dialog.showMessageBox(parent, options)
        : await dialog.showMessageBox(options)
      return result.response === 0
    },
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
