// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  PRIVATE_APP_GRACE_MS,
  PrivateAppMonitor,
  parseBundleId
} from '../../../src/main/clipboard/frontmostApp'
import { isPrivateAppBundle, looksSensitive } from '../../../src/main/clipboard/privacy'
import { DEFAULT_CLIPBOARD_SETTINGS } from '../../../src/shared/clipboard'
import { ClipboardWatcher } from '../../../src/main/clipboard/watcher'
import type { NewEntry } from '../../../src/main/clipboard/store'
import { FakeClipboard } from './fakes'

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0))

function monitorFor(bundle: string | null, clock: { t: number }): PrivateAppMonitor {
  return new PrivateAppMonitor(
    () => clock.t,
    async (_cmd, args) => {
      if (args[0] === 'front') return 'ASN:0x0-0x1234:\n'
      return bundle ? `"CFBundleIdentifier"="${bundle}"\n` : ''
    }
  )
}

describe('lsappinfo output', () => {
  it('extracts the bundle id', () => {
    expect(parseBundleId('"CFBundleIdentifier"="com.apple.Passwords"\n')).toBe(
      'com.apple.Passwords'
    )
    expect(parseBundleId('')).toBeNull()
  })

  it('knows the password managers, ignoring case', () => {
    expect(isPrivateAppBundle('com.apple.Passwords')).toBe(true)
    expect(isPrivateAppBundle('com.1password.1password')).toBe(true)
    expect(isPrivateAppBundle('com.apple.Safari')).toBe(false)
  })
})

describe('PrivateAppMonitor', () => {
  it('is inactive until a password manager has been seen', async () => {
    const clock = { t: 100000 }
    const m = monitorFor('com.apple.Safari', clock)
    m.sample()
    await flush()
    expect(m.isPrivateAppActive()).toBe(false)
  })

  it('stays active for the grace period after Passwords was in front, then expires', async () => {
    const clock = { t: 100000 }
    const m = monitorFor('com.apple.Passwords', clock)
    m.sample()
    await flush()
    expect(m.isPrivateAppActive()).toBe(true)
    clock.t += PRIVATE_APP_GRACE_MS - 1
    expect(m.isPrivateAppActive()).toBe(true)
    clock.t += 2
    expect(m.isPrivateAppActive()).toBe(false)
  })

  it('treats a failing lookup as unknown, not as private', async () => {
    const m = new PrivateAppMonitor(
      () => 1000,
      async () => {
        throw new Error('no lsappinfo')
      }
    )
    m.sample()
    await flush()
    expect(m.isPrivateAppActive()).toBe(false)
  })
})

describe('watcher with a password manager in front', () => {
  function setup(active: { v: boolean }): {
    clip: FakeClipboard
    seen: NewEntry[]
    w: ClipboardWatcher
  } {
    const clip = new FakeClipboard()
    const seen: NewEntry[] = []
    const w = new ClipboardWatcher({
      clipboard: clip,
      platform: 'darwin',
      getSettings: () => ({ ...DEFAULT_CLIPBOARD_SETTINGS, enabled: true }),
      onEntry: (e) => seen.push(e),
      isPrivateAppActive: () => active.v,
      setTimer: () => 1,
      clearTimer: () => undefined
    })
    return { clip, seen, w }
  }

  it('does not record copies made while the private app is active', () => {
    const active = { v: true }
    const { clip, seen, w } = setup(active)
    w.start()
    clip.set({ text: 'plain words from the passwords app' })
    w.tick()
    expect(seen).toEqual([])
    active.v = false
    clip.set({ text: 'copied somewhere else' })
    w.tick()
    expect(seen.map((e) => e.text)).toEqual(['copied somewhere else'])
  })
})

describe("Apple's generated password format", () => {
  it('is treated as sensitive', () => {
    expect(looksSensitive('jodzu1-vovwyv-gAgrah')).toBe(true)
  })
  it('does not catch ordinary dashed text', () => {
    expect(looksSensitive('first-second-third')).toBe(false)
    expect(looksSensitive('release-notes-draft')).toBe(false)
    expect(looksSensitive('2024-10-06-meeting-notes')).toBe(false)
  })
})
