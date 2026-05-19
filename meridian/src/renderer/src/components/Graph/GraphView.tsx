import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { useLinkStore } from '../../store/useLinkStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  name: string
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode
  target: string | GraphNode
}

export function GraphView() {
  const svgRef = useRef<SVGSVGElement>(null)
  const allFiles = useLinkStore(s => s.allFiles)
  const outlinks = useLinkStore(s => s.outlinks)
  const { openFile } = useVaultBridge()

  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const files = allFiles().filter(f => f.endsWith('.md'))
    if (files.length === 0) return

    const width = svgRef.current.clientWidth || 400
    const height = svgRef.current.clientHeight || 400

    const nodes: GraphNode[] = files.map(f => ({
      id: f,
      name: f.split('/').pop()?.replace(/\.md$/, '') ?? '',
    }))

    const links: GraphLink[] = []
    for (const file of files) {
      for (const target of outlinks(file)) {
        if (files.includes(target)) {
          links.push({ source: file, target })
        }
      }
    }

    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-120))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(20))

    const g = svg.append('g')

    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 3])
        .on('zoom', ({ transform }) => g.attr('transform', String(transform)))
    )

    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#2a2a2a')
      .attr('stroke-width', 1.5)

    const node = g.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', 6)
      .attr('fill', '#7c6af7')
      .attr('stroke', '#161616')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (_event, d) => {
        const name = d.id.split('/').pop() ?? ''
        openFile(d.id, name)
      })
      .call(
        d3.drag<SVGCircleElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x; d.fy = d.y
          })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null; d.fy = null
          })
      )

    const label = g.append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .text(d => d.name)
      .attr('font-size', 10)
      .attr('fill', '#888')
      .attr('text-anchor', 'middle')
      .attr('dy', 18)
      .style('pointer-events', 'none')

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x ?? 0)
        .attr('y1', d => (d.source as GraphNode).y ?? 0)
        .attr('x2', d => (d.target as GraphNode).x ?? 0)
        .attr('y2', d => (d.target as GraphNode).y ?? 0)
      node.attr('cx', d => d.x ?? 0).attr('cy', d => d.y ?? 0)
      label.attr('x', d => d.x ?? 0).attr('y', d => d.y ?? 0)
    })

    return () => { simulation.stop() }
  }, [allFiles, outlinks, openFile])

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <svg ref={svgRef} style={{ flex: 1, width: '100%', height: '100%', background: '#161616' }} />
    </div>
  )
}
