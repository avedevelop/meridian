import { describe, it, expect } from 'vitest'

import {
  parseMarkdownFrontmatter,
  serializeFrontmatter,
  setFrontmatterProperty
} from '../../src/shared/frontmatter'

describe('frontmatter parsing', () => {
  it('parses simple key: value pairs', () => {
    const content = '---\ntitle: My Note\ndate: 2026-05-20\n---\n\nContent'
    const result = parseMarkdownFrontmatter(content)
    expect(result.properties).toEqual({ title: 'My Note', date: '2026-05-20' })
  })

  it('parses array values', () => {
    const content = '---\ntags: [work, ideas, todo]\n---'
    const result = parseMarkdownFrontmatter(content)
    expect(result.properties.tags).toEqual(['work', 'ideas', 'todo'])
  })

  it('returns empty properties when no frontmatter exists', () => {
    const result = parseMarkdownFrontmatter('# Just a heading')
    expect(result.hasFrontmatter).toBe(false)
    expect(result.properties).toEqual({})
  })

  it('updates existing key in frontmatter', () => {
    const content = '---\ntitle: Old\n---\n\nBody'
    const updated = setFrontmatterProperty(content, 'title', 'New')
    expect(updated).toContain('title: New')
    expect(updated).toContain('Body')
    expect(updated).not.toContain('title: Old')
  })

  it('adds frontmatter to content without it', () => {
    const content = 'Just body text'
    const updated = setFrontmatterProperty(content, 'title', 'My Title')
    expect(updated).toMatch(/^---\ntitle: My Title\n---/)
    expect(updated).toContain('Just body text')
  })

  it('returns empty properties for an empty frontmatter block', () => {
    const result = parseMarkdownFrontmatter('---\n---\nContent')
    expect(result.hasFrontmatter).toBe(true)
    expect(result.properties).toEqual({})
  })

  it('serializes frontmatter through shared utilities', () => {
    expect(serializeFrontmatter({ tags: ['work', 'ideas'] })).toBe(
      '---\ntags:\n  - work\n  - ideas\n---'
    )
  })
})
