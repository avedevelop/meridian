import * as d3 from 'd3'
import type { GNode, GLink } from '../graphTypes'
import { folderColor, type GroupMode } from '../graphGroups'
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
  radius: (d: GNode) => number
): Puddle[] {
  const groups = new Map<string, GNode[]>()
  for (const n of nodes) {
    if (!n.folder || n.x == null || n.y == null) continue
    if (visible && !visible.has(n.id)) continue
    const list = groups.get(n.folder)
    if (list) list.push(n)
    else groups.set(n.folder, [n])
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
    if (path) puddles.push({ key, color: folderColor(members[0].folderIndex), path })
  }
  return puddles
}

type ClusterForce = d3.Force<GNode, GLink> & { strength(v: number): ClusterForce }

/** Pulls every node a little towards the centroid of its folder, so the folders form islands. */
export function forceCluster(initial: number): ClusterForce {
  let nodes: GNode[] = []
  let strength = initial
  const force = ((alpha: number) => {
    if (!strength) return
    const sums = new Map<string, { x: number; y: number; n: number }>()
    for (const d of nodes) {
      if (!d.folder) continue
      const s = sums.get(d.folder) ?? { x: 0, y: 0, n: 0 }
      s.x += d.x ?? 0
      s.y += d.y ?? 0
      s.n++
      sums.set(d.folder, s)
    }
    const k = strength * alpha
    for (const d of nodes) {
      const s = d.folder ? sums.get(d.folder) : undefined
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
  const cluster = forceCluster(mode === 'folder' ? CLUSTER_STRENGTH : 0)
  sim.force('cluster', cluster)

  let current = mode
  let visible: Set<string> | null = null
  let ticks = 0
  // Big graphs: rebuilding every outline each frame would cost more than it shows.
  const every = Math.max(1, Math.ceil(nodes.length / 600))

  const render = (): void => {
    const puddles = current === 'folder' ? computePuddles(nodes, visible, radius) : []
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
      cluster.strength(next === 'folder' ? CLUSTER_STRENGTH : 0)
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
      if (current !== 'folder') return 1
      const a = l.source as GNode
      const b = l.target as GNode
      return a.folder === b.folder ? 1 : CROSS_FOLDER_LINK_FACTOR
    },
    update() {
      if (current !== 'folder') return
      if (++ticks % every === 0) render()
    }
  }
}
