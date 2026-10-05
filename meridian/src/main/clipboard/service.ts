import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import {
  DEFAULT_CLIPBOARD_SETTINGS,
  type ClipboardListQuery,
  type ClipboardListResult,
  type ClipboardSettings
} from '../../shared/clipboard'
import { ClipboardStore, type NewEntry } from './store'
import { ClipboardWatcher, type ClipboardLike } from './watcher'

/** What the service needs to put content back on the clipboard (Electron `clipboard` + `nativeImage`). */
export interface ClipboardWriter {
  writeText(text: string): void
  write(data: { text?: string; html?: string }): void
  writeImagePng(png: Buffer): void
}

export interface ClipboardServiceDeps {
  dir: string
  platform: NodeJS.Platform
  clipboard: ClipboardLike
  writer: ClipboardWriter
  onChanged?: () => void
  /** Try to switch the global hotkey; false means it is taken or invalid and the old one stays. */
  tryHotkey?: (hotkey: string) => boolean
  now?: () => number
}

const EXPIRE_EVERY_MS = 60 * 60 * 1000

export function normalizeSettings(
  input: Partial<ClipboardSettings> | undefined
): ClipboardSettings {
  const d = DEFAULT_CLIPBOARD_SETTINGS
  const num = (v: unknown, fallback: number, min: number, max: number): number =>
    typeof v === 'number' && Number.isFinite(v)
      ? Math.min(max, Math.max(min, Math.round(v)))
      : fallback
  return {
    enabled: input?.enabled === true,
    paused: input?.paused === true,
    maxEntries: num(input?.maxEntries, d.maxEntries, 50, 50_000),
    maxAgeDays: num(input?.maxAgeDays, d.maxAgeDays, 1, 3650),
    maxImageBytes: num(input?.maxImageBytes, d.maxImageBytes, 64 * 1024, 50 * 1024 * 1024),
    sensitiveMode: input?.sensitiveMode === 'skip' ? 'skip' : 'mark',
    hotkey:
      typeof input?.hotkey === 'string' && /^[A-Za-z0-9+]{1,60}$/.test(input.hotkey)
        ? input.hotkey
        : d.hotkey
  }
}

export class ClipboardService {
  readonly store: ClipboardStore
  private settings: ClipboardSettings
  private readonly watcher: ClipboardWatcher
  private readonly settingsPath: string
  private expireTimer: NodeJS.Timeout | null = null
  private readonly now: () => number

  constructor(private readonly deps: ClipboardServiceDeps) {
    mkdirSync(deps.dir, { recursive: true })
    this.now = deps.now ?? Date.now
    this.settingsPath = join(deps.dir, 'settings.json')
    this.settings = this.loadSettings()
    this.store = new ClipboardStore(deps.dir)
    this.watcher = new ClipboardWatcher({
      clipboard: deps.clipboard,
      platform: deps.platform,
      getSettings: () => this.settings,
      onEntry: (entry) => this.record(entry)
    })
  }

  private loadSettings(): ClipboardSettings {
    try {
      if (existsSync(this.settingsPath)) {
        return normalizeSettings(JSON.parse(readFileSync(this.settingsPath, 'utf-8')))
      }
    } catch {
      // fall through to defaults
    }
    return normalizeSettings(undefined)
  }

  start(): void {
    this.store.expire(this.settings, this.now())
    this.watcher.start()
    this.expireTimer = setInterval(
      () => this.store.expire(this.settings, this.now()),
      EXPIRE_EVERY_MS
    )
    this.expireTimer.unref?.()
  }

  async stop(): Promise<void> {
    this.watcher.stop()
    if (this.expireTimer) clearInterval(this.expireTimer)
    this.expireTimer = null
    await this.store.flush()
  }

  private record(entry: NewEntry): void {
    this.store.add(entry, this.now())
    this.store.expire(this.settings, this.now())
    this.deps.onChanged?.()
  }

  getSettings(): ClipboardSettings {
    return { ...this.settings }
  }

  setSettings(patch: Partial<ClipboardSettings>): ClipboardSettings {
    const next = normalizeSettings({ ...this.settings, ...patch })
    if (next.hotkey !== this.settings.hotkey && this.deps.tryHotkey?.(next.hotkey) === false) {
      next.hotkey = this.settings.hotkey
    }
    this.settings = next
    writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf-8')
    if (this.settings.enabled && !this.settings.paused) this.watcher.markOwnWrite()
    return this.getSettings()
  }

  list(query: ClipboardListQuery): ClipboardListResult {
    return this.store.list(query)
  }

  pin(id: string, pinned: boolean): boolean {
    const ok = this.store.setPinned(id, pinned)
    if (ok) this.deps.onChanged?.()
    return ok
  }

  delete(id: string): boolean {
    const ok = this.store.delete(id)
    if (ok) this.deps.onChanged?.()
    return ok
  }

  async clear(): Promise<void> {
    await this.store.clear()
    this.deps.onChanged?.()
  }

  async getImagePng(id: string): Promise<Buffer | null> {
    return this.store.readImage(id)
  }

  /** Write arbitrary text (e.g. an expanded snippet) without recording it as history. */
  writeText(text: string): void {
    this.deps.writer.writeText(text)
    this.watcher.markOwnWrite()
  }

  /** Put an entry back on the clipboard without recording it again. */
  async copyBack(id: string, opts: { plain?: boolean } = {}): Promise<boolean> {
    const entry = this.store.get(id)
    if (!entry) return false
    const w = this.deps.writer
    if (entry.kind === 'image') {
      const png = await this.store.readImage(id)
      if (!png) return false
      w.writeImagePng(png)
    } else if (entry.kind === 'html' && entry.html && !opts.plain) {
      w.write({ text: entry.text, html: entry.html })
    } else {
      w.writeText(entry.text)
    }
    this.watcher.markOwnWrite()
    this.store.touch(id, this.now())
    this.deps.onChanged?.()
    return true
  }
}
