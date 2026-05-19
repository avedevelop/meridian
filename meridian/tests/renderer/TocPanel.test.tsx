import { describe, it, expect } from 'vitest'
import { parseHeadings } from '../../src/renderer/src/components/RightPanel/TocPanel'

describe('parseHeadings', () => {
  it('extracts h1 through h3 headings', () => {
    const content = '# Title\n\nSome text.\n\n## Section\n\n### Subsection\n'
    const result = parseHeadings(content)
    expect(result).toEqual([
      { level: 1, text: 'Title', index: 0 },
      { level: 2, text: 'Section', index: 1 },
      { level: 3, text: 'Subsection', index: 2 }
    ])
  })

  it('returns empty array for content with no headings', () => {
    expect(parseHeadings('Just plain text.\n\nNo headings here.')).toEqual([])
  })

  it('skips headings inside fenced code blocks', () => {
    const content = '# Real heading\n\n```\n# Not a heading\n```\n'
    const result = parseHeadings(content)
    expect(result).toEqual([{ level: 1, text: 'Real heading', index: 0 }])
  })

  it('handles headings with inline formatting stripped', () => {
    const result = parseHeadings('## **Bold** and `code` heading')
    expect(result[0].text).toBe('**Bold** and `code` heading')
  })

  it('assigns sequential index starting from 0', () => {
    const result = parseHeadings('# A\n## B\n### C')
    expect(result.map((h) => h.index)).toEqual([0, 1, 2])
  })
})
