import { describe, expect, it } from 'vitest'
import { highlightMatches } from '../../src/renderer/src/components/Graph/simulation/searchHighlight'
import { MATCH_FILL, MATCH_RING } from '../../src/renderer/src/components/Graph/graphColors'
import { testSimulation } from '../fixtures/testSimulation'

const fills = (el: HTMLElement): string[] =>
  [...el.querySelectorAll('circle.vis')].map((c) => c.getAttribute('fill') ?? '')

describe('search highlight', () => {
  it('lights up the notes whose name contains the query and nothing else', () => {
    const { el, state } = testSimulation(40, [])
    const all = new Set(state.nodes.map((n) => n.id))
    highlightMatches(state, 'n1', all) // n1, n10..n19
    expect([...state.matches].sort()).toEqual(
      state.nodes
        .filter((n) => n.name.includes('n1'))
        .map((n) => n.id)
        .sort()
    )
    const lit = fills(el).filter((f) => f === MATCH_FILL).length
    expect(lit).toBe(state.matches.size)
    expect(lit).toBeGreaterThan(5)
    const ring = [...el.querySelectorAll('circle.vis')].filter(
      (c) => c.getAttribute('stroke') === MATCH_RING
    )
    expect(ring.length).toBe(lit)
  })

  it('puts the colours back when the query is cleared', () => {
    const { el, state } = testSimulation(40, [])
    const before = fills(el)
    const all = new Set(state.nodes.map((n) => n.id))
    highlightMatches(state, 'n2', all)
    expect(fills(el)).not.toEqual(before)
    highlightMatches(state, '', all)
    expect(state.matches.size).toBe(0)
    expect(fills(el)).toEqual(before)
  })

  it('does not light up a note that is hidden by a filter or by history mode', () => {
    const { state } = testSimulation(40, [])
    const hidden = state.nodes.find((n) => n.name === 'n3')!
    const visible = new Set(state.nodes.filter((n) => n !== hidden).map((n) => n.id))
    highlightMatches(state, 'n3', visible)
    expect(state.matches.has(hidden.id)).toBe(false)
    expect(state.matches.size).toBeGreaterThan(0)
  })

  it('survives switching to folder grouping', () => {
    const { el, state } = testSimulation(40, ['A', 'B'])
    highlightMatches(state, 'n5', new Set(state.nodes.map((n) => n.id)))
    const lit = state.matches.size
    state.groups.setMode('folder')
    expect(fills(el).filter((f) => f === MATCH_FILL).length).toBe(lit)
  })
})
