import React, { useEffect, useRef } from 'react'
import ForceGraph from 'force-graph'
import { useLinkStore } from '../../store/useLinkStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'

interface GraphNode {
  id: string
  name: string
  neighbors: number
}

interface GraphLink {
  source: string
  target: string
}

export function GraphView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const allFiles = useLinkStore(s => s.allFiles)
  const outlinks = useLinkStore(s => s.outlinks)
  const { openFile } = useVaultBridge()

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const allMdFiles = allFiles().filter(f => f.endsWith('.md'))
    if (allMdFiles.length === 0) return

    // Build graph data
    const neighborCount: Record<string, number> = {}
    const edgeSet = new Set<string>()
    const links: GraphLink[] = []

    for (const file of allMdFiles) {
      for (const target of outlinks(file)) {
        if (!allMdFiles.includes(target)) continue
        const key = [file, target].sort().join('→')
        if (edgeSet.has(key)) continue
        edgeSet.add(key)
        links.push({ source: file, target })
        neighborCount[file] = (neighborCount[file] ?? 0) + 1
        neighborCount[target] = (neighborCount[target] ?? 0) + 1
      }
    }

    const nodes: GraphNode[] = allMdFiles.slice(0, 500).map(f => ({
      id: f,
      name: f.split('/').pop()?.replace(/\.md$/, '') ?? '',
      neighbors: neighborCount[f] ?? 0,
    }))

    // Init force-graph
    const Graph = ForceGraph()(el)
      .width(el.clientWidth)
      .height(el.clientHeight)
      .backgroundColor('#161616')
      .graphData({ nodes, links })
      // Node appearance
      .nodeId('id')
      .nodeLabel('name')
      .nodeRelSize(4)
      .nodeVal(d => Math.max(1, (d as GraphNode).neighbors * 1.5 + 1))
      .nodeColor(d => (d as GraphNode).neighbors > 0 ? '#7c6af7' : '#3a3a5a')
      .nodeCanvasObjectMode(() => 'after')
      .nodeCanvasObject((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const n = node as GraphNode & { x: number; y: number }
        if (globalScale < 0.7 && n.neighbors === 0) return
        const label = n.name
        const fontSize = Math.max(10, 12 / globalScale)
        ctx.font = `${fontSize}px -apple-system, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillStyle = n.neighbors > 0 ? 'rgba(200,200,200,0.9)' : 'rgba(120,120,120,0.6)'
        const r = Math.max(1, n.neighbors * 1.5 + 1) * 4
        ctx.fillText(label, n.x, n.y + r + 2)
      })
      // Link appearance
      .linkColor(() => 'rgba(100,90,180,0.5)')
      .linkWidth(1)
      .linkDirectionalParticles(2)
      .linkDirectionalParticleWidth((link: any) => {
        const s = link.source as GraphNode
        const t = link.target as GraphNode
        return s.neighbors > 0 || t.neighbors > 0 ? 1.5 : 0
      })
      .linkDirectionalParticleSpeed(0.005)
      // Interactions
      .onNodeClick((node: any) => {
        const n = node as GraphNode
        openFile(n.id, n.name + '.md')
      })
      .onNodeHover((node: any) => {
        el.style.cursor = node ? 'pointer' : 'default'
      })
      // Forces
      .d3Force('charge', null)
      .d3Force('center', null)

    Graph
      .d3Force('charge', (window as any).d3?.forceManyBody?.().strength(-80))
      .d3Force('link', (Graph.d3Force('link') as any)?.distance(60))

    // Fit view after settling
    setTimeout(() => Graph.zoomToFit(400, 40), 800)

    // Handle resize
    const ro = new ResizeObserver(() => {
      Graph.width(el.clientWidth).height(el.clientHeight)
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      Graph._destructor?.()
      el.innerHTML = ''
    }
  }, [allFiles, outlinks, openFile])

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden', background: '#161616' }}
    />
  )
}
