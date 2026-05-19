import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock electron-store to use a temp path
vi.mock('electron-store', () => {
  return {
    default: class MockStore {
      private data: Record<string, unknown> = {}
      get<T>(key: string, defaultValue: T): T {
        return (this.data[key] as T) ?? defaultValue
      }
      set(key: string, value: unknown) {
        this.data[key] = value
      }
    }
  }
})

import { AppSettings } from '../../src/main/settings'

describe('AppSettings', () => {
  let settings: AppSettings

  beforeEach(() => {
    settings = new AppSettings()
  })

  it('returns default config when nothing saved', () => {
    const config = settings.get()
    expect(config.recentVaults).toEqual([])
    expect(config.lastVault).toBeNull()
  })

  it('saves and retrieves last vault', () => {
    settings.setLastVault('/Users/test/MyVault')
    expect(settings.get().lastVault).toBe('/Users/test/MyVault')
  })

  it('adds to recent vaults without duplicates', () => {
    settings.addRecentVault('/path/A', 'A')
    settings.addRecentVault('/path/B', 'B')
    settings.addRecentVault('/path/A', 'A')
    const recents = settings.get().recentVaults
    expect(recents.length).toBe(2)
    expect(recents[0].path).toBe('/path/A') // most recent first
  })
})
