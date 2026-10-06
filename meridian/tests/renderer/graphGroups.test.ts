import { describe, expect, it } from 'vitest'
import {
  FOLDER_PALETTE,
  NO_FOLDER_COLOR,
  folderColor,
  folderColorIndex,
  folderGroup
} from '../../src/renderer/src/components/Graph/graphGroups'
import {
  computePuddles,
  forceCluster
} from '../../src/renderer/src/components/Graph/simulation/groupLayer'
import { createD3Simulation } from '../../src/renderer/src/components/Graph/simulation/createD3Simulation'
import type { GLink, GNode } from '../../src/renderer/src/components/Graph/graphTypes'
import { linkedVault } from '../fixtures/linkedVault'
import * as d3 from 'd3'

const node = (id: string, folder: string, x: number, y: number): GNode => ({
  id,
  name: id,
  degree: 1,
  folder,
  x,
  y
})
const radius = (): number => 10

describe('folderGroup', () => {
  it('takes the top-level folder, with / or \\', () => {
    expect(folderGroup('Projects/Alpha/notes.md')).toBe('Projects')
    expect(folderGroup('Projects\\Alpha\\notes.md')).toBe('Projects')
    expect(folderGroup('single.md')).toBe('')
    expect(folderGroup('')).toBe('')
  })
})

describe('folder colours', () => {
  const folders = ['Inbox', 'Projects', 'Daily', 'Ideas', 'Reading', 'Archive']

  it('give every folder of a vault its own colour', () => {
    const index = folderColorIndex(folders)
    const colours = folders.map((f) => folderColor(index.get(f)))
    expect(new Set(colours).size).toBe(folders.length)
    for (const c of colours) expect(FOLDER_PALETTE).toContain(c)
  })

  it('do not depend on the order the folders are found in, nor on repeats', () => {
    const a = folderColorIndex(folders)
    const b = folderColorIndex([...folders].reverse().concat(folders))
    expect([...a]).toEqual([...b].sort((x, y) => x[1] - y[1]))
  })

  it('are neutral for notes in the vault root', () => {
    expect(folderColorIndex(['', 'A']).has('')).toBe(false)
    expect(folderColor(undefined)).toBe(NO_FOLDER_COLOR)
  })

  it('wrap around when there are more folders than colours', () => {
    expect(folderColor(FOLDER_PALETTE.length)).toBe(folderColor(0))
  })
})

describe('computePuddles', () => {
  const nodes = [
    node('a1', 'A', 0, 0),
    node('a2', 'A', 60, 10),
    node('a3', 'A', 30, 50),
    node('b1', 'B', 400, 400),
    node('b2', 'B', 450, 420),
    node('solo', 'C', 800, 0),
    node('root', '', 100, 100)
  ]

  it('draws one puddle per folder with at least two notes, none for the root or a single note', () => {
    const puddles = computePuddles(nodes, null, radius)
    expect(puddles.map((p) => p.key).sort()).toEqual(['A', 'B'])
    for (const p of puddles) expect(p.path.startsWith('M')).toBe(true)
  })

  it('leaves out notes that are hidden by a filter or by history mode', () => {
    const visible = new Set(['a1', 'a2', 'a3', 'b1']) // b2 hidden: B is left with one note
    expect(computePuddles(nodes, visible, radius).map((p) => p.key)).toEqual(['A'])
    expect(computePuddles(nodes, new Set(), radius)).toEqual([])
  })

  it('ignores notes that have no position yet', () => {
    const unplaced: GNode = { id: 'x', name: 'x', degree: 0, folder: 'A' }
    expect(computePuddles([unplaced, node('a', 'A', 0, 0)], null, radius)).toEqual([])
  })
})

describe('forceCluster', () => {
  function spread(nodes: GNode[], folder: string): number {
    const g = nodes.filter((n) => n.folder === folder)
    const cx = d3.mean(g, (n) => n.x!)!
    const cy = d3.mean(g, (n) => n.y!)!
    return d3.mean(g, (n) => Math.hypot(n.x! - cx, n.y! - cy))!
  }

  it('gathers a folder together and does nothing at strength 0', () => {
    const make = (): GNode[] =>
      Array.from({ length: 20 }, (_, i) =>
        node(`n${i}`, i % 2 ? 'A' : 'B', (i * 37) % 300, (i * 91) % 300)
      )
    const run = (strength: number): GNode[] => {
      const nodes = make()
      const sim = d3.forceSimulation(nodes).force('cluster', forceCluster(strength)).stop()
      for (let i = 0; i < 100; i++) sim.tick()
      return nodes
    }
    const before = spread(make(), 'A')
    expect(spread(run(0.14), 'A')).toBeLessThan(before * 0.5)
    expect(spread(run(0), 'A')).toBeCloseTo(before, 5)
  })
})

describe('the graph switches between type and folder', () => {
  it('draws puddles and recolours by folder, then goes back', () => {
    const { files, outlinks } = linkedVault(60, ['Inbox', 'Projects', 'Ideas'])
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
      shape: { linkStrength: 0.25, gravity: 0.06, collidePad: 12 },
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
    const { groups } = res.state
    const puddles = (): number => el.querySelectorAll('g.puddles path').length
    const fills = (): Set<string | null> =>
      new Set([...el.querySelectorAll('circle.vis')].map((c) => c.getAttribute('fill')))

    expect(puddles()).toBe(0)
    const byType = fills()

    groups.setMode('folder')
    expect(puddles()).toBe(3)
    const byFolder = fills()
    expect([...byFolder].every((c) => FOLDER_PALETTE.includes(c as string))).toBe(true)
    expect(byFolder).not.toEqual(byType)

    groups.setVisible(new Set()) // history mode before anything exists
    expect(puddles()).toBe(0)
    groups.setVisible(null)
    expect(puddles()).toBe(3)

    // links between folders are weaker while grouping by folder, so the islands can pull apart
    const strength = (res.state.sim.force('link') as d3.ForceLink<GNode, GLink>).strength()
    const cross = res.state.links.find(
      (l) => (l.source as GNode).folder !== (l.target as GNode).folder
    ) as GLink
    const inside = res.state.links.find(
      (l) => (l.source as GNode).folder === (l.target as GNode).folder
    )
    expect(cross).toBeDefined()
    if (inside) expect(strength(cross, 0, [])).toBeLessThan(strength(inside, 0, []))

    groups.setMode('type')
    expect(strength(cross, 0, [])).toBe(0.25)
    expect(puddles()).toBe(0)
    expect(fills()).toEqual(byType)
  })
})
