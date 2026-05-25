import { describe, expect, it } from 'vitest'
import {
  getWelcomeVaultPath,
  getWelcomeVaultSourcePath
} from '../../src/renderer/src/utils/defaultVault'

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

  it('selects the macOS Russian welcome vault source', () => {
    expect(getWelcomeVaultSourcePath('darwin', 'ru')).toBe('macos/ru')
  })

  it('selects the Windows English welcome vault source by default', () => {
    expect(getWelcomeVaultSourcePath('win32', 'de')).toBe('windows/en')
  })
})
