import { describe, expect, it } from 'vitest'
import { getBundledWelcomeVaultFiles } from '../../src/shared/welcomeVault'

describe('bundled welcome vault', () => {
  it('uses Windows shortcuts in Windows English content', () => {
    const files = getBundledWelcomeVaultFiles('windows', 'en')
    const welcome = files.find((file) => file.path === 'Welcome.md')

    expect(welcome?.content).toContain('Ctrl+K')
    expect(welcome?.content).not.toContain('Cmd+K')
  })

  it('uses macOS shortcuts in macOS Russian content', () => {
    const files = getBundledWelcomeVaultFiles('macos', 'ru')
    const welcome = files.find((file) => file.path === 'Welcome.md')

    expect(welcome?.content).toContain('Cmd+K')
    expect(welcome?.content).not.toContain('Ctrl+K')
  })

  it('includes Ask Vault and relationship demo notes', () => {
    const files = getBundledWelcomeVaultFiles('windows', 'ru')

    expect(files.map((file) => file.path)).toEqual([
      'Welcome.md',
      'Projects/Meridian Tour.md',
      'Views/Saved Views.md',
      'Daily/2026-05-27.md'
    ])
    expect(files.some((file) => file.content.includes('Ask Vault'))).toBe(true)
    expect(files.some((file) => file.content.includes('related:'))).toBe(true)
  })
})
