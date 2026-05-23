import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useSettingsStore } from '../../src/renderer/src/store/useSettingsStore'

describe('useSettingsStore', () => {
  const originalSettings = (window as any).settings

  beforeEach(() => {
    // Stub global localStorage
    const store: Record<string, string> = {}
    const mockLocalStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value
      },
      removeItem: (key: string) => {
        delete store[key]
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k])
      }
    }
    vi.stubGlobal('localStorage', mockLocalStorage)

    useSettingsStore.getState().resetToDefault()
  })

  afterEach(() => {
    ;(window as any).settings = originalSettings
    vi.unstubAllGlobals()
  })

  it('sets and toggles plugin state with dynamic IDs', () => {
    const stateBefore = useSettingsStore.getState().pluginsEnabled
    expect(stateBefore.dailyNotes).toBe(true)
    expect(stateBefore.gitBackup).toBe(false)
    expect(stateBefore['some-community-plugin']).toBeUndefined()

    // Toggle core plugin
    useSettingsStore.getState().togglePlugin('gitBackup')
    expect(useSettingsStore.getState().pluginsEnabled.gitBackup).toBe(true)

    // Toggle community plugin (dynamic ID)
    useSettingsStore.getState().togglePlugin('some-community-plugin')
    expect(useSettingsStore.getState().pluginsEnabled['some-community-plugin']).toBe(true)

    // Toggle back
    useSettingsStore.getState().togglePlugin('some-community-plugin')
    expect(useSettingsStore.getState().pluginsEnabled['some-community-plugin']).toBe(false)
  })

  it('correctly handles loading settings from disk with legacy communityPluginsEnabled keys', async () => {
    const mockPrefs = {
      theme: 'cyberpunk',
      pluginsEnabled: {
        dailyNotes: false,
        wordCounter: true
      },
      communityPluginsEnabled: {
        'legacy-community-plugin-1': true,
        'legacy-community-plugin-2': false
      }
    }

    ;(window as any).settings = {
      getPreferences: vi.fn().mockResolvedValue(mockPrefs),
      setPreferences: vi.fn().mockResolvedValue(undefined)
    }

    await useSettingsStore.getState().loadFromDisk()

    const state = useSettingsStore.getState()
    expect(state.theme).toBe('cyberpunk')
    expect(state.pluginsEnabled.dailyNotes).toBe(false)
    expect(state.pluginsEnabled.wordCounter).toBe(true)
    expect(state.pluginsEnabled['legacy-community-plugin-1']).toBe(true)
    expect(state.pluginsEnabled['legacy-community-plugin-2']).toBe(false)
  })
})
