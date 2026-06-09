import { describe, expect, it } from 'vitest'

import {
  parseFrontmatterTags,
  parseMarkdownFrontmatter,
  removeFrontmatterProperty,
  replaceFrontmatter,
  serializeFrontmatter,
  setFrontmatterProperty
} from '../../src/shared/frontmatter'

describe('parseMarkdownFrontmatter', () => {
  it('returns empty properties and the original body when no frontmatter exists', () => {
    const content = '# Heading\n\n---\nnot: frontmatter'

    const result = parseMarkdownFrontmatter(content)

    expect(result.ok).toBe(true)
    expect(result.hasFrontmatter).toBe(false)
    expect(result.properties).toEqual({})
    expect(result.body).toBe(content)
    expect(result.raw).toBe('')
  })

  it('parses an empty frontmatter block', () => {
    const result = parseMarkdownFrontmatter('---\n---\nBody')

    expect(result.ok).toBe(true)
    expect(result.hasFrontmatter).toBe(true)
    expect(result.properties).toEqual({})
    expect(result.body).toBe('\nBody')
    expect(result.raw).toBe('')
  })

  it('parses YAML strings, string arrays, numbers, booleans, and null values', () => {
    const result = parseMarkdownFrontmatter(
      [
        '---',
        'title: My Note',
        'tags:',
        '  - work',
        '  - ideas',
        'priority: 3',
        'published: true',
        'archived: false',
        'assignee: null',
        '---',
        '',
        'Content'
      ].join('\n')
    )

    expect(result.ok).toBe(true)
    expect(result.properties).toEqual({
      title: 'My Note',
      tags: ['work', 'ideas'],
      priority: 3,
      published: true,
      archived: false,
      assignee: null
    })
  })

  it('keeps date-like scalars safe as strings', () => {
    const result = parseMarkdownFrontmatter('---\ndate: 2026-05-20\n---\n\nContent')

    expect(result.ok).toBe(true)
    expect(result.properties.date).toBe('2026-05-20')
  })

  it('returns an error result for malformed YAML while preserving raw and body text', () => {
    const content = '---\ntitle: [broken\n---\n\nBody'

    const result = parseMarkdownFrontmatter(content)

    expect(result.ok).toBe(false)
    expect(result.hasFrontmatter).toBe(true)
    expect(result.properties).toEqual({})
    expect(result.raw).toBe('title: [broken')
    expect(result.body).toBe('\n\nBody')
    if (!result.ok) {
      expect(result.error).toContain('Flow sequence')
    }
  })

  it('returns an error result for frontmatter without a closing delimiter', () => {
    const content = '---\ntitle: Draft\n\nBody'

    const result = parseMarkdownFrontmatter(content)

    expect(result.ok).toBe(false)
    expect(result.hasFrontmatter).toBe(true)
    expect(result.properties).toEqual({})
    expect(result.raw).toBe('title: Draft\n\nBody')
    expect(result.body).toBe('')
    if (!result.ok) {
      expect(result.error).toContain('closing frontmatter delimiter')
    }
  })

  it('returns an error result for unsupported nested object values', () => {
    const result = parseMarkdownFrontmatter('---\ntitle: Note\nmeta:\n  author: Ada\n---\n\nBody')

    expect(result.ok).toBe(false)
    expect(result.hasFrontmatter).toBe(true)
    expect(result.properties).toEqual({})
    if (!result.ok) {
      expect(result.error).toContain('unsupported')
    }
  })

  it('returns an error result for unsupported nested list values', () => {
    const result = parseMarkdownFrontmatter('---\ntitle: Note\nitems:\n  - name: One\n---\n\nBody')

    expect(result.ok).toBe(false)
    expect(result.hasFrontmatter).toBe(true)
    expect(result.properties).toEqual({})
    if (!result.ok) {
      expect(result.error).toContain('unsupported')
    }
  })

  it('returns an error result for unsupported non-string array values', () => {
    const result = parseMarkdownFrontmatter('---\ntitle: Note\nscores: [1, 2]\n---\n\nBody')

    expect(result.ok).toBe(false)
    expect(result.hasFrontmatter).toBe(true)
    expect(result.properties).toEqual({})
    if (!result.ok) {
      expect(result.error).toContain('unsupported')
    }
  })

  it('returns an error result for unsupported root arrays', () => {
    const result = parseMarkdownFrontmatter('---\n- title: Note\n---\n\nBody')

    expect(result.ok).toBe(false)
    expect(result.hasFrontmatter).toBe(true)
    expect(result.properties).toEqual({})
    if (!result.ok) {
      expect(result.error).toContain('unsupported')
    }
  })

  it('returns an error result for comment-containing frontmatter', () => {
    const result = parseMarkdownFrontmatter('---\ntitle: Note # keep this note\n---\n\nBody')

    expect(result.ok).toBe(false)
    expect(result.hasFrontmatter).toBe(true)
    expect(result.properties).toEqual({})
    if (!result.ok) {
      expect(result.error).toContain('comments')
    }
  })

  it('returns an error result for anchor and alias frontmatter', () => {
    const result = parseMarkdownFrontmatter('---\ntitle: &main Note\ncopy: *main\n---\n\nBody')

    expect(result.ok).toBe(false)
    expect(result.hasFrontmatter).toBe(true)
    expect(result.properties).toEqual({})
    if (!result.ok) {
      expect(result.error).toContain('advanced YAML')
    }
  })

  it('returns an error result for explicit tagged frontmatter', () => {
    const result = parseMarkdownFrontmatter('---\ntitle: !!str 123\n---\n\nBody')

    expect(result.ok).toBe(false)
    expect(result.hasFrontmatter).toBe(true)
    expect(result.properties).toEqual({})
    if (!result.ok) {
      expect(result.error).toContain('advanced YAML')
    }
  })

  it('preserves markdown body content exactly after frontmatter', () => {
    const body = '\n\n# Heading\n\nBody with --- inside\n\n```yaml\n---\n```'
    const result = parseMarkdownFrontmatter(`---\ntitle: Note\n---${body}`)

    expect(result.ok).toBe(true)
    expect(result.body).toBe(body)
  })
})

