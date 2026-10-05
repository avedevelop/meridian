import { createHash } from 'crypto'
import type { ClipboardSettings } from '../../shared/clipboard'
import { looksSensitive, shouldSkipByFormat, shouldStore, type FormatProbe } from './privacy'
import { sanitizeClipboardHtml } from './sanitizeHtml'
import type { NewEntry } from './store'

export interface ClipboardImageLike {
  isEmpty(): boolean
  getSize(): { width: number; height: number }
  toPNG(): Buffer
}

/** The subset of Electron's `clipboard` the watcher needs (injectable for tests). */
export interface ClipboardLike extends FormatProbe {
  availableFormats(): string[]
  readText(): string
  readHTML(): string
  readImage(): ClipboardImageLike
}

export interface WatcherDeps {
  clipboard: ClipboardLike
  platform: NodeJS.Platform
  getSettings: () => ClipboardSettings
  onEntry: (entry: NewEntry) => void
  setTimer?: (fn: () => void, ms: number) => unknown
  clearTimer?: (handle: unknown) => void
}

export const POLL_MIN_MS = 400
export const POLL_MAX_MS = 2000

/** Decode a Windows `FileNameW` buffer (UTF-16LE, null-terminated) into a path. */
export function parseWindowsFileName(buf: Buffer): string | null {
  if (!buf.length) return null
  const name = buf.toString('utf16le').replace(/\0+$/, '')
  return name || null
}

/** Decode a macOS `public.file-url` buffer into a path. */
export function parseMacFileUrl(buf: Buffer): string | null {
  const text = buf.toString('utf8').replace(/\0+$/, '').trim()
  if (!text.startsWith('file://')) return null
  try {
    return decodeURIComponent(new URL(text).pathname)
  } catch {
    return null
  }
}

const sha = (...parts: Array<string | Buffer>): string => {
  const h = createHash('sha1')
  for (const p of parts) h.update(p)
  return h.digest('hex')
}

/**
 * Polls the system clipboard (Electron has no change event) and emits new entries.
 * Polling backs off while idle, skips content the OS or password managers mark as private,
 * and ignores writes made by Meridian itself.
 */
export class ClipboardWatcher {
  private timer: unknown = null
  private interval = POLL_MIN_MS
  private lastFingerprint: string | null = null
  private running = false
  private readonly setTimer: (fn: () => void, ms: number) => unknown
  private readonly clearTimer: (h: unknown) => void

  constructor(private readonly deps: WatcherDeps) {
    this.setTimer = deps.setTimer ?? ((fn, ms) => setTimeout(fn, ms))
    this.clearTimer = deps.clearTimer ?? ((h) => clearTimeout(h as NodeJS.Timeout))
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.lastFingerprint = this.fingerprint() // do not record whatever is on the clipboard at startup
    this.schedule()
  }

  stop(): void {
    this.running = false
    if (this.timer !== null) this.clearTimer(this.timer)
    this.timer = null
  }

  /** Call after Meridian writes to the clipboard so the write is not recorded again. */
  markOwnWrite(): void {
    this.lastFingerprint = this.fingerprint()
  }

  private schedule(): void {
    if (!this.running) return
    this.timer = this.setTimer(() => this.tick(), this.interval)
  }

  /** One poll. Exposed for tests. */
  tick(): void {
    try {
      const settings = this.deps.getSettings()
      if (settings.enabled && !settings.paused) {
        const fp = this.fingerprint()
        if (fp !== this.lastFingerprint) {
          this.lastFingerprint = fp
          this.interval = POLL_MIN_MS
          this.capture(settings)
        } else {
          this.interval = Math.min(POLL_MAX_MS, Math.round(this.interval * 1.5))
        }
      } else {
        this.interval = POLL_MAX_MS
      }
    } catch {
      // the clipboard can be locked by another process; try again on the next tick
    }
    this.schedule()
  }

  private fingerprint(): string {
    const c = this.deps.clipboard
    const formats = c.availableFormats()
    const text = c.readText()
    const html = text ? '' : c.readHTML()
    let image = ''
    if (!text && !html && formats.some((f) => f.startsWith('image/'))) {
      const img = c.readImage()
      if (!img.isEmpty()) {
        const { width, height } = img.getSize()
        image = `${width}x${height}:${sha(img.toPNG())}`
      }
    }
    return sha(formats.join(','), text, html, image)
  }

  private capture(settings: ClipboardSettings): void {
    const c = this.deps.clipboard
    if (shouldSkipByFormat(this.deps.platform, c)) return

    const text = c.readText()
    const rawHtml = c.readHTML()
    const formats = c.availableFormats()

    const filePath = this.readFilePath()
    if (filePath) {
      this.emit({ kind: 'files', text: filePath, files: [filePath], sensitive: false })
      return
    }

    if (!text && formats.some((f) => f.startsWith('image/'))) {
      const img = c.readImage()
      if (img.isEmpty()) return
      const png = img.toPNG()
      if (png.length > settings.maxImageBytes) return
      const { width, height } = img.getSize()
      this.emit({ kind: 'image', text: '', image: { png, width, height }, sensitive: false })
      return
    }

    if (!text && !rawHtml) return
    const sensitive = looksSensitive(text)
    if (!shouldStore(sensitive, settings.sensitiveMode)) return
    const html = rawHtml && !sensitive ? sanitizeClipboardHtml(rawHtml) : undefined
    if (html && html.trim() && html !== text) {
      this.emit({ kind: 'html', text, html, sensitive })
    } else {
      this.emit({ kind: 'text', text, sensitive })
    }
  }

  private readFilePath(): string | null {
    const c = this.deps.clipboard
    try {
      if (this.deps.platform === 'win32' && c.has('FileNameW')) {
        return parseWindowsFileName(c.readBuffer('FileNameW'))
      }
      if (this.deps.platform === 'darwin' && c.has('public.file-url')) {
        return parseMacFileUrl(c.readBuffer('public.file-url'))
      }
    } catch {
      // unsupported on this platform build
    }
    return null
  }

  private emit(entry: NewEntry): void {
    this.deps.onEntry(entry)
  }
}
