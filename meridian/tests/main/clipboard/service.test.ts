// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { ClipboardService, normalizeSettings } from '../../../src/main/clipboard/service'
import { FakeClipboard } from './fakes'

let dir: string
let clip: FakeClipboard
let written: Array<Record<string, unknown>>
let services: ClipboardService[]

function make(tryHotkey?: (hotkey: string) => boolean): ClipboardService {
  const s = new ClipboardService({
    dir,
    tryHotkey,
    platform: 'darwin',
    clipboard: clip,
    writer: {
      writeText: (text) => {
        clip.set({ text })
        written.push({ text })
      },
      write: (data) => {
        clip.set({ text: data.text, html: data.html })
        written.push({ ...data })
      },
      writeImagePng: (png) => {
        clip.set({ png, size: { width: 1, height: 1 } })
        written.push({ png: png.length })
      }
    }
  })
  services.push(s)
  return s
}

beforeEach(() => {
  vi.useFakeTimers()
  dir = mkdtempSync(join(tmpdir(), 'meridian-clip-svc-'))
  clip = new FakeClipboard()
  written = []
  services = []
})
afterEach(async () => {
  for (const s of services) await s.stop()
  vi.useRealTimers()
  rmSync(dir, { recursive: true, force: true })
})

describe('ClipboardService', () => {
  it('records nothing until the user opts in', () => {
    const s = make()
    s.start()
    clip.set({ text: 'before opt-in' })
    vi.advanceTimersByTime(3000)
    expect(s.list({}).total).toBe(0)

    s.setSettings({ enabled: true })
    clip.set({ text: 'after opt-in' })
    vi.advanceTimersByTime(3000)
    expect(s.list({}).items.map((i) => i.preview)).toEqual(['after opt-in'])
  })

  it('does not record what was on the clipboard at the moment recording was enabled', () => {
    const s = make()
    s.start()
    clip.set({ text: 'already copied' })
    s.setSettings({ enabled: true })
    vi.advanceTimersByTime(3000)
    expect(s.list({}).total).toBe(0)
  })

  it('copyBack writes to the clipboard, bumps the entry and does not record a duplicate', async () => {
    const s = make()
    s.setSettings({ enabled: true })
    s.start()
    clip.set({ text: 'one' })
    vi.advanceTimersByTime(500)
    clip.set({ text: 'two' })
    vi.advanceTimersByTime(500)
    const [two, one] = s.list({}).items
    expect([two.preview, one.preview]).toEqual(['two', 'one'])

    vi.setSystemTime(Date.now() + 10_000)
    expect(await s.copyBack(one.id)).toBe(true)
    expect(written).toEqual([{ text: 'one' }])
    vi.advanceTimersByTime(3000)
    const after = s.list({}).items
    expect(after.map((i) => i.preview)).toEqual(['one', 'two'])
    expect(s.store.size()).toBe(2)
  })

  it('copyBack as plain text drops HTML formatting', async () => {
    const s = make()
    s.setSettings({ enabled: true })
    s.start()
    clip.set({ text: 'Bold', html: '<b>Bold</b>' })
    vi.advanceTimersByTime(500)
    const [item] = s.list({}).items
    await s.copyBack(item.id, { plain: true })
    expect(written).toEqual([{ text: 'Bold' }])
    await s.copyBack(item.id)
    expect(written[1]).toMatchObject({ text: 'Bold', html: '<b>Bold</b>' })
  })

  it('copyBack restores images from the blob store', async () => {
    const s = make()
    s.setSettings({ enabled: true })
    s.start()
    clip.set({ png: Buffer.from('pixels'), size: { width: 2, height: 2 } })
    vi.advanceTimersByTime(500)
    const [item] = s.list({}).items
    expect(item.kind).toBe('image')
    expect(await s.copyBack(item.id)).toBe(true)
    expect(written).toEqual([{ png: 6 }])
  })

  it('persists settings and history across restarts, and clear wipes both entries and blobs', async () => {
    const a = make()
    a.setSettings({ enabled: true, maxEntries: 100, sensitiveMode: 'skip' })
    a.start()
    clip.set({ text: 'remember me' })
    vi.advanceTimersByTime(500)
    await a.stop()

    const b = make()
    expect(b.getSettings()).toMatchObject({ enabled: true, maxEntries: 100, sensitiveMode: 'skip' })
    expect(b.list({}).items.map((i) => i.preview)).toEqual(['remember me'])
    await b.clear()
    expect(b.list({}).total).toBe(0)
  })

  it('keeps the previous hotkey when the new one is taken, and switches when it is free', () => {
    const tried: string[] = []
    const s = make((hotkey) => {
      tried.push(hotkey)
      return hotkey !== 'CommandOrControl+Alt+V'
    })
    const before = s.getSettings().hotkey

    const rejected = s.setSettings({ hotkey: 'CommandOrControl+Alt+V', maxEntries: 123 })
    expect(rejected.hotkey).toBe(before)
    expect(rejected.maxEntries).toBe(123) // other changes in the same patch still apply

    const accepted = s.setSettings({ hotkey: 'CommandOrControl+Alt+J' })
    expect(accepted.hotkey).toBe('CommandOrControl+Alt+J')
    expect(tried).toEqual(['CommandOrControl+Alt+V', 'CommandOrControl+Alt+J'])
  })

  it('retries a shortcut that could not be registered at startup, even when the value is unchanged', () => {
    let free = false
    const tried: string[] = []
    const s = make((hotkey) => {
      tried.push(hotkey)
      return free
    })
    const configured = s.getSettings().hotkey

    // The shortcut is still owned by another app: the setting stays, nothing breaks.
    expect(s.setSettings({ enabled: true }).hotkey).toBe(configured)

    free = true // the conflict is over
    s.setSettings({ hotkey: configured }) // re-recording the same shortcut retries it
    expect(tried.at(-1)).toBe(configured)
    free = false
    expect(s.setSettings({ maxEntries: 100 }).hotkey).toBe(configured) // later failures never lose it
  })

  it('applies a lower history size immediately, not at the next hourly sweep', () => {
    const s = make()
    s.setSettings({ enabled: true })
    for (let i = 0; i < 80; i++)
      s.store.add({ kind: 'text', text: `entry ${i}`, sensitive: false }, Date.now() + i)
    expect(s.list({}).total).toBe(80)

    s.setSettings({ maxEntries: 50 })
    expect(s.list({}).total).toBe(50)
    expect(s.list({}).items[0].preview).toBe('entry 79') // newest survive
  })

  it('applies a shorter retention immediately and keeps pinned entries', () => {
    const day = 86_400_000
    const now = 100 * day
    const s = make()
    ;(s as unknown as { now: () => number }).now = () => now
    s.setSettings({ enabled: true, maxAgeDays: 365 })
    const old = s.store.add({ kind: 'text', text: 'old pinned', sensitive: false }, now - 50 * day)
    s.store.setPinned(old.id, true)
    s.store.add({ kind: 'text', text: 'old', sensitive: false }, now - 40 * day)
    s.store.add({ kind: 'text', text: 'recent', sensitive: false }, now - day)

    s.setSettings({ maxAgeDays: 30 })
    expect(
      s
        .list({})
        .items.map((i) => i.preview)
        .sort()
    ).toEqual(['old pinned', 'recent'])
  })

  it('tells the window to refresh when a lower limit removed entries', () => {
    const changes: number[] = []
    const s = new ClipboardService({
      dir,
      platform: 'darwin',
      clipboard: clip,
      writer: {
        writeText: () => undefined,
        write: () => undefined,
        writeImagePng: () => undefined
      },
      onChanged: () => changes.push(1)
    })
    services.push(s)
    for (let i = 0; i < 60; i++)
      s.store.add({ kind: 'text', text: `e${i}`, sensitive: false }, Date.now() + i)
    s.setSettings({ maxEntries: 50 })
    expect(changes).toHaveLength(1)
    s.setSettings({ maxEntries: 50 })
    expect(changes).toHaveLength(1) // nothing removed, no refresh
  })

  it('persists an accepted hotkey and ignores a rejected one across restarts', async () => {
    const a = make((h) => h === 'CommandOrControl+Alt+J')
    a.setSettings({ hotkey: 'CommandOrControl+Alt+J' })
    a.setSettings({ hotkey: 'CommandOrControl+Alt+K' })
    await a.stop()
    expect(make().getSettings().hotkey).toBe('CommandOrControl+Alt+J')
  })

  it('normalizes hostile or invalid settings', () => {
    expect(
      normalizeSettings({
        enabled: 'yes' as never,
        maxEntries: -5,
        maxAgeDays: 1e12,
        maxImageBytes: NaN,
        sensitiveMode: 'whatever' as never
      })
    ).toMatchObject({
      enabled: false,
      maxEntries: 50,
      maxAgeDays: 3650,
      maxImageBytes: 5 * 1024 * 1024,
      sensitiveMode: 'mark'
    })
  })
})
