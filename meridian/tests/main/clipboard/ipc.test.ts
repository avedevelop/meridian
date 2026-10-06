// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ handlers: new Map<string, (...args: unknown[]) => unknown>() }))

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, fn: (...args: unknown[]) => unknown) =>
      mocks.handlers.set(channel, fn),
    removeHandler: vi.fn()
  },
  BrowserWindow: { fromWebContents: () => null, getAllWindows: () => [] }
}))

import {
  CLIPBOARD_IPC,
  DEFAULT_CLIPBOARD_SETTINGS,
  type ClipboardSettings
} from '../../../src/shared/clipboard'
import { registerClipboardIpc } from '../../../src/main/clipboard/ipc'
import { consentText } from '../../../src/main/clipboard/consent'

function setup(
  answer: boolean | (() => Promise<boolean>) = true,
  initial: Partial<ClipboardSettings> = {}
) {
  let state: ClipboardSettings = { ...DEFAULT_CLIPBOARD_SETTINGS, ...initial }
  const service = {
    getSettings: () => state,
    setSettings: vi.fn((patch: Partial<ClipboardSettings>) => (state = { ...state, ...patch }))
  }
  const confirm = vi.fn(typeof answer === 'function' ? answer : async () => answer)
  mocks.handlers.clear()
  registerClipboardIpc(service as never, {
    getVaultPath: () => null,
    getPreferences: () => ({}),
    getWindowInfo: () => ({ hotkey: 'x', hotkeyRegistered: true }),
    readClipboardText: () => '',
    confirmEnableRecording: confirm,
    hideWindow: () => undefined,
    platform: 'linux'
  })
  const setSettings = (patch: unknown) =>
    Promise.resolve(
      mocks.handlers.get(CLIPBOARD_IPC.SET_SETTINGS)!({ sender: {} }, patch)
    ) as Promise<ClipboardSettings>
  return { service, confirm, setSettings }
}

beforeEach(() => mocks.handlers.clear())

describe('turning clipboard recording on', () => {
  it('asks the user first, and enables recording only on an explicit yes', async () => {
    const { confirm, setSettings, service } = setup(true)
    expect((await setSettings({ enabled: true })).enabled).toBe(true)
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(service.setSettings).toHaveBeenCalledWith({ enabled: true })
  })

  it('keeps recording off when the user declines, but still applies the other changes in the patch', async () => {
    const { confirm, setSettings, service } = setup(false)
    const result = await setSettings({ enabled: true, maxEntries: 123 })
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(result.enabled).toBe(false)
    expect(result.maxEntries).toBe(123)
    expect(service.setSettings).toHaveBeenCalledWith({ maxEntries: 123 })
  })

  it('does not ask when recording is already on, when turning it off, or for other settings', async () => {
    const on = setup(true, { enabled: true })
    await on.setSettings({ enabled: true })
    await on.setSettings({ enabled: false })
    await on.setSettings({ maxEntries: 100 })
    expect(on.confirm).not.toHaveBeenCalled()

    const off = setup(true)
    await off.setSettings({ maxAgeDays: 7 })
    await off.setSettings({ enabled: false })
    await off.setSettings(undefined)
    expect(off.confirm).not.toHaveBeenCalled()
  })

  it('treats a truthy but non-true value as not enabling', async () => {
    const { confirm, setSettings, service } = setup(true)
    await setSettings({ enabled: 'yes' })
    expect(confirm).not.toHaveBeenCalled()
    expect(service.setSettings).toHaveBeenCalledWith({ enabled: 'yes' }) // normalizeSettings rejects it
  })

  it('shows one dialog when several requests arrive while it is open', async () => {
    let release!: (v: boolean) => void
    const gate = new Promise<boolean>((r) => (release = r))
    const { confirm, setSettings } = setup(() => gate)
    const calls = [
      setSettings({ enabled: true }),
      setSettings({ enabled: true }),
      setSettings({ enabled: true })
    ]
    await Promise.resolve()
    expect(confirm).toHaveBeenCalledTimes(1)
    release(false)
    const results = await Promise.all(calls)
    expect(results.every((r) => r.enabled === false)).toBe(true)
  })

  it('asks again later if the user declined the first time', async () => {
    const { confirm, setSettings } = setup(false)
    await setSettings({ enabled: true })
    await setSettings({ enabled: true })
    expect(confirm).toHaveBeenCalledTimes(2)
  })
})

describe('consentText', () => {
  it('follows the app language and defaults to English', () => {
    expect(consentText('ru').confirm).toBe('Включить')
    expect(consentText('nb').cancel).toBe('Avbryt')
    expect(consentText('de').title).toBe('Turn on clipboard history?')
    expect(consentText(undefined).confirm).toBe('Turn on')
  })
})
