import { describe, expect, it } from 'vitest'
import { nodeR } from '../../src/renderer/src/components/Graph/graphLayout'
import type { GNode } from '../../src/renderer/src/components/Graph/graphTypes'

const r = (degree: number): number => nodeR({ id: 'x', name: 'x', degree } as GNode)

describe('nodeR', () => {
  it('grows with the number of links and keeps growing for hubs', () => {
    const radii = [0, 1, 2, 4, 9, 16, 25, 49].map(r)
    for (let i = 1; i < radii.length; i++) expect(radii[i]).toBeGreaterThan(radii[i - 1])
  })

  it('tells a hub from a note with a few links (the old size stopped at six links)', () => {
    expect(r(25)).toBeGreaterThan(r(6) * 1.25)
    expect(r(6)).toBeGreaterThan(r(1))
  })

  it('is capped so a very large hub does not swallow the graph', () => {
    expect(r(10000)).toBe(r(1000))
    expect(r(1000)).toBeLessThanOrEqual(26)
  })

  it('keeps unlinked notes smallest but visible', () => {
    expect(r(0)).toBeGreaterThanOrEqual(4)
    expect(r(0)).toBeLessThan(r(1))
  })
})
