import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

// Mock electron app.getPath to use a temp directory
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => mkdtempSync(join(tmpdir(), 'meridian-settings-test-')))
  }
}))

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
