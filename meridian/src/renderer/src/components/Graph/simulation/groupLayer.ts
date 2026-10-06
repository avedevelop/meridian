import * as d3 from 'd3'
import type { GNode, GLink } from '../graphTypes'
import { folderColor, groupIndexOf, groupKeyOf, type GroupMode } from '../graphGroups'
import {
  glowGradientId,
  nodeFill,
  restingFill,
  restingStroke,
  restingStrokeWidth
} from '../graphColors'

/** Space between a node's edge and the edge of its puddle. */
export const PUDDLE_PAD = 14
const POINTS_PER_NODE = 10
/** Pull of a node towards the centre of its folder, scaled by the simulation's heat. */
export const CLUSTER_STRENGTH = 0.4
/** Links between folders pull this much as links inside one, so the folders can pull apart into islands. */
export const CROSS_FOLDER_LINK_FACTOR = 0.25

export interface Puddle {
  key: string
  color: string
  path: string
}

/**
 * One smooth blob per folder around its visible notes. Pure, so it can be tested without a DOM.
 * Folders with a single visible note get no puddle: a handful of tiny rings would only add noise.
 */
export function computePuddles(
  nodes: GNode[],
  visible: Set<string> | null,
  radius: (d: GNode) => number,
  mode: GroupMode = 'folder'
): Puddle[] {
  const groups = new Map<string, GNode[]>()
  for (const n of nodes) {
    const key = groupKeyOf(n, mode)
    if (!key || n.x == null || n.y == null) continue
    if (visible && !visible.has(n.id)) continue
    const list = groups.get(key)
    if (list) list.push(n)
    else groups.set(key, [n])
  }

  const outline = d3.line().curve(d3.curveCatmullRomClosed.alpha(0.6))
  const puddles: Puddle[] = []
  for (const [key, members] of groups) {
    if (members.length < 2) continue
    const points: Array<[number, number]> = []
    for (const n of members) {
      const r = radius(n) + PUDDLE_PAD
      for (let k = 0; k < POINTS_PER_NODE; k++) {
        const a = (k / POINTS_PER_NODE) * Math.PI * 2
        points.push([n.x! + Math.cos(a) * r, n.y! + Math.sin(a) * r])
      }
    }
    const hull = d3.polygonHull(points)
    const path = hull ? outline(hull) : null
    if (path) puddles.push({ key, color: folderColor(groupIndexOf(members[0], mode)), path })
  }
  return puddles
}

type ClusterForce = d3.Force<GNode, GLink> & {
  strength(v: number): ClusterForce
  /** Which group a node is gathered with; '' for none. */
  key(fn: (d: GNode) => string): ClusterForce
}

/** Pulls every node a little towards the centroid of its folder, so the folders form islands. */
export function forceCluster(
  initial: number,
  initialKey: (d: GNode) => string = (d) => d.folder ?? ''
): ClusterForce {
  let nodes: GNode[] = []
  let strength = initial
  let keyOf = initialKey
  const force = ((alpha: number) => {
    if (!strength) return
    const sums = new Map<string, { x: number; y: number; n: number }>()
    for (const d of nodes) {
      const key = keyOf(d)
      if (!key) continue
      const s = sums.get(key) ?? { x: 0, y: 0, n: 0 }
      s.x += d.x ?? 0
      s.y += d.y ?? 0
      s.n++
      sums.set(key, s)
    }
    const k = strength * alpha
    for (const d of nodes) {
      const key = keyOf(d)
      const s = key ? sums.get(key) : undefined
      if (!s || s.n < 2) continue
      d.vx = (d.vx ?? 0) + (s.x / s.n - (d.x ?? 0)) * k
      d.vy = (d.vy ?? 0) + (s.y / s.n - (d.y ?? 0)) * k
    }
  }) as ClusterForce
  force.initialize = (n) => {
    nodes = n
  }
  force.strength = (v: number) => {
    strength = v
    return force
  }
  force.key = (fn) => {
    keyOf = fn
    return force
  }
  return force
}

export interface GroupLayer {
  getMode(): GroupMode
  /** Switch between colouring by kind and by folder. Does not reheat the simulation; the caller decides. */
  setMode(mode: GroupMode): void
  /** Nodes currently shown (filters, history). `null` means all of them. */
  setVisible(ids: Set<string> | null): void
  /** Call on every tick. */
  update(): void
  /** Multiplier for a link's strength: weaker between folders while grouping by folder. */
  linkDamp(l: GLink): number
}

interface Options {
  root: d3.Selection<SVGGElement, unknown, null, undefined>
  sim: d3.Simulation<GNode, GLink>
  nodes: GNode[]
  nodeG: d3.Selection<SVGGElement, GNode, SVGGElement, unknown>
  mode: GroupMode
  radius: (d: GNode) => number
  matches: Set<string>
}

export function createGroupLayer({
  root,
  sim,
  nodes,
  nodeG,
  mode,
  radius,
  matches
}: Options): GroupLayer {
  // First child, so puddles sit under the links and the nodes.
  const layer = root
    .insert('g', ':first-child')
    .attr('class', 'puddles')
    .style('pointer-events', 'none')
  const cluster = forceCluster(mode === 'type' ? 0 : CLUSTER_STRENGTH, (d) => groupKeyOf(d, mode))
  sim.force('cluster', cluster)

  let current = mode
  let visible: Set<string> | null = null
  let ticks = 0
  // Big graphs: rebuilding every outline each frame would cost more than it shows.
  const every = Math.max(1, Math.ceil(nodes.length / 600))

  const render = (): void => {
    const puddles = current === 'type' ? [] : computePuddles(nodes, visible, radius, current)
    layer
      .selectAll<SVGPathElement, Puddle>('path')
      .data(puddles, (p) => p.key)
      .join('path')
      .attr('d', (p) => p.path)
      .attr('fill', (p) => p.color)
      .attr('fill-opacity', 0.1)
      .attr('stroke', (p) => p.color)
      .attr('stroke-opacity', 0.28)
      .attr('stroke-width', 1)
  }

  return {
    getMode: () => current,
    setMode(next) {
      current = next
      cluster.strength(next === 'type' ? 0 : CLUSTER_STRENGTH).key((d) => groupKeyOf(d, next))
      nodeG
        .select<SVGCircleElement>('circle.vis')
        .attr('fill', (d) => restingFill(d, next, matches))
        .attr('stroke', (d) => restingStroke(d, next, matches))
        .attr('stroke-width', (d) => restingStrokeWidth(d, matches))
      nodeG
        .select<SVGCircleElement>('circle.glow-halo')
        .attr('fill', (d) => `url(#${glowGradientId(nodeFill(d, next))})`)
      // forceLink caches strengths; adding the force again makes it ask for them again.
      const link = sim.force('link')
      if (link) sim.force('link', link)
      render()
    },
    setVisible(ids) {
      visible = ids
      render()
    },
    linkDamp(l) {
      if (current === 'type') return 1
      const a = groupKeyOf(l.source as GNode, current)
      const b = groupKeyOf(l.target as GNode, current)
      return a === b ? 1 : CROSS_FOLDER_LINK_FACTOR
    },
    update() {
      if (current === 'type') return
      if (++ticks % every === 0) render()
    }
  }
}
