import { BrowserWindow, ipcMain } from 'electron'
import {
  CLIPBOARD_IPC,
  type ClipboardEntryKind,
  type ClipboardListQuery,
  type ClipboardSettings
} from '../../shared/clipboard'
import type { ClipboardService } from './service'

const KINDS = new Set(['text', 'html', 'image', 'files', 'link'])

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 && v.length < 200 ? v : null
}

function sanitizeQuery(raw: unknown): ClipboardListQuery {
  const q = (raw ?? {}) as Record<string, unknown>
  return {
    query: typeof q.query === 'string' ? q.query.slice(0, 200) : undefined,
    kind:
      typeof q.kind === 'string' && KINDS.has(q.kind)
        ? (q.kind as ClipboardEntryKind | 'link')
        : undefined,
    pinnedOnly: q.pinnedOnly === true,
    limit: typeof q.limit === 'number' ? q.limit : undefined,
    cursor: typeof q.cursor === 'string' ? q.cursor : null
  }
}

/** Register clipboard IPC handlers. Channels are validated: the renderer is not trusted. */
export function registerClipboardIpc(service: ClipboardService): () => void {
  ipcMain.handle(CLIPBOARD_IPC.LIST, (_e, q) => service.list(sanitizeQuery(q)))
  ipcMain.handle(CLIPBOARD_IPC.PIN, (_e, id, pinned) => {
    const key = str(id)
    return key ? service.pin(key, pinned === true) : false
  })
  ipcMain.handle(CLIPBOARD_IPC.DELETE, (_e, id) => {
    const key = str(id)
    return key ? service.delete(key) : false
  })
  ipcMain.handle(CLIPBOARD_IPC.CLEAR, () => service.clear())
  ipcMain.handle(CLIPBOARD_IPC.COPY_BACK, (_e, id, opts) => {
    const key = str(id)
    return key
      ? service.copyBack(key, { plain: (opts as { plain?: boolean })?.plain === true })
      : false
  })
  ipcMain.handle(CLIPBOARD_IPC.GET_IMAGE, async (_e, id) => {
    const key = str(id)
    const png = key ? await service.getImagePng(key) : null
    return png ? `data:image/png;base64,${png.toString('base64')}` : null
  })
  ipcMain.handle(CLIPBOARD_IPC.GET_SETTINGS, () => service.getSettings())
  ipcMain.handle(CLIPBOARD_IPC.SET_SETTINGS, (_e, patch) =>
    service.setSettings((patch ?? {}) as Partial<ClipboardSettings>)
  )

  return () => {
    for (const channel of Object.values(CLIPBOARD_IPC)) ipcMain.removeHandler(channel)
  }
}

export function broadcastClipboardChanged(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(CLIPBOARD_IPC.CHANGED)
  }
}
