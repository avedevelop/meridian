import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { useVaultStore } from '../../store/useVaultStore'
import { useLinkStore } from '../../store/useLinkStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'

interface LocalNode extends d3.SimulationNodeDatum {
  id: string
  name: string
  isCenter: boolean
  group: 'center' | 'neighbor'
}

interface LocalLink extends d3.SimulationLinkDatum<LocalNode> {
  source: string | LocalNode
  target: string | LocalNode
}

export function LocalGraphView() {
  const activeTabPath = useVaultStore((s) => s.activeTabPath)
  const linkStore = useLinkStore()
  const indexVersion = useLinkStore((s) => s.indexVersion)
  const { openFile } = useVaultBridge()

  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 280, height: 260 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setDimensions({ width: el.clientWidth, height: el.clientHeight || 260 })
    })
    ro.observe(el)
    setDimensions({ width: el.clientWidth, height: el.clientHeight || 260 })
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el || !activeTabPath) return

    // Clear previous SVG
    d3.select(el).selectAll('svg').remove()

    // 1. Gather nodes and links
    const centerName = activeTabPath.split('/').pop()?.replace(/\.md$/, '') ?? 'Active Note'

    const rawBacklinks = linkStore.backlinks(activeTabPath)
    const rawOutlinks = linkStore.outlinks(activeTabPath)

    const neighborPaths = new Set<string>()
    rawBacklinks.forEach((p) => neighborPaths.add(p))
    rawOutlinks.forEach((p) => neighborPaths.add(p))
    neighborPaths.delete(activeTabPath) // remove self if exists

    const nodes: LocalNode[] = [
      { id: activeTabPath, name: centerName, isCenter: true, group: 'center' }
    ]

    neighborPaths.forEach((path) => {
      const name = path.split('/').pop()?.replace(/\.md$/, '') ?? ''
      nodes.push({ id: path, name, isCenter: false, group: 'neighbor' })
    })

    const links: LocalLink[] = []

    // Connect neighbors to center
    rawBacklinks.forEach((p) => {
      if (p !== activeTabPath) {
        links.push({ source: p, target: activeTabPath })
      }
    })
    rawOutlinks.forEach((p) => {
      if (p !== activeTabPath) {
        links.push({ source: activeTabPath, target: p })
      }
    })

    // Also connect neighbors to each other if links exist
    const neighborList = Array.from(neighborPaths)
    for (let i = 0; i < neighborList.length; i++) {
      const p1 = neighborList[i]
      const p1Outlinks = linkStore.outlinks(p1)
      p1Outlinks.forEach((p2) => {
        if (neighborPaths.has(p2) && p1 !== p2) {
          // Check if link already added to avoid duplicates
          const exists = links.some(
            (l) => (l.source === p1 && l.target === p2) || (l.source === p2 && l.target === p1)
          )
          if (!exists) {
            links.push({ source: p1, target: p2 })
          }
        }
      })
    }

    const { width, height } = dimensions

    // 2. Setup D3 SVG
    const svg = d3
      .select(el)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('display', 'block')
      .style('overflow', 'visible')

    // Add arrow defs for directed links
    svg
      .append('defs')
      .append('marker')
      .attr('id', 'local-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 18) // position offset from target node center
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#444')

    // Center g
    const g = svg.append('g')

    // Zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom)

    // 3. Force Simulation
    const simulation = d3
      .forceSimulation<LocalNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<LocalNode, LocalLink>(links)
          .id((d) => d.id)
          .distance(80)
      )
      .force('charge', d3.forceManyBody().strength(-150))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(25))

    // Draw Links
    const link = g
      .append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#333')
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#local-arrow)')

    // Draw Nodes
    const node = g
      .append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .style('cursor', 'pointer')
      .on('click', (_event, d) => {
        openFile(d.id, d.id.split('/').pop() ?? '')
      })
      .call(
        d3
          .drag<SVGGElement, LocalNode>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
      )

    // Circle representation
    node
      .append('circle')
      .attr('r', (d) => (d.isCenter ? 8 : 5.5))
      .attr('fill', (d) => (d.isCenter ? '#7c6af7' : '#38bdf8'))
      .attr('stroke', (d) => (d.isCenter ? '#a395ff' : '#161616'))
      .attr('stroke-width', (d) => (d.isCenter ? 3.5 : 1.5))

    // Labels
    node
      .append('text')
      .text((d) => d.name)
      .attr('x', 0)
      .attr('y', (d) => (d.isCenter ? 18 : 15))
      .attr('text-anchor', 'middle')
      .attr('fill', (d) => (d.isCenter ? '#fff' : '#aaa'))
      .attr('font-size', 9)
      .attr('font-family', 'Inter, -apple-system, sans-serif')
      .style('pointer-events', 'none')
      .style('user-select', 'none')

    // Simulation Ticks
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as LocalNode).x ?? 0)
        .attr('y1', (d) => (d.source as LocalNode).y ?? 0)
        .attr('x2', (d) => (d.target as LocalNode).x ?? 0)
        .attr('y2', (d) => (d.target as LocalNode).y ?? 0)

      node.attr('transform', (d) => `translate(${d.x ?? 0}, ${d.y ?? 0})`)
    })

    function dragstarted(event: any, d: LocalNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    }

    function dragged(event: any, d: LocalNode) {
      d.fx = event.x
      d.fy = event.y
    }

    function dragended(event: any, d: LocalNode) {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
    }

    return () => {
      simulation.stop()
    }
  }, [activeTabPath, dimensions, indexVersion])

  if (!activeTabPath) {
    return (
      <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: '#444' }}>
        Select a note to view its connections
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 280 }}>
      <div
        style={{
          padding: '12px 12px 6px',
          color: '#666',
          fontWeight: 600,
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}
      >
        Local Connections
      </div>
      <div
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: 240,
          background: '#111',
          border: '1px solid #1e1e1e',
          borderRadius: 8,
          margin: '0 12px 12px',
          position: 'relative',
          overflow: 'hidden'
        }}
      />
    </div>
  )
}
