import { describe, expect, it } from 'vitest'
import {
  formatPlatformShortcut,
  getPlatformFileManagerName,
  getPlatformModifierKeys,
  interpolatePlatformTokens,
  isMacPlatform
} from '../../src/renderer/src/utils/platformUi'

describe('platform UI helpers', () => {
  it('uses macOS shortcut symbols on macOS', () => {
    expect(isMacPlatform('darwin')).toBe(true)
    expect(formatPlatformShortcut('mod+k', 'darwin')).toBe('⌘K')
    expect(formatPlatformShortcut('mod+shift+g', 'MacIntel')).toBe('⌘⇧G')
    expect(getPlatformModifierKeys(['mod', 'shift', 'z'], 'darwin')).toEqual(['⌘', '⇧', 'Z'])
  })

  it('uses Windows shortcut names outside macOS', () => {
    expect(isMacPlatform('win32')).toBe(false)
    expect(formatPlatformShortcut('mod+k', 'win32')).toBe('Ctrl+K')
    expect(formatPlatformShortcut('mod+shift+g', 'Win32')).toBe('Ctrl+Shift+G')
    expect(getPlatformModifierKeys(['mod', 'shift', 'z'], 'win32')).toEqual(['Ctrl', 'Shift', 'Z'])
  })

  it('uses the platform file manager name in visible copy', () => {
    expect(getPlatformFileManagerName('darwin')).toBe('Finder')
    expect(getPlatformFileManagerName('win32')).toBe('File Explorer')
    expect(interpolatePlatformTokens('Open in {{fileManager}} with {{mod}}K', 'win32')).toBe(
      'Open in File Explorer with Ctrl+K'
    )
  })
})
