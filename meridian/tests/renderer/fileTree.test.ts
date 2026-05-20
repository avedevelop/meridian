import { describe, it, expect } from 'vitest'

// This mirrors the guard logic we're adding to FileTree
function wouldCreateCycle(dragPath: string, targetPath: string): boolean {
  if (dragPath === targetPath) return true
  if (targetPath.startsWith(dragPath + '/')) return true
  return false
}

describe('folder drag-drop cycle prevention', () => {
  it('prevents dropping a folder onto itself', () => {
    expect(wouldCreateCycle('/vault/folder', '/vault/folder')).toBe(true)
  })

  it('prevents dropping a folder into its own subdirectory', () => {
    expect(wouldCreateCycle('/vault/folder', '/vault/folder/sub')).toBe(true)
    expect(wouldCreateCycle('/vault/folder', '/vault/folder/sub/deep')).toBe(true)
  })

  it('allows dropping a folder into an unrelated directory', () => {
    expect(wouldCreateCycle('/vault/folder', '/vault/other')).toBe(false)
  })

  it('does not falsely match similar-named folders', () => {
    // /vault/folder should not block /vault/folderext
    expect(wouldCreateCycle('/vault/folder', '/vault/folderext')).toBe(false)
  })

  it('allows dropping a subfolder into a sibling folder', () => {
    expect(wouldCreateCycle('/vault/parent/child', '/vault/parent/sibling')).toBe(false)
  })
})
