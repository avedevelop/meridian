import { BrowserWindow, ipcMain } from 'electron'
import {
  CLIPBOARD_IPC,
  type ClipboardEntryKind,
  type ClipboardListQuery,
  type ClipboardSettings,
  type ClipboardWindowState,
  type SaveTarget
} from '../../shared/clipboard'
import type { ClipboardService } from './service'
import { saveEntryToNote } from './saveToNote'
import { listSnippets, readSnippet } from './snippets'
import { expandSnippet } from '../../shared/clipboardNote'

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

export interface ClipboardIpcDeps {
  getVaultPath: () => string | null
  getPreferences: () => Record<string, unknown>
  getWindowInfo: () => { hotkey: string; hotkeyRegistered: boolean }
  readClipboardText: () => string
  /** Ask the user, with a native dialog, to allow recording. Resolves true only on an explicit yes. */
  confirmEnableRecording: (parent: BrowserWindow | null) => Promise<boolean>
  hideWindow: () => void
  platform: string
}

const TARGETS = new Set<SaveTarget>(['inbox', 'new', 'daily'])

/** Register clipboard IPC handlers. Channels are validated: the renderer is not trusted. */
export function registerClipboardIpc(
  service: ClipboardService,
  deps: ClipboardIpcDeps
): () => void {
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
  ipcMain.handle(CLIPBOARD_IPC.SAVE_TO_NOTE, async (_e, id, target) => {
    const key = str(id)
    const vaultPath = deps.getVaultPath()
    if (!vaultPath) return { ok: false, error: 'no-vault' }
    const entry = key ? service.store.get(key) : undefined
    if (!entry || !TARGETS.has(target)) return { ok: false, error: 'not-found' }
    const prefs = deps.getPreferences()
    return saveEntryToNote(
      {
        vaultPath,
        attachmentFolder:
          typeof prefs.attachmentFolder === 'string' ? prefs.attachmentFolder : undefined,
        dailyNoteDateFormat:
          typeof prefs.dailyNoteDateFormat === 'string' ? prefs.dailyNoteDateFormat : undefined,
        now: new Date()
      },
      entry,
      entry.kind === 'image' ? await service.getImagePng(entry.id) : null,
      target as SaveTarget
    )
  })
  ipcMain.handle(CLIPBOARD_IPC.SNIPPETS_LIST, async () => {
    const vaultPath = deps.getVaultPath()
    return vaultPath ? listSnippets(vaultPath) : []
  })
  ipcMain.handle(CLIPBOARD_IPC.SNIPPET_USE, async (_e, name) => {
    const vaultPath = deps.getVaultPath()
    const key = str(name)
    if (!vaultPath || !key) return false
    const template = await readSnippet(vaultPath, key)
    if (template === null) return false
    const prefs = deps.getPreferences()
    service.writeText(
      expandSnippet(template, {
        now: new Date(),
        clipboard: deps.readClipboardText(),
        dateFormat:
          typeof prefs.dailyNoteDateFormat === 'string' ? prefs.dailyNoteDateFormat : undefined
      })
    )
    return true
  })
  ipcMain.handle(CLIPBOARD_IPC.STATE, (): ClipboardWindowState => {
    const prefs = deps.getPreferences()
    const info = deps.getWindowInfo()
    return {
      vaultOpen: deps.getVaultPath() !== null,
      language: typeof prefs.language === 'string' && prefs.language ? prefs.language : 'en',
      hotkey: info.hotkey,
      hotkeyRegistered: info.hotkeyRegistered,
      platform: deps.platform
    }
  })
  ipcMain.handle(CLIPBOARD_IPC.HIDE, () => deps.hideWindow())
  ipcMain.handle(CLIPBOARD_IPC.GET_SETTINGS, () => service.getSettings())
  // One dialog at a time, however many calls arrive while it is open.
  let pendingConsent: Promise<boolean> | null = null
  ipcMain.handle(CLIPBOARD_IPC.SET_SETTINGS, async (e, patch) => {
    const next = { ...((patch ?? {}) as Partial<ClipboardSettings>) }
    if (next.enabled === true && !service.getSettings().enabled) {
      pendingConsent ??= deps
        .confirmEnableRecording(BrowserWindow.fromWebContents(e.sender))
        .finally(() => {
          pendingConsent = null
        })
      if (!(await pendingConsent)) delete next.enabled
    }
    return service.setSettings(next)
  })

  return () => {
    for (const channel of Object.values(CLIPBOARD_IPC)) ipcMain.removeHandler(channel)
  }
}

export function broadcastClipboardChanged(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(CLIPBOARD_IPC.CHANGED)
  }
}
