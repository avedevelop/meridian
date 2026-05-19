import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useLinkStore } from '../../src/renderer/src/store/useLinkStore'

beforeEach(() => {
  useLinkStore.getState().reset()
})

describe('useLinkStore', () => {
  it('starts with empty state', () => {
    const { result } = renderHook(() => useLinkStore())
    expect(result.current.backlinks('/vault/A.md')).toEqual([])
    expect(result.current.searchResults).toEqual([])
  })

  it('indexes a file and returns backlinks', () => {
    const { result } = renderHook(() => useLinkStore())
    act(() => {
      result.current.indexFile('/vault/A.md', 'A.md', '[[B]]', '/vault')
      result.current.indexFile('/vault/B.md', 'B.md', 'nothing', '/vault')
    })
    expect(result.current.backlinks('/vault/B.md')).toEqual(['/vault/A.md'])
  })

  it('returns search results', () => {
    const { result } = renderHook(() => useLinkStore())
    act(() => {
      result.current.indexFile('/vault/Notes.md', 'Notes.md', 'the quick brown fox', '/vault')
    })
    act(() => {
      result.current.search('fox')
    })
    expect(result.current.searchResults.map(r => r.path)).toContain('/vault/Notes.md')
  })

  it('returns tags for a file', () => {
    const { result } = renderHook(() => useLinkStore())
    act(() => {
      result.current.indexFile('/vault/A.md', 'A.md', '#project #todo', '/vault')
    })
    expect(result.current.tagsForFile('/vault/A.md')).toEqual(expect.arrayContaining(['project', 'todo']))
  })
})
