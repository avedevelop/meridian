import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

// Mock the IPC bridge
vi.stubGlobal('window', {
  vault: {
    listFiles: vi.fn().mockResolvedValue([
      {
        name: 'Note.md',
        path: '/vault/Note.md',
        relativePath: 'Note.md',
        isDirectory: false,
        mtime: 0
      }
    ]),
    readFile: vi.fn().mockResolvedValue('# Note'),
    writeFile: vi.fn().mockResolvedValue(undefined),
    createFile: vi.fn().mockResolvedValue('/vault/New.md')
  },
  settings: { get: vi.fn(), set: vi.fn() }
})

import { useVaultStore } from '../../src/renderer/src/store/useVaultStore'

beforeEach(() => {
  useVaultStore.setState({
    files: [],
    openTabs: [],
    activeTabPath: null,
    vault: null,
    panes: [{ id: 'pane-main', openTabs: [], activeTabPath: null }],
    activePaneId: 'pane-main',
  })
})

describe('useVaultStore', () => {
  it('starts with empty state', () => {
    const { result } = renderHook(() => useVaultStore())
    expect(result.current.files).toEqual([])
    expect(result.current.openTabs).toEqual([])
  })

  it('opens a tab and sets it active', () => {
    const { result } = renderHook(() => useVaultStore())
    act(() => result.current.openTab('/vault/Note.md', 'Note.md'))
    expect(result.current.openTabs.length).toBe(1)
    expect(result.current.activeTabPath).toBe('/vault/Note.md')
  })

  it('does not duplicate tabs', () => {
    const { result } = renderHook(() => useVaultStore())
    act(() => result.current.openTab('/vault/Note.md', 'Note.md'))
    act(() => result.current.openTab('/vault/Note.md', 'Note.md'))
    expect(result.current.openTabs.length).toBe(1)
  })

  it('closes a tab and activates the previous one', () => {
    const { result } = renderHook(() => useVaultStore())
    act(() => result.current.openTab('/vault/A.md', 'A.md'))
    act(() => result.current.openTab('/vault/B.md', 'B.md'))
    act(() => result.current.closeTab('/vault/B.md'))
    expect(result.current.openTabs.length).toBe(1)
    expect(result.current.activeTabPath).toBe('/vault/A.md')
  })

  it('sets tab content', () => {
    const { result } = renderHook(() => useVaultStore())
    act(() => result.current.openTab('/vault/Note.md', 'Note.md'))
    act(() => result.current.setTabContent('/vault/Note.md', '# Hello'))
    const tab = result.current.openTabs.find((t) => t.path === '/vault/Note.md')
    expect(tab?.content).toBe('# Hello')
  })
})
