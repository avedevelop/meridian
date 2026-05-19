import { describe, it, expect } from 'vitest'
import { getSegments } from '../../src/renderer/src/components/Editor/Breadcrumb'

describe('getSegments', () => {
  it('splits a relative path into segments', () => {
    expect(getSegments('Projects/Notes/ideas.md')).toEqual([
      { name: 'Projects', isLast: false },
      { name: 'Notes', isLast: false },
      { name: 'ideas.md', isLast: true }
    ])
  })

  it('handles a root-level file', () => {
    expect(getSegments('README.md')).toEqual([{ name: 'README.md', isLast: true }])
  })

  it('returns empty array for empty string', () => {
    expect(getSegments('')).toEqual([])
  })
})
