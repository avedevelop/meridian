import { describe, expect, it } from 'vitest'
import { FOLDER_PALETTE, primaryTags } from '../../src/renderer/src/components/Graph/graphGroups'
import { testSimulation } from '../fixtures/testSimulation'

describe('primaryTags', () => {
  const tags: Record<string, string[]> = {
    a: ['bot', 'idea'],
    b: ['bot'],
    c: ['bot', 'idea', 'rare'],
    d: ['idea'],
    e: ['rare'], // "rare" is on c and e: two notes, so it counts
    f: ['alone'], // used once: no group
    g: []
  }
  const paths = Object.keys(tags)
  const tagsOf = (p: string): string[] => tags[p] ?? []

  it('gives a note its most widespread tag', () => {
    const { tagByPath } = primaryTags(paths, tagsOf)
    // bot (3 notes) and idea (3 notes) tie and sort alphabetically: bot first
    expect(tagByPath.get('a')).toBe('bot')
    expect(tagByPath.get('c')).toBe('bot')
    expect(tagByPath.get('d')).toBe('idea')
    expect(tagByPath.get('e')).toBe('rare')
  })

  it('leaves out notes without tags and tags used once', () => {
    const { tagByPath, indexByTag } = primaryTags(paths, tagsOf)
    expect(tagByPath.has('f')).toBe(false)
    expect(tagByPath.has('g')).toBe(false)
    expect([...indexByTag.keys()].sort()).toEqual(['bot', 'idea', 'rare'])
  })

  it('keeps only the most widespread tags when there are more than the palette can show', () => {
    const many: Record<string, string[]> = {}
    for (let t = 0; t < 30; t++) {
      // tag t is on (30 - t) + 1 notes
      for (let n = 0; n <= 30 - t; n++) many[`n${t}_${n}`] = [`tag${String(t).padStart(2, '0')}`]
    }
    const { indexByTag } = primaryTags(Object.keys(many), (p) => many[p])
    expect(indexByTag.size).toBe(FOLDER_PALETTE.length)
    expect(indexByTag.has('tag00')).toBe(true)
    expect(indexByTag.has('tag29')).toBe(false)
  })

  it('hands out colours alphabetically, so a shift in the counts does not recolour a tag', () => {
    const { indexByTag } = primaryTags(paths, tagsOf)
    expect(indexByTag.get('bot')).toBe(0)
    expect(indexByTag.get('idea')).toBe(1)
    expect(indexByTag.get('rare')).toBe(2)
  })
})

describe('the graph grouped by tag', () => {
  // notes n0..n59: even ones carry "red", every third one "blue", the rest nothing
  const tagsOf = (p: string): string[] => {
    const i = Number(/n(\d+)\.md$/.exec(p)![1])
    const t: string[] = []
    if (i % 2 === 0) t.push('red')
    if (i % 3 === 0) t.push('blue')
    return t
  }

  it('draws one puddle per tag, colours by tag and goes back', () => {
    const { el, state } = testSimulation(60, [], 'type', tagsOf)
    const puddles = (): number => el.querySelectorAll('g.puddles path').length
    const fills = (): string[] =>
      [...el.querySelectorAll('circle.vis')].map((c) => c.getAttribute('fill') ?? '')
    const byType = fills()

    state.groups.setMode('tag')
    expect(puddles()).toBe(2)
    expect(fills()).not.toEqual(byType)
    expect(state.nodes.some((n) => n.tag === '')).toBe(true) // odd, not divisible by 3

    state.groups.setMode('type')
    expect(puddles()).toBe(0)
    expect(fills()).toEqual(byType)
  })

  it('draws nothing when no note has a shared tag', () => {
    const { el, state } = testSimulation(20, [], 'type', () => [])
    state.groups.setMode('tag')
    expect(el.querySelectorAll('g.puddles path').length).toBe(0)
  })
})
