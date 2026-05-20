import { describe, it, expect } from 'vitest'
import type { VaultFile } from '../../src/shared/types'

type SortOrder = 'name-asc' | 'name-desc' | 'modified'

function sortFiles(files: VaultFile[], order: SortOrder): VaultFile[] {
  const sorted = [...files].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
    if (order === 'name-asc') return a.name.localeCompare(b.name)
    if (order === 'name-desc') return b.name.localeCompare(a.name)
    if (order === 'modified') return b.mtime - a.mtime
    return 0
  })
  return sorted.map((f) =>
    f.isDirectory && f.children ? { ...f, children: sortFiles(f.children, order) } : f
  )
}

const makeFile = (name: string, mtime: number, isDirectory = false): VaultFile => ({
  name,
  path: `/vault/${name}`,
  relativePath: name,
  isDirectory,
  mtime,
  birthtime: 0,
  children: isDirectory ? [] : undefined
})

describe('sortFiles', () => {
  it('sorts A→Z with folders first', () => {
    const files = [makeFile('b.md', 100), makeFile('a.md', 200), makeFile('dir', 50, true)]
    const sorted = sortFiles(files, 'name-asc')
    expect(sorted[0].name).toBe('dir')
    expect(sorted[1].name).toBe('a.md')
    expect(sorted[2].name).toBe('b.md')
  })

  it('sorts Z→A with folders still first', () => {
    const files = [makeFile('a.md', 100), makeFile('b.md', 200), makeFile('dir', 50, true)]
    const sorted = sortFiles(files, 'name-desc')
    expect(sorted[0].name).toBe('dir')
    expect(sorted[1].name).toBe('b.md')
    expect(sorted[2].name).toBe('a.md')
  })

  it('sorts by modified (newest first) with folders still first', () => {
    const files = [makeFile('old.md', 100), makeFile('new.md', 999), makeFile('dir', 50, true)]
    const sorted = sortFiles(files, 'modified')
    expect(sorted[0].name).toBe('dir')
    expect(sorted[1].name).toBe('new.md')
    expect(sorted[2].name).toBe('old.md')
  })

  it('recursively sorts children', () => {
    const dir = makeFile('dir', 100, true) as VaultFile & { children: VaultFile[] }
    dir.children = [makeFile('z.md', 100), makeFile('a.md', 200)]
    const sorted = sortFiles([dir], 'name-asc')
    expect(sorted[0].children![0].name).toBe('a.md')
    expect(sorted[0].children![1].name).toBe('z.md')
  })

  it('does not mutate the original array', () => {
    const files = [makeFile('b.md', 100), makeFile('a.md', 200)]
    const copy = [...files]
    sortFiles(files, 'name-asc')
    expect(files[0].name).toBe(copy[0].name)
  })
})
