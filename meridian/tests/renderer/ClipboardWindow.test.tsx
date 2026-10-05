import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ClipboardEntrySummary, ClipboardSettings } from '../../src/shared/clipboard'
import { DEFAULT_CLIPBOARD_SETTINGS } from '../../src/shared/clipboard'
import ClipboardWindow from '../../src/renderer/src/components/Clipboard/ClipboardWindow'
import {
  moveSelection,
  nextFilter,
  shortAge,
  snippetRows
} from '../../src/renderer/src/components/Clipboard/clipboardRows'

const entry = (
  id: string,
  preview: string,
  extra: Partial<ClipboardEntrySummary> = {}
): ClipboardEntrySummary => ({
  id,
  kind: 'text',
  preview,
  length: preview.length,
  createdAt: 1,
  lastUsedAt: Date.now(),
  pinned: false,
  sensitive: false,
  ...extra
})

const ENTRIES = [
  entry('a', 'first copied'),
  entry('b', 'second copied'),
  entry('c', 'https://example.com')
]

function makeApi(settings: Partial<ClipboardSettings> = {}) {
  const state: ClipboardSettings = { ...DEFAULT_CLIPBOARD_SETTINGS, enabled: true, ...settings }
  return {
    list: vi.fn(async () => ({ items: ENTRIES, nextCursor: null, total: ENTRIES.length })),
    pin: vi.fn(async () => true),
    remove: vi.fn(async () => true),
    clear: vi.fn(async () => undefined),
    copyBack: vi.fn(async () => true),
    getImage: vi.fn(async () => null),
    saveToNote: vi.fn(async () => ({ ok: true as const, path: '/v/Inbox.md' })),
    listSnippets: vi.fn(async () => [{ name: 'Signature', preview: 'Best regards' }]),
    useSnippet: vi.fn(async () => true),
    state: vi.fn(async () => ({
      vaultOpen: true,
      language: 'en',
      hotkey: 'CommandOrControl+Shift+H',
      hotkeyRegistered: true,
      platform: 'linux'
    })),
    hide: vi.fn(async () => undefined),
    getSettings: vi.fn(async () => state),
    setSettings: vi.fn(async (patch: Partial<ClipboardSettings>) => Object.assign(state, patch)),
    onChanged: vi.fn(() => () => undefined),
    onShown: vi.fn(() => () => undefined)
  }
}

let api: ReturnType<typeof makeApi>

async function mount(settings: Partial<ClipboardSettings> = {}) {
  api = makeApi(settings)
  ;(window as unknown as { clipboardHistory: unknown }).clipboardHistory = api
  render(<ClipboardWindow />)
  await flush()
}

async function flush(ms = 150) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

