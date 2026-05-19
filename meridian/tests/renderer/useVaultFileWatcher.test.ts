import { describe, expect, it } from 'vitest'
import { isMarkdownPath, isSameOrChildPath } from '../../src/renderer/src/hooks/useVaultFileWatcher'

describe('useVaultFileWatcher helpers', () => {
  it('detects markdown files case-insensitively', () => {
    expect(isMarkdownPath('/vault/Note.md')).toBe(true)
    expect(isMarkdownPath('/vault/Note.MD')).toBe(true)
    expect(isMarkdownPath('/vault/image.png')).toBe(false)
  })

  it('detects deleted files under a deleted directory', () => {
    expect(isSameOrChildPath('/vault/Folder', '/vault/Folder/Note.md')).toBe(true)
    expect(isSameOrChildPath('/vault/Folder/', '/vault/Folder/Note.md')).toBe(true)
    expect(isSameOrChildPath('/vault/Folder', '/vault/Folderish/Note.md')).toBe(false)
  })
})
