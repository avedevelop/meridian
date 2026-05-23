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

  it('extracts inline #tags', () => {
    const { tags } = parseLinks('Hello #world and #foo')
    expect(tags).toContain('world')
    expect(tags).toContain('foo')
  })

  it('extracts tags from frontmatter array format: tags: [a, b, c]', () => {
    const content = '---\ntags: [work, ideas, todo]\n---\n\nContent'
    const { tags } = parseLinks(content)
    expect(tags).toContain('work')
    expect(tags).toContain('ideas')
    expect(tags).toContain('todo')
  })

  it('extracts tags from frontmatter list format (YAML list)', () => {
    const content = '---\ntags:\n  - work\n  - ideas\n---\n\nContent'
    const { tags } = parseLinks(content)
    expect(tags).toContain('work')
    expect(tags).toContain('ideas')
  })

  it('deduplicates tags from frontmatter and inline', () => {
    const content = '---\ntags: [work]\n---\n\nHello #work and #extra'
    const { tags } = parseLinks(content)
    const workCount = tags.filter((t) => t === 'work').length
    expect(workCount).toBe(1)
    expect(tags).toContain('extra')
  })

  it('handles frontmatter with quoted tag values', () => {
    const content = '---\ntags: ["my-tag", \'another\']\n---'
    const { tags } = parseLinks(content)
    expect(tags).toContain('my-tag')
    expect(tags).toContain('another')
  })

  it('does not extract non-tag frontmatter fields as tags', () => {
    const content = '---\ntitle: Not a tag\ndate: 2026-01-01\n---\n\nContent'
    const { tags } = parseLinks(content)
    expect(tags).not.toContain('Not a tag')
    expect(tags).not.toContain('2026-01-01')
  })

  it('extracts [[wiki links]] from content', () => {
    const { links } = parseLinks('See [[My Note]] for details')
    expect(links).toContain('My Note')
  })
})
