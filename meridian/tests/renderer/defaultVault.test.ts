import { describe, expect, it } from 'vitest'
import { getWelcomeVaultPath } from '../../src/renderer/src/utils/defaultVault'

describe('default vault path', () => {
  it('uses a Windows-specific welcome vault name on Windows', () => {
    expect(getWelcomeVaultPath('/Users/vladyslav', 'Win32')).toBe(
      '/Users/vladyslav/Documents/Meridian Welcome (Windows)'
    )
  })

  it('keeps the macOS welcome vault name on macOS', () => {
    expect(getWelcomeVaultPath('/Users/vladyslav', 'MacIntel')).toBe(
      '/Users/vladyslav/Documents/Meridian Welcome'
    )
  })
})
