import * as d3 from 'd3'
import type { VaultFile } from '@shared/types'
import { createD3Simulation } from '../../src/renderer/src/components/Graph/simulation/createD3Simulation'

function rng(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

function makeVault(n: number, avgLinks: number): { files: VaultFile[]; outlinks: (p: string) => string[] } {
  const rand = rng(42)
  const files: VaultFile[] = []
  for (let i = 0; i < n; i++) {
    const name = `note-${i}.md`
    files.push({ name, path: `/v/${name}`, relativePath: name, isDirectory: false, mtime: i, birthtime: i })
  }
  const map = new Map<string, string[]>()
  files.forEach((f) => {
    const k = Math.floor(rand() * avgLinks * 2)
    const targets: string[] = []
    for (let j = 0; j < k; j++) targets.push(files[Math.floor(rand() ** 2 * n)].path)
    map.set(f.path, targets)
  })
  return { files, outlinks: (p) => map.get(p) ?? [] }
}

async function frames(durationMs: number, each?: (i: number) => void): Promise<number[]> {
  const out: number[] = []
  let last = performance.now()
  const end = last + durationMs
  let i = 0
  return new Promise((resolve) => {
    const tick = (): void => {
      const now = performance.now()
      out.push(now - last)
      last = now
      each?.(i++)
      if (now < end) requestAnimationFrame(tick)
      else resolve(out)
    }
    requestAnimationFrame(tick)
  })
}

const stats = (xs: number[]): { fps: number; p95: number; worst: number } => {
  const s = [...xs].sort((a, b) => a - b)
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length
  return { fps: +(1000 / mean).toFixed(1), p95: +s[Math.floor(s.length * 0.95)].toFixed(1), worst: +s[s.length - 1].toFixed(1) }
}

;(window as unknown as Record<string, unknown>).runGraph = async (n: number, glow: boolean) => {
  const el = document.getElementById('graph') as HTMLDivElement
  const { files, outlinks } = makeVault(n, 3)
  const t0 = performance.now()
  const res = createD3Simulation({
    el, files, outlinks, disabledCategories: new Set(), strictFilter: false, debouncedSearchQuery: '',
    linkDistance: 60, repulsionStrength: -120, textSize: 11, showArrows: true, openFile: () => {},
    handleMouseOver: () => {}, handleMouseOut: () => {}, maxNodes: n, labelMode: 'auto', showGlow: glow
  })
  const build = performance.now() - t0
  if (!res) throw new Error('no result')
  const { state, zoom } = res
  const svg = d3.select(state.svgEl)
  // animated simulation (what the user sees while layout settles or a node is dragged)
  state.sim.alpha(1).alphaTarget(0.3).restart()
  const simFrames = stats(await frames(2500))
  state.sim.alphaTarget(0)
  state.sim.stop()
  // pan + zoom
  const panFrames = stats(
    await frames(2500, (i) => {
      const k = 0.6 + 0.4 * Math.sin(i / 20)
      svg.call(zoom.transform, d3.zoomIdentity.translate(300 + Math.sin(i / 15) * 120, 200).scale(k))
    })
  )
  return {
    nodes: state.nodes.length, links: state.links.length, buildMs: +build.toFixed(0),
    domNodes: document.getElementsByTagName('*').length, sim: simFrames, pan: panFrames
  }
}

// Canvas 2D prototype: same data and same d3-force layout, drawn on one <canvas>.
;(window as unknown as Record<string, unknown>).runCanvas = async (n: number) => {
  const el = document.getElementById('graph') as HTMLDivElement
  el.innerHTML = ''
  const dpr = window.devicePixelRatio || 1
  const w = el.clientWidth
  const h = el.clientHeight
  const canvas = document.createElement('canvas')
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.cssText = `width:${w}px;height:${h}px;display:block`
  el.appendChild(canvas)
  const ctx = canvas.getContext('2d')!
  const { files, outlinks } = makeVault(n, 3)
  const idx = new Map(files.map((f, i) => [f.path, i]))
  const nodes = files.map((f) => ({ id: f.path, degree: 0 }) as { id: string; degree: number; x?: number; y?: number })
  const links: { source: number; target: number }[] = []
  files.forEach((f, i) => outlinks(f.path).forEach((t) => {
    const j = idx.get(t)
    if (j !== undefined && j !== i) { links.push({ source: i, target: j }); nodes[i].degree++; nodes[j].degree++ }
  }))
  const t0 = performance.now()
  const sim = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
    .alphaDecay(0.02).velocityDecay(0.35)
    .force('link', d3.forceLink(links).distance(60).strength(0.25))
    .force('charge', d3.forceManyBody().strength(-120).distanceMax(300))
    .force('x', d3.forceX(w / 2).strength(0.06)).force('y', d3.forceY(h / 2).strength(0.06))
    .force('collide', d3.forceCollide<d3.SimulationNodeDatum>(14))
  sim.tick(120)
  sim.stop()
  const build = performance.now() - t0
  let k = 1, tx = 0, ty = 0
  const draw = (): void => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, w, h)
    ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * tx, dpr * ty)
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.lineWidth = 1 / k
    ctx.beginPath()
    for (const l of links) {
      // forceLink replaces the numeric indices with node objects
      const s = l.source as unknown as { x: number; y: number }
      const t = l.target as unknown as { x: number; y: number }
      ctx.moveTo(s.x, s.y); ctx.lineTo(t.x, t.y)
    }
    ctx.stroke()
    ctx.fillStyle = '#7aa2f7'
    ctx.beginPath()
    for (const nd of nodes) {
      const r = nd.degree > 0 ? 8 + Math.min(nd.degree * 2, 12) : 6
      ctx.moveTo(nd.x! + r, nd.y!); ctx.arc(nd.x!, nd.y!, r, 0, Math.PI * 2)
    }
    ctx.fill()
    if (k > 0.8) {
      ctx.fillStyle = '#ddd'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'
      for (const nd of nodes) if (nd.degree > 2) ctx.fillText('note', nd.x!, nd.y! + 22)
    }
  }
  sim.alpha(1).alphaTarget(0.3).restart()
  sim.on('tick', () => {})
  const simFrames = stats(await frames(2500, () => draw()))
  sim.alphaTarget(0); sim.stop()
  const panFrames = stats(await frames(2500, (i) => {
    k = 0.6 + 0.4 * Math.sin(i / 20); tx = 300 + Math.sin(i / 15) * 120; ty = 200
    draw()
  }))
  return { nodes: n, links: links.length, buildMs: +build.toFixed(0), domNodes: document.getElementsByTagName('*').length, sim: simFrames, pan: panFrames }
}
