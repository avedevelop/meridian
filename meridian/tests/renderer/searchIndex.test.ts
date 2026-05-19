import { describe, it, expect } from 'vitest'
import { SearchIndex } from '../../src/renderer/src/lib/searchIndex'

describe('SearchIndex', () => {
  it('finds files by content', () => {
    const idx = new SearchIndex()
    idx.addOrUpdate('/vault/A.md', 'A.md', 'The quick brown fox')
    idx.addOrUpdate('/vault/B.md', 'B.md', 'A lazy dog sat here')

    const results = idx.search('fox')
    expect(results.map((r) => r.path)).toContain('/vault/A.md')
    expect(results.map((r) => r.path)).not.toContain('/vault/B.md')
  })

  it('finds files by name', () => {
    const idx = new SearchIndex()
    idx.addOrUpdate('/vault/Meeting Notes.md', 'Meeting Notes.md', 'content here')

    const results = idx.search('meeting')
    expect(results[0].path).toBe('/vault/Meeting Notes.md')
  })

  it('returns empty array for no match', () => {
    const idx = new SearchIndex()
    idx.addOrUpdate('/vault/A.md', 'A.md', 'hello world')
    expect(idx.search('xyz123')).toEqual([])
  })

  it('removes a file from the index', () => {
    const idx = new SearchIndex()
    idx.addOrUpdate('/vault/A.md', 'A.md', 'unique phrase')
    idx.remove('/vault/A.md')
    expect(idx.search('unique phrase')).toEqual([])
  })
})
