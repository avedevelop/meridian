// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { DEFAULT_CLIPBOARD_SETTINGS, type ClipboardSettings } from '../../../src/shared/clipboard'
import {
  ClipboardWatcher,
  POLL_MAX_MS,
  POLL_MIN_MS,
  parseMacFileUrl,
  parseWindowsFileName
} from '../../../src/main/clipboard/watcher'
import type { NewEntry } from '../../../src/main/clipboard/store'
import { FakeClipboard } from './fakes'

function setup(
  settings: Partial<ClipboardSettings> = {},
  platform: NodeJS.Platform = 'darwin'
): { clip: FakeClipboard; seen: NewEntry[]; watcher: ClipboardWatcher; delays: number[] } {
  const clip = new FakeClipboard()
  const seen: NewEntry[] = []
  const delays: number[] = []
  const merged = { ...DEFAULT_CLIPBOARD_SETTINGS, enabled: true, ...settings }
  const watcher = new ClipboardWatcher({
    clipboard: clip,
    platform,
    getSettings: () => merged,
    onEntry: (e) => seen.push(e),
    setTimer: (_fn, ms) => {
      delays.push(ms)
      return 1
    },
    clearTimer: () => undefined
  })
  return { clip, seen, watcher, delays }
}

describe('ClipboardWatcher', () => {
  it('does not record what was already on the clipboard at startup', () => {
    const { clip, seen, watcher } = setup()
    clip.set({ text: 'already here' })
    watcher.start()
    watcher.tick()
    expect(seen).toEqual([])
  })

  it('records new text once, not on every poll', () => {
    const { clip, seen, watcher } = setup()
    watcher.start()
    clip.set({ text: 'hello' })
    watcher.tick()
    watcher.tick()
    watcher.tick()
    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatchObject({ kind: 'text', text: 'hello', sensitive: false })
  })

  it('records nothing while disabled or paused', () => {
    for (const off of [{ enabled: false }, { paused: true }]) {
      const { clip, seen, watcher } = setup(off)
      watcher.start()
      clip.set({ text: 'private' })
      watcher.tick()
      expect(seen).toEqual([])
    }
  })

  it('ignores Meridian’s own clipboard writes', () => {
    const { clip, seen, watcher } = setup()
    watcher.start()
    clip.set({ text: 'copied back by Meridian' })
    watcher.markOwnWrite()
    watcher.tick()
    expect(seen).toEqual([])
    clip.set({ text: 'copied by the user afterwards' })
    watcher.tick()
    expect(seen).toHaveLength(1)
  })

  it('skips password-manager content and secrets in skip mode, marks them otherwise', () => {
    const w = setup({}, 'win32')
    w.watcher.start()
    w.clip.set({
      text: 'pass',
      custom: { ExcludeClipboardContentFromMonitorProcessing: Buffer.from([1, 0, 0, 0]) }
    })
    w.watcher.tick()
    expect(w.seen).toEqual([])

    const skip = setup({ sensitiveMode: 'skip' })
    skip.watcher.start()
    skip.clip.set({ text: 'AKIAIOSFODNN7EXAMPLE' })
    skip.watcher.tick()
    expect(skip.seen).toEqual([])

    const mark = setup({ sensitiveMode: 'mark' })
    mark.watcher.start()
    mark.clip.set({ text: 'AKIAIOSFODNN7EXAMPLE' })
    mark.watcher.tick()
    expect(mark.seen[0]).toMatchObject({ sensitive: true })
  })

  it('records formatting-only copies that share the same plain text', () => {
    const { clip, seen, watcher } = setup()
    watcher.start()
    clip.set({ text: 'Hello', html: '<b>Hello</b>' })
    watcher.tick()
    clip.set({ text: 'Hello', html: '<i>Hello</i>' })
    watcher.tick()
    expect(seen.map((e) => e.html)).toEqual(['<b>Hello</b>', '<i>Hello</i>'])
  })

  it('sanitizes copied HTML before it is stored', () => {
    const { clip, seen, watcher } = setup()
    watcher.start()
    clip.set({
      text: 'Click me',
      html: '<p onclick="x()">Click <a href="javascript:alert(1)">me</a><script>alert(1)</script></p>'
    })
    watcher.tick()
    expect(seen[0].kind).toBe('html')
    expect(seen[0].html).not.toMatch(/script|onclick|javascript:/i)
    expect(seen[0].html).toContain('Click')
  })

  it('captures images and drops oversized ones', () => {
    const small = setup()
    small.watcher.start()
    small.clip.set({ png: Buffer.from('png'), size: { width: 4, height: 5 } })
    small.watcher.tick()
    expect(small.seen[0]).toMatchObject({ kind: 'image', image: { width: 4, height: 5 } })

    const big = setup({ maxImageBytes: 64 * 1024 })
    big.watcher.start()
    big.clip.set({ png: Buffer.alloc(70 * 1024), size: { width: 9, height: 9 } })
    big.watcher.tick()
    expect(big.seen).toEqual([])
  })

  it('backs off while idle and resets on change', () => {
    const { clip, watcher, delays } = setup()
    watcher.start()
    for (let i = 0; i < 12; i++) watcher.tick()
    expect(Math.max(...delays)).toBe(POLL_MAX_MS)
    clip.set({ text: 'wake up' })
    watcher.tick()
    expect(delays[delays.length - 1]).toBe(POLL_MIN_MS)
  })

  it('keeps polling after a clipboard read error', () => {
    const { clip, watcher, delays } = setup()
    watcher.start()
    const before = delays.length
    clip.readText = () => {
      throw new Error('clipboard locked')
    }
    expect(() => watcher.tick()).not.toThrow()
    expect(delays.length).toBe(before + 1)
  })
})

describe('file path parsers', () => {
  it('parses Windows FileNameW buffers', () => {
    const buf = Buffer.from('C:\\Users\\me\\a b.txt\0', 'utf16le')
    expect(parseWindowsFileName(buf)).toBe('C:\\Users\\me\\a b.txt')
    expect(parseWindowsFileName(Buffer.alloc(0))).toBeNull()
  })

  it('parses macOS file URLs', () => {
    expect(parseMacFileUrl(Buffer.from('file:///Users/me/My%20Doc.md'))).toBe('/Users/me/My Doc.md')
    expect(parseMacFileUrl(Buffer.from('https://example.com'))).toBeNull()
  })
})