const search = () => screen.getByPlaceholderText('clipboard.search')
const press = async (key: string, opts: Partial<KeyboardEventInit> = {}) => {
  fireEvent.keyDown(search(), { key, ...opts })
  await flush(10)
}
const selectedText = () => screen.getByRole('option', { selected: true }).textContent

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('ClipboardWindow', () => {
  it('lists history and selects the first row', async () => {
    await mount()
    expect(screen.getAllByRole('option')).toHaveLength(3)
    expect(selectedText()).toContain('first copied')
  })

  it('moves the selection with the arrow keys and clamps at the ends', async () => {
    await mount()
    await press('ArrowDown')
    expect(selectedText()).toContain('second copied')
    await press('ArrowDown')
    await press('ArrowDown')
    expect(selectedText()).toContain('https://example.com')
    await press('ArrowUp')
    await press('ArrowUp')
    await press('ArrowUp')
    expect(selectedText()).toContain('first copied')
  })

  it('Enter copies the selected entry back and hides the window', async () => {
    await mount()
    await press('ArrowDown')
    await press('Enter')
    expect(api.copyBack).toHaveBeenCalledWith('b', { plain: false })
    expect(api.hide).toHaveBeenCalled()
  })

  it('Shift+Enter copies as plain text', async () => {
    await mount()
    await press('Enter', { shiftKey: true })
    expect(api.copyBack).toHaveBeenCalledWith('a', { plain: true })
  })

  it('keeps the window open and shows a message when copying fails', async () => {
    await mount()
    api.copyBack.mockResolvedValueOnce(false)
    await press('Enter')
    expect(api.hide).not.toHaveBeenCalled()
    expect(screen.getByText('clipboard.copyFailed')).toBeInTheDocument()
  })

  it('clicking a row activates it', async () => {
    await mount()
    fireEvent.click(screen.getByText('second copied'))
    await flush(10)
    expect(api.copyBack).toHaveBeenCalledWith('b', { plain: false })
  })

  it('pins with Ctrl+P and deletes with Delete', async () => {
    await mount()
    await press('p', { ctrlKey: true })
    expect(api.pin).toHaveBeenCalledWith('a', true)
    await press('Delete')
    expect(api.remove).toHaveBeenCalledWith('a')
  })

  it('saves to Inbox, a new note and the daily note from the keyboard', async () => {
    await mount()
    await press('Enter', { ctrlKey: true })
    expect(api.saveToNote).toHaveBeenLastCalledWith('a', 'inbox')
    expect(screen.getByText('clipboard.saved.inbox')).toBeInTheDocument()
    await press('Enter', { ctrlKey: true, shiftKey: true })
    expect(api.saveToNote).toHaveBeenLastCalledWith('a', 'new')
    await press('d', { metaKey: true })
    expect(api.saveToNote).toHaveBeenLastCalledWith('a', 'daily')
    expect(api.hide).not.toHaveBeenCalled()
  })

  it('explains when there is no vault to save into', async () => {
    await mount()
    api.saveToNote.mockResolvedValueOnce({ ok: false, error: 'no-vault' } as never)
    await press('Enter', { ctrlKey: true })
    expect(screen.getByText('clipboard.noVault')).toBeInTheDocument()
  })

  it('searches with a debounce and sends the query to the engine', async () => {
    await mount()
    api.list.mockClear()
    fireEvent.change(search(), { target: { value: 'invoice' } })
    await flush(30)
    expect(api.list).not.toHaveBeenCalled()
    await flush(150)
    expect(api.list).toHaveBeenCalledTimes(1)
    expect(api.list.mock.calls[0][0]).toMatchObject({ query: 'invoice' })
  })

  it('Escape clears the search first, then hides', async () => {
    await mount()
    fireEvent.change(search(), { target: { value: 'abc' } })
    await press('Escape')
    expect((search() as HTMLInputElement).value).toBe('')
    expect(api.hide).not.toHaveBeenCalled()
    await press('Escape')
    expect(api.hide).toHaveBeenCalled()
  })

  it('Tab cycles filters and sends the matching query', async () => {
    await mount()
    api.list.mockClear()
    await press('Tab')
    await flush()
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('clipboard.filter.text')
    expect(api.list.mock.calls.at(-1)?.[0]).toMatchObject({ kind: 'text' })
    await press('3', { ctrlKey: true })
    await flush()
    expect(api.list.mock.calls.at(-1)?.[0]).toMatchObject({ kind: 'link' })
    await press('5', { ctrlKey: true })
    await flush()
    expect(api.list.mock.calls.at(-1)?.[0]).toMatchObject({ pinnedOnly: true })
  })

  it('lists snippets and uses one with Enter', async () => {
    await mount()
    await press('6', { ctrlKey: true })
    await flush()
    expect(screen.getByText('Signature')).toBeInTheDocument()
    await press('Enter')
    expect(api.useSnippet).toHaveBeenCalledWith('Signature')
    expect(api.hide).toHaveBeenCalled()
    await press('Delete')
    expect(api.remove).not.toHaveBeenCalled()
  })

  it('masks nothing itself: sensitive previews arrive masked from the engine and are labelled', async () => {
    await mount()
    api.list.mockResolvedValueOnce({
      items: [entry('s', '••••••••', { sensitive: true })],
      nextCursor: null,
      total: 1
    })
    fireEvent.change(search(), { target: { value: 'x' } })
    await flush()
    expect(screen.getByTitle('clipboard.sensitive')).toHaveTextContent('••••••••')
  })

  it('asks for consent before recording and enables it on click', async () => {
    await mount({ enabled: false })
    expect(screen.getByText('clipboard.onboard.title')).toBeInTheDocument()
    fireEvent.click(screen.getByText('clipboard.onboard.enable'))
    await flush()
    expect(api.setSettings).toHaveBeenCalledWith({ enabled: true })
    expect(screen.queryByText('clipboard.onboard.title')).not.toBeInTheDocument()
  })

  it('still shows snippets while recording is off', async () => {
    await mount({ enabled: false })
    await press('6', { ctrlKey: true })
    await flush()
    expect(screen.getByText('Signature')).toBeInTheDocument()
  })

  it('needs two clicks to clear the history', async () => {
    await mount()
    fireEvent.click(screen.getByText('clipboard.clear'))
    expect(api.clear).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('clipboard.clearConfirm'))
    await flush(10)
    expect(api.clear).toHaveBeenCalledTimes(1)
  })

  it('pauses and resumes recording', async () => {
    await mount()
    fireEvent.click(screen.getByText('clipboard.pause'))
    await flush(10)
    expect(api.setSettings).toHaveBeenCalledWith({ paused: true })
  })

  it('warns when the global shortcut could not be registered', async () => {
    api = makeApi()
    api.state.mockResolvedValue({
      vaultOpen: true,
      language: 'en',
      hotkey: 'CommandOrControl+Shift+H',
      hotkeyRegistered: false,
      platform: 'win32'
    })
    ;(window as unknown as { clipboardHistory: unknown }).clipboardHistory = api
    render(<ClipboardWindow />)
    await flush()
    expect(screen.getByText('clipboard.hotkeyTaken')).toBeInTheDocument()
  })
})

describe('clipboardRows helpers', () => {
  it('shortAge uses compact units', () => {
    const now = 1_000_000_000
    expect(shortAge(now - 5_000, now)).toBe('5s')
    expect(shortAge(now - 5 * 60_000, now)).toBe('5m')
    expect(shortAge(now - 3 * 3_600_000, now)).toBe('3h')
    expect(shortAge(now - 2 * 86_400_000, now)).toBe('2d')
    expect(shortAge(now + 10_000, now)).toBe('0s')
  })

  it('nextFilter wraps in both directions', () => {
    expect(nextFilter('snippets', 1)).toBe('all')
    expect(nextFilter('all', -1)).toBe('snippets')
  })

  it('moveSelection handles empty lists and unknown keys', () => {
    expect(moveSelection([], null, 1)).toBeNull()
    const rows = snippetRows(
      [
        { name: 'a', preview: '' },
        { name: 'b', preview: '' }
      ],
      ''
    )
    expect(moveSelection(rows, 'missing', 1)).toBe('snippet:b')
    expect(moveSelection(rows, 'snippet:a', -1)).toBe('snippet:a')
  })

  it('snippetRows filters by name or preview', () => {
    const list = [
      { name: 'Signature', preview: 'Best regards' },
      { name: 'Address', preview: '12 Main St' }
    ]
    expect(snippetRows(list, 'regards').map((r) => r.key)).toEqual(['snippet:Signature'])
    expect(snippetRows(list, 'ADDR').map((r) => r.key)).toEqual(['snippet:Address'])
  })
})
