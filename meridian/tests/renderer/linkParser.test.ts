import { describe, it, expect } from 'vitest'
import { parseLinks } from '../../src/renderer/src/lib/linkParser'

describe('parseLinks', () => {
  it('extracts wiki-links from content', () => {
    const { links } = parseLinks('See [[My Note]] and [[Other Note]].')
    expect(links).toEqual(['My Note', 'Other Note'])
  })

  it('returns empty arrays for plain text', () => {
    const { links, tags } = parseLinks('No links here.')
    expect(links).toEqual([])
    expect(tags).toEqual([])
  })

  it('extracts hashtags', () => {
    const { tags } = parseLinks('Tagged with #project and #todo.')
    expect(tags).toEqual(['project', 'todo'])
  })

  it('ignores code blocks', () => {
    const { links } = parseLinks('```\n[[not a link]]\n```')
    expect(links).toEqual([])
  })

  it('deduplicates links', () => {
    const { links } = parseLinks('[[A]] and [[A]] again.')
    expect(links).toEqual(['A'])
  })

  it('handles pipe aliases: [[Note|Alias]]', () => {
    const { links } = parseLinks('[[My Note|click here]]')
    expect(links).toEqual(['My Note'])
  })
})