describe('serializeFrontmatter', () => {
  it('serializes properties into a YAML frontmatter block', () => {
    const result = serializeFrontmatter({
      title: 'My Note',
      tags: ['work', 'ideas'],
      priority: 3,
      published: true,
      assignee: null
    })

    expect(result).toBe(
      [
        '---',
        'title: My Note',
        'tags:',
        '  - work',
        '  - ideas',
        'priority: 3',
        'published: true',
        'assignee: null',
        '---'
      ].join('\n')
    )
  })
})

describe('frontmatter updates', () => {
  it('sets a property on content with existing frontmatter', () => {
    const content = '---\ntitle: Old\n---\n\nBody'

    const updated = setFrontmatterProperty(content, 'title', 'New')

    expect(parseMarkdownFrontmatter(updated).properties.title).toBe('New')
    expect(parseMarkdownFrontmatter(updated).body).toBe('\n\nBody')
    expect(updated).not.toContain('title: Old')
  })

  it('sets a property on content without existing frontmatter', () => {
    const updated = setFrontmatterProperty('Just body text', 'title', 'My Title')

    expect(updated).toBe('---\ntitle: My Title\n---\n\nJust body text')
  })

  it('removes a property while keeping remaining properties', () => {
    const content = '---\ntitle: Note\ntags:\n  - work\n---\n\nBody'

    const updated = removeFrontmatterProperty(content, 'title')
    const result = parseMarkdownFrontmatter(updated)

    expect(result.properties).toEqual({ tags: ['work'] })
    expect(result.body).toBe('\n\nBody')
  })

  it('adds replacement frontmatter before body content with a blank line separator', () => {
    expect(replaceFrontmatter('# Title', { title: 'X' })).toBe('---\ntitle: X\n---\n\n# Title')
  })

  it('replaces frontmatter without changing body text', () => {
    const body = '\n\nBody\n\n- item\n'
    const updated = replaceFrontmatter(`---\ntitle: Old\n---${body}`, {
      title: 'New',
      count: 2
    })

    expect(updated).toBe('---\ntitle: New\ncount: 2\n---' + body)
  })

  it('leaves malformed frontmatter unchanged when setting a property', () => {
    const content = '---\ntitle: [broken\n---\n\nBody'

    expect(setFrontmatterProperty(content, 'title', 'New')).toBe(content)
  })

  it('leaves malformed frontmatter unchanged when removing a property', () => {
    const content = '---\ntitle: [broken\n---\n\nBody'

    expect(removeFrontmatterProperty(content, 'title')).toBe(content)
  })

  it('leaves malformed frontmatter unchanged when replacing properties', () => {
    const content = '---\ntitle: [broken\n---\n\nBody'

    expect(replaceFrontmatter(content, { title: 'New' })).toBe(content)
  })

  it('leaves frontmatter without a closing delimiter unchanged when setting a property', () => {
    const content = '---\ntitle: Draft\n\nBody'

    expect(setFrontmatterProperty(content, 'title', 'New')).toBe(content)
  })

  it('leaves frontmatter without a closing delimiter unchanged when removing a property', () => {
    const content = '---\ntitle: Draft\n\nBody'

    expect(removeFrontmatterProperty(content, 'title')).toBe(content)
  })

  it('leaves frontmatter without a closing delimiter unchanged when replacing properties', () => {
    const content = '---\ntitle: Draft\n\nBody'

    expect(replaceFrontmatter(content, { title: 'New' })).toBe(content)
  })

  it('leaves unsupported nested object frontmatter unchanged for all write helpers', () => {
    const content = '---\ntitle: Note\nmeta:\n  author: Ada\n---\n\nBody'

    expect(setFrontmatterProperty(content, 'title', 'New')).toBe(content)
    expect(removeFrontmatterProperty(content, 'title')).toBe(content)
    expect(replaceFrontmatter(content, { title: 'New' })).toBe(content)
  })

  it('leaves unsupported non-string array frontmatter unchanged for all write helpers', () => {
    const content = '---\ntitle: Note\nscores: [1, 2]\n---\n\nBody'

    expect(setFrontmatterProperty(content, 'title', 'New')).toBe(content)
    expect(removeFrontmatterProperty(content, 'scores')).toBe(content)
    expect(replaceFrontmatter(content, { title: 'New' })).toBe(content)
  })

  it('leaves unsupported nested list frontmatter unchanged for all write helpers', () => {
    const content = '---\ntitle: Note\nitems:\n  - name: One\n---\n\nBody'

    expect(setFrontmatterProperty(content, 'title', 'New')).toBe(content)
    expect(removeFrontmatterProperty(content, 'title')).toBe(content)
    expect(replaceFrontmatter(content, { title: 'New' })).toBe(content)
  })

  it('leaves unsupported root-array frontmatter unchanged for all write helpers', () => {
    const content = '---\n- title: Note\n---\n\nBody'

    expect(setFrontmatterProperty(content, 'title', 'New')).toBe(content)
    expect(removeFrontmatterProperty(content, 'title')).toBe(content)
    expect(replaceFrontmatter(content, { title: 'New' })).toBe(content)
  })

  it('leaves comment-containing frontmatter unchanged for all write helpers', () => {
    const content = '---\ntitle: Note # keep this note\n---\n\nBody'

    expect(setFrontmatterProperty(content, 'title', 'New')).toBe(content)
    expect(removeFrontmatterProperty(content, 'title')).toBe(content)
    expect(replaceFrontmatter(content, { title: 'New' })).toBe(content)
  })

  it('leaves anchor and alias frontmatter unchanged for all write helpers', () => {
    const content = '---\ntitle: &main Note\ncopy: *main\n---\n\nBody'

    expect(setFrontmatterProperty(content, 'title', 'New')).toBe(content)
    expect(removeFrontmatterProperty(content, 'copy')).toBe(content)
    expect(replaceFrontmatter(content, { title: 'New' })).toBe(content)
  })

  it('leaves explicit tagged frontmatter unchanged for all write helpers', () => {
    const content = '---\ntitle: !!str 123\n---\n\nBody'

    expect(setFrontmatterProperty(content, 'title', 'New')).toBe(content)
    expect(removeFrontmatterProperty(content, 'title')).toBe(content)
    expect(replaceFrontmatter(content, { title: 'New' })).toBe(content)
  })
})

describe('parseFrontmatterTags', () => {
  it('reads tags from otherwise edit-unsupported nested frontmatter', () => {
    const content = '---\ntags: [work, ideas]\nmeta:\n  author: Ada\n---\n\nBody'

    expect(parseFrontmatterTags(content)).toEqual(['work', 'ideas'])
  })

  it('reads tags from comment-containing frontmatter without making it editable', () => {
    const content = '---\ntags:\n  - work\n# keep me\n---\n\nBody'

    expect(parseFrontmatterTags(content)).toEqual(['work'])
    expect(parseMarkdownFrontmatter(content).ok).toBe(false)
  })

  it('returns no tags for malformed or unterminated frontmatter', () => {
    expect(parseFrontmatterTags('---\ntags: [work\n---\n\nBody')).toEqual([])
    expect(parseFrontmatterTags('---\ntags: [work]\nBody')).toEqual([])
  })
})
