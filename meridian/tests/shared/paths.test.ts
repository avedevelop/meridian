import { describe, it, expect } from 'vitest'
import { basename, isInside, noteName, relativeTo, toPosix } from '../../src/shared/paths'

describe('paths', () => {
  it('basename handles both separators and trailing slashes', () => {
    expect(basename('/vault/Notes/Idea.md')).toBe('Idea.md')
    expect(basename('C:\\Vault\\Notes\\Idea.md')).toBe('Idea.md')
    expect(basename('C:\\Vault\\Notes\\')).toBe('Notes')
    expect(basename('Idea.md')).toBe('Idea.md')
    expect(basename('')).toBe('')
  })

  it('noteName strips md and canvas extensions', () => {
    expect(noteName('C:\\V\\Board.canvas')).toBe('Board')
    expect(noteName('/v/A.MD')).toBe('A')
  })

  it('relativeTo returns posix-style relative paths or null', () => {
    expect(relativeTo('C:\\Vault', 'C:\\Vault\\Projects\\Idea.md')).toBe('Projects/Idea.md')
    expect(relativeTo('/vault/', '/vault/a/b.md')).toBe('a/b.md')
    expect(relativeTo('/vault', '/vault')).toBeNull()
    expect(relativeTo('/vault', '/vault2/a.md')).toBeNull()
  })

  it('isInside does not match sibling folders with a common prefix', () => {
    expect(isInside('C:\\Vault', 'C:\\Vault\\a.md')).toBe(true)
    expect(isInside('C:\\Vault', 'C:\\Vault2\\a.md')).toBe(false)
    expect(toPosix('a\\b')).toBe('a/b')
  })
})
