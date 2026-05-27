import { describe, expect, it } from 'vitest'
import {
  extractRelationReferences,
  isRelationKey,
  normalizeRelationTarget
} from '../../src/shared/relationships'

describe('relationship helpers', () => {
  it('detects relation property keys', () => {
    expect(isRelationKey('related')).toBe(true)
    expect(isRelationKey('relations')).toBe(true)
    expect(isRelationKey('project links')).toBe(true)
    expect(isRelationKey('tags')).toBe(false)
  })

  it('normalizes relation targets', () => {
    expect(normalizeRelationTarget('[[Project Alpha]]')).toBe('Project Alpha')
    expect(normalizeRelationTarget('[[Project Alpha|Alpha]]')).toBe('Project Alpha')
    expect(normalizeRelationTarget('Projects/Project Alpha.md')).toBe('Project Alpha')
  })

  it('extracts relation arrays from frontmatter', () => {
    const refs = extractRelationReferences(
      '---\nrelated:\n  - "[[Project Alpha]]"\n  - People/Ada.md\n---\n\nBody'
    )

    expect(refs).toEqual([
      { key: 'related', target: 'Project Alpha', raw: '[[Project Alpha]]' },
      { key: 'related', target: 'Ada', raw: 'People/Ada.md' }
    ])
  })

  it('extracts comma-separated relation strings', () => {
    const refs = extractRelationReferences('---\nlinks: Alpha, [[Beta]]\n---\n\nBody')

    expect(refs.map((ref) => ref.target)).toEqual(['Alpha', 'Beta'])
  })

  it('ignores malformed YAML and non-relation properties', () => {
    expect(extractRelationReferences('---\nrelated: [Alpha\n---\n\nBody')).toEqual([])
    expect(extractRelationReferences('---\ntags: [Alpha]\n---\n\nBody')).toEqual([])
  })
})
