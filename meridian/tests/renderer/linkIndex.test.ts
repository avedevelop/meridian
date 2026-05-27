import { describe, it, expect } from 'vitest'
import { LinkIndex } from '../../src/renderer/src/lib/linkIndex'

describe('LinkIndex', () => {
  it('builds forward links from file map', () => {
    const idx = new LinkIndex()
    idx.update('/vault/A.md', 'See [[B]] and [[C]].', '/vault')
    idx.update('/vault/B.md', 'References [[A]].', '/vault')
    idx.update('/vault/C.md', 'Nothing here.', '/vault')

    expect(idx.getOutlinks('/vault/A.md')).toEqual(
      expect.arrayContaining(['/vault/B.md', '/vault/C.md'])
    )
    expect(idx.getOutlinks('/vault/A.md')).toHaveLength(2)
  })

  it('builds backlinks (inverse)', () => {
    const idx = new LinkIndex()
    idx.update('/vault/A.md', 'See [[B]].', '/vault')
    idx.update('/vault/B.md', '', '/vault')

    expect(idx.getBacklinks('/vault/B.md')).toEqual(['/vault/A.md'])
  })

  it('resolves link text to file path case-insensitively', () => {
    const idx = new LinkIndex()
    idx.update('/vault/My Note.md', '', '/vault')
    idx.update('/vault/A.md', '[[my note]]', '/vault')

    expect(idx.getBacklinks('/vault/My Note.md')).toEqual(['/vault/A.md'])
  })

  it('removes stale links when file is updated', () => {
    const idx = new LinkIndex()
    idx.update('/vault/A.md', '[[B]]', '/vault')
    idx.update('/vault/B.md', '', '/vault')
    idx.update('/vault/A.md', '[[C]]', '/vault') // A no longer links to B
    idx.update('/vault/C.md', '', '/vault')

    expect(idx.getBacklinks('/vault/B.md')).toEqual([])
    expect(idx.getBacklinks('/vault/C.md')).toEqual(['/vault/A.md'])
  })

  it('returns tags for a file', () => {
    const idx = new LinkIndex()
    idx.update('/vault/A.md', '#project #todo', '/vault')
    expect(idx.getTags('/vault/A.md')).toEqual(expect.arrayContaining(['project', 'todo']))
  })

  it('indexes tags from YAML frontmatter array syntax', () => {
    const idx = new LinkIndex()
    idx.update('/vault/A.md', '---\ntags: [work, ideas]\n---\n\nContent', '/vault')
    expect(idx.getTags('/vault/A.md')).toEqual(expect.arrayContaining(['work', 'ideas']))
  })

  it('indexes tags from multiline YAML frontmatter list syntax', () => {
    const idx = new LinkIndex()
    idx.update('/vault/A.md', '---\ntags:\n  - work\n  - ideas\n---\n\nContent', '/vault')
    expect(idx.getTags('/vault/A.md')).toEqual(expect.arrayContaining(['work', 'ideas']))
  })

  it('indexes a string tag from YAML frontmatter', () => {
    const idx = new LinkIndex()
    idx.update('/vault/A.md', '---\ntags: work\n---\n\nContent', '/vault')
    expect(idx.getTags('/vault/A.md')).toEqual(['work'])
  })

  it('still indexes inline tags and links when frontmatter YAML is malformed', () => {
    const idx = new LinkIndex()
    idx.update('/vault/A.md', '---\ntags: [work\n---\n\nSee [[B]] #inline', '/vault')
    idx.update('/vault/B.md', '', '/vault')

    expect(idx.getTags('/vault/A.md')).toEqual(['inline'])
    expect(idx.getOutlinks('/vault/A.md')).toEqual(['/vault/B.md'])
  })

  it('indexes frontmatter tags even when other YAML fields are not property-editable', () => {
    const idx = new LinkIndex()
    idx.update(
      '/vault/A.md',
      '---\ntags: [work, ideas]\nmeta:\n  author: Ada\n---\n\nContent',
      '/vault'
    )
    expect(idx.getTags('/vault/A.md')).toEqual(expect.arrayContaining(['work', 'ideas']))
  })

  it('returns all tags across vault', () => {
    const idx = new LinkIndex()
    idx.update('/vault/A.md', '#project', '/vault')
    idx.update('/vault/B.md', '#todo #project', '/vault')
    const all = idx.getAllTags()
    expect(all.get('project')).toEqual(expect.arrayContaining(['/vault/A.md', '/vault/B.md']))
    expect(all.get('todo')).toEqual(['/vault/B.md'])
  })
})
