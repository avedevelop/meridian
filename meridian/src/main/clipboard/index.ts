import { app, clipboard, nativeImage } from 'electron'
import { join } from 'path'
import { ClipboardService } from './service'
import { broadcastClipboardChanged, registerClipboardIpc } from './ipc'

/** Start clipboard history (recording stays off until the user enables it). Returns a stop function. */
export function startClipboardHistory(): () => Promise<void> {
  const service = new ClipboardService({
    dir: join(app.getPath('userData'), 'clipboard'),
    platform: process.platform,
    clipboard,
    writer: {
      writeText: (text) => clipboard.writeText(text),
      write: (data) => clipboard.write(data),
      writeImagePng: (png) => clipboard.writeImage(nativeImage.createFromBuffer(png))
    },
    onChanged: broadcastClipboardChanged
  })
  service.start()
  const unregister = registerClipboardIpc(service)
  return async () => {
    unregister()
    await service.stop()
  }
}
