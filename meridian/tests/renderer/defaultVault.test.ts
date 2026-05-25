import { describe, expect, it } from 'vitest'
import { getWelcomeVaultPath } from '../../src/renderer/src/utils/defaultVault'

describe('default vault path', () => {
  it('uses the same Meridian welcome vault path for every platform', () => {
    expect(getWelcomeVaultPath('/Users/vladyslav')).toBe('/Users/vladyslav/Documents/Meridian Welcome')
  })
})
