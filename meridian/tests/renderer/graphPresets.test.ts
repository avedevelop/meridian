import { describe, expect, it } from 'vitest'
import type { GLink, GNode } from '../../src/renderer/src/components/Graph/graphTypes'
import { createD3Simulation } from '../../src/renderer/src/components/Graph/simulation/createD3Simulation'
import { applyForces } from '../../src/renderer/src/components/Graph/simulation/applyForces'
import { resizeGraph } from '../../src/renderer/src/components/Graph/simulation/resizeGraph'
import {
  DEFAULT_SHAPE,
  FORCE_PRESETS,
  type ForcePreset
} from '../../src/renderer/src/components/Graph/graphForces'
import { linkedVault } from '../fixtures/linkedVault'

// slider ranges in GraphSidebarFilters.tsx
const DISTANCE = [30, 200]
const REPULSION = [-300, -20]

function meanLinkLength(preset: ForcePreset): number {
  const { files, outlinks } = linkedVault(150)
  const el = document.createElement('div')
  Object.defineProperty(el, 'clientWidth', { value: 1200 })
  Object.defineProperty(el, 'clientHeight', { value: 800 })
  const res = createD3Simulation({
    el,
    files,
    outlinks,
    disabledCategories: new Set(),
    strictFilter: false,
    debouncedSearchQuery: '',
    linkDistance: 100,
    repulsionStrength: -160,
    shape: DEFAULT_SHAPE,
    textSize: 11,
    showArrows: false,
    openFile: () => undefined,
    handleMouseOver: () => undefined,
    handleMouseOut: () => undefined,
    maxNodes: 0,
    labelMode: 'auto',
    showGlow: false,
    groupMode: 'type'
  })
  if (!res) throw new Error('no simulation')
  const { sim, links } = res.state
  expect(links.length).toBeGreaterThan(100)
  applyForces(sim, {
    linkDistance: preset.linkDistance,
    repulsionStrength: preset.repulsion,
    shape: preset.shape,
    textSize: preset.textSize ?? 11
  })
  sim.alpha(0.5)
  for (let i = 0; i < 300; i++) sim.tick()
  const lengths = (links as GLink[]).map((l) => {
    const s = l.source as GNode
    const t = l.target as GNode
    return Math.hypot(s.x! - t.x!, s.y! - t.y!)
  })
  sim.stop()
  return lengths.reduce((a, b) => a + b, 0) / lengths.length
}

describe('graph physics presets', () => {
  it('stay inside the slider ranges', () => {
    for (const p of FORCE_PRESETS) {
      expect(p.linkDistance).toBeGreaterThanOrEqual(DISTANCE[0])
      expect(p.linkDistance).toBeLessThanOrEqual(DISTANCE[1])
      expect(p.repulsion).toBeGreaterThanOrEqual(REPULSION[0])
      expect(p.repulsion).toBeLessThanOrEqual(REPULSION[1])
    }
  })

  it('make a visibly different graph: dense < default < readable < galaxy', () => {
    const by = Object.fromEntries(FORCE_PRESETS.map((p) => [p.key, meanLinkLength(p)]))
    // each step is at least 10% longer; with only distance and repulsion changing they were within 10% of each other
    expect(by.dense * 1.1).toBeLessThan(by.default)
    expect(by.default * 1.1).toBeLessThan(by.readable)
    expect(by.readable * 1.05).toBeLessThan(by.galaxy)
  })
})

describe('graph resize', () => {
  it('keeps the same graph and layout when the container changes size', () => {
    const { files, outlinks } = linkedVault(60)
    const el = document.createElement('div')
    const size = { w: 1200, h: 800 }
    Object.defineProperty(el, 'clientWidth', { get: () => size.w })
    Object.defineProperty(el, 'clientHeight', { get: () => size.h })
    const res = createD3Simulation({
      el,
      files,
      outlinks,
      disabledCategories: new Set(),
      strictFilter: false,
      debouncedSearchQuery: '',
      linkDistance: 100,
      repulsionStrength: -160,
      shape: DEFAULT_SHAPE,
      textSize: 11,
      showArrows: false,
      openFile: () => undefined,
      handleMouseOver: () => undefined,
      handleMouseOut: () => undefined,
      maxNodes: 0,
      labelMode: 'auto',
      showGlow: false
    })
    if (!res) throw new Error('no simulation')
    const { state } = res
    const svg = el.querySelector('svg')
    const before = state.nodes.map((n) => [n.x, n.y])

    expect(resizeGraph(state, 900, 800)).toBe(true)

    expect(el.querySelector('svg')).toBe(svg) // not rebuilt
    expect(svg?.getAttribute('width')).toBe('900')
    expect(state.nodes.map((n) => [n.x, n.y])).toEqual(before) // nodes stay where they were
    const centreX = (state.sim.force('x') as { x(): (n: GNode) => number }).x()
    expect(centreX(state.nodes[0])).toBe(450)
    expect(resizeGraph(state, 900, 800)).toBe(false) // same size: nothing to do
    expect(resizeGraph(state, 0, 0)).toBe(false) // hidden container
  })
})
