import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { DEFAULT_CLIPBOARD_SETTINGS, type ClipboardSettings } from '../../src/shared/clipboard'
import { SettingsClipboardSection } from '../../src/renderer/src/components/Settings/SettingsClipboardSection'

function makeApi(initial: Partial<ClipboardSettings> = {}, rejectHotkeys: string[] = []) {
  let state: ClipboardSettings = { ...DEFAULT_CLIPBOARD_SETTINGS, ...initial }
  return {
    getSettings: vi.fn(async () => state),
    setSettings: vi.fn(async (patch: Partial<ClipboardSettings>) => {
      const next = { ...state, ...patch }
      if (patch.hotkey && rejectHotkeys.includes(patch.hotkey)) next.hotkey = state.hotkey
      state = next
      return state
    }),
    clear: vi.fn(async () => undefined)
  }
}

let api: ReturnType<typeof makeApi>
const flush = async (ms = 0) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)))

async function mount(initial: Partial<ClipboardSettings> = {}, rejectHotkeys: string[] = []) {
  api = makeApi(initial, rejectHotkeys)
  ;(window as unknown as { clipboardHistory: unknown }).clipboardHistory = api
  render(<SettingsClipboardSection />)
  await flush()
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  delete (window as unknown as { clipboardHistory?: unknown }).clipboardHistory
})

describe('SettingsClipboardSection', () => {
  it('renders nothing when the clipboard API is unavailable', () => {
    const { container } = render(<SettingsClipboardSection />)
    expect(container.firstChild).toBeNull()
  })

  it('shows the current settings', async () => {
    await mount({ enabled: true, maxEntries: 1000, maxAgeDays: 90, sensitiveMode: 'skip' })
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[]
    expect(selects.map((s) => s.value)).toEqual(['1000', '90', 'skip'])
    expect(screen.getByText('settings.clipboard.title')).toBeInTheDocument()
  })

  it('shows a hand-edited value that is not one of the presets', async () => {
    await mount({ maxEntries: 777 })
    const [entries] = screen.getAllByRole('combobox') as HTMLSelectElement[]
    expect(entries.value).toBe('777')
  })

  it('saves dropdown changes', async () => {
    await mount()
    const [entries, age, sensitive] = screen.getAllByRole('combobox')
    fireEvent.change(entries, { target: { value: '10000' } })
    fireEvent.change(age, { target: { value: '7' } })
    fireEvent.change(sensitive, { target: { value: 'skip' } })
    await flush()
    expect(api.setSettings).toHaveBeenCalledWith({ maxEntries: 10000 })
    expect(api.setSettings).toHaveBeenCalledWith({ maxAgeDays: 7 })
    expect(api.setSettings).toHaveBeenCalledWith({ sensitiveMode: 'skip' })
  })

  describe('hotkey', () => {
    const press = async (code: string, mods: Partial<KeyboardEventInit> = {}) => {
      fireEvent.keyDown(screen.getByRole('button', { name: 'settings.clipboard.hotkey' }), {
        code,
        key: code,
        ...mods
      })
      await flush()
    }
    const start = async () => {
      fireEvent.click(screen.getByRole('button', { name: 'settings.clipboard.hotkey' }))
      await flush()
    }

    it('records a new shortcut', async () => {
      await mount()
      await start()
      expect(screen.getByText('settings.clipboard.hotkeyRecording')).toBeInTheDocument()
      await press('KeyJ', { ctrlKey: true, altKey: true })
      expect(api.setSettings).toHaveBeenCalledWith({ hotkey: 'CommandOrControl+Alt+J' })
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('ignores presses without a real modifier and keeps waiting', async () => {
      await mount()
      await start()
      await press('KeyJ')
      await press('KeyJ', { shiftKey: true })
      expect(api.setSettings).not.toHaveBeenCalled()
      expect(screen.getByText('settings.clipboard.hotkeyRecording')).toBeInTheDocument()
    })

    it('Escape cancels recording without changing anything', async () => {
      await mount()
      await start()
      await press('Escape')
      expect(api.setSettings).not.toHaveBeenCalled()
      expect(screen.queryByText('settings.clipboard.hotkeyRecording')).not.toBeInTheDocument()
    })

    it('warns when the shortcut is taken and keeps the previous one', async () => {
      await mount({}, ['CommandOrControl+Alt+J'])
      await start()
      await press('KeyJ', { ctrlKey: true, altKey: true })
      expect(screen.getByRole('alert')).toHaveTextContent('settings.clipboard.hotkeyTaken')
      expect(screen.getByRole('button', { name: 'settings.clipboard.hotkey' })).toHaveTextContent(
        'Ctrl+Shift+H'
      )
    })
  })

  it('needs two clicks to clear the history, and says when it is done', async () => {
    await mount()
    fireEvent.click(screen.getByText('settings.clipboard.clearButton'))
    expect(api.clear).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('settings.clipboard.clearConfirm'))
    await flush()
    expect(api.clear).toHaveBeenCalledTimes(1)
    expect(screen.getByText('settings.clipboard.cleared')).toBeInTheDocument()
  })

  it('drops the clear confirmation after a few seconds', async () => {
    await mount()
    fireEvent.click(screen.getByText('settings.clipboard.clearButton'))
    await flush(3500)
    expect(screen.getByText('settings.clipboard.clearButton')).toBeInTheDocument()
    expect(api.clear).not.toHaveBeenCalled()
  })

  it('toggles recording', async () => {
    await mount({ enabled: false })
    fireEvent.click(
      screen.getByText('settings.clipboard.enabled').closest('div')!.parentElement!
        .lastElementChild!
    )
    await flush()
    expect(api.setSettings).toHaveBeenCalledWith({ enabled: true })
  })
})
