import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SettingsAboutSection } from '../../src/renderer/src/components/Settings/SettingsAboutSection'
import { SettingsHotkeysSection } from '../../src/renderer/src/components/Settings/SettingsHotkeysSection'
import { buildWelcomeNoteContent } from '../../src/renderer/src/hooks/useVaultBridge'
import { formatShortcut, getWelcomeVaultPath } from '../../src/renderer/src/utils/platformShortcuts'
import en from '../../src/renderer/src/i18n/locales/en.json'
import ru from '../../src/renderer/src/i18n/locales/ru.json'

describe('windows copy cleanup', () => {
  beforeEach(() => {
    ;(window as any).vault = {
      getConfigPath: vi.fn().mockResolvedValue('/Users/vladyslav/Library/Application Support/Meridian'),
      openPath: vi.fn(),
      openExternal: vi.fn()
    }
  })

  afterEach(() => {
    delete (window as any).vault
  })

  it('keeps the about section copy neutral and still opens the config folder', async () => {
    expect(en['common.reveal']).not.toMatch(/Finder/i)
    expect(ru['common.reveal']).not.toMatch(/Finder/i)
    expect(en['settings.about.openConfig']).not.toMatch(/Finder/i)
    expect(ru['settings.about.openConfig']).not.toMatch(/Finder/i)
    expect(en['settings.about.openConfig']).toMatch(/config folder/i)
    expect(ru['settings.about.openConfig']).toMatch(/папк.*конфиг/i)

    render(<SettingsAboutSection />)

    fireEvent.click(screen.getByRole('button', { name: 'settings.about.openConfig' }))

    expect((window as any).vault.getConfigPath).toHaveBeenCalled()
    await waitFor(() =>
      expect((window as any).vault.openPath).toHaveBeenCalledWith(
        '/Users/vladyslav/Library/Application Support/Meridian'
      )
    )
  })

  it('shows Ctrl rather than Command shortcuts in Windows hotkey settings', () => {
    vi.spyOn(window.navigator, 'platform', 'get').mockReturnValue('Win32')

    render(<SettingsHotkeysSection />)

    expect(screen.getAllByText('Ctrl').length).toBeGreaterThan(0)
    expect(screen.queryByText('⌘')).not.toBeInTheDocument()
  })

  it('keeps Command glyph shortcuts in macOS hotkey settings', () => {
    vi.spyOn(window.navigator, 'platform', 'get').mockReturnValue('MacIntel')

    render(<SettingsHotkeysSection />)

    expect(screen.getAllByText('⌘').length).toBeGreaterThan(0)
    expect(screen.queryByText('Ctrl')).not.toBeInTheDocument()
  })

  it('uses Ctrl shortcuts in the Windows welcome note', () => {
    const welcomeContent = buildWelcomeNoteContent('Win32')

    expect(welcomeContent).toContain('`Ctrl+D`')
    expect(welcomeContent).toContain('`Ctrl+K`')
    expect(welcomeContent).toContain('`Ctrl+S`')
    expect(welcomeContent).not.toContain('⌘')
  })

  it('keeps Command glyph shortcuts in the macOS welcome note', () => {
    const welcomeContent = buildWelcomeNoteContent('MacIntel')

    expect(welcomeContent).toContain('`⌘D`')
    expect(welcomeContent).toContain('`⌘K`')
    expect(welcomeContent).not.toContain('Ctrl')
  })

  it('uses separate welcome vault destinations for Windows and macOS', () => {
    expect(getWelcomeVaultPath('/Users/vladyslav', 'Win32')).toBe(
      '/Users/vladyslav/Documents/Meridian Welcome (Windows)'
    )
    expect(getWelcomeVaultPath('/Users/vladyslav', 'MacIntel')).toBe(
      '/Users/vladyslav/Documents/Meridian Welcome'
    )
  })

  it('does not bake macOS-only glyphs into settings locale copy', () => {
    const settingsLocaleEntries = [...Object.entries(en), ...Object.entries(ru)].filter(([key]) =>
      key.startsWith('settings.')
    )

    expect(settingsLocaleEntries).not.toEqual(
      expect.arrayContaining([expect.arrayContaining([expect.any(String), expect.stringContaining('⌘')])])
    )
  })

  it('renders locale-derived shortcut strings with Ctrl on Windows', () => {
    const shortcutCopyCases = [
      ['sidebar.openAnotherVault', ['mod', 'O']],
      ['activityBar.settingsTooltip', ['mod', ',']],
      ['layout.searchPlaceholder', ['mod', 'K']],
      ['layout.toggleLeftSidebar', ['mod', 'B']],
      ['layout.toggleRightSidebar', ['mod', 'alt', 'B']],
      ['editor.openFileInstructions', ['mod', 'K']],
      ['editor.pressCmdKToSearch', ['mod', 'K']]
    ] as const

    for (const [translationKey, shortcutKeys] of shortcutCopyCases) {
      const shortcut = formatShortcut(shortcutKeys, 'Win32')
      const renderedEn = en[translationKey].replace('{{shortcut}}', shortcut)
      const renderedRu = ru[translationKey].replace('{{shortcut}}', shortcut)

      expect(renderedEn).toContain('Ctrl')
      expect(renderedRu).toContain('Ctrl')
      expect(renderedEn).not.toContain('⌘')
      expect(renderedRu).not.toContain('⌘')
    }
  })
})
