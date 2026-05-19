import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { useLinkStore } from '../../store/useLinkStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  name: string
  linked: boolean
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode
  target: string | GraphNode
}

export function GraphView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const allFiles = useLinkStore(s => s.allFiles)
  const outlinks = useLinkStore(s => s.outlinks)
  const { openFile } = useVaultBridge()

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return

    // Wait one frame so the container has real dimensions
    const frame = requestAnimationFrame(() => {
      const container = containerRef.current!
      const width = container.clientWidth || 900
      const height = container.clientHeight || 600

      const svg = d3.select(svgRef.current!)
      svg.selectAll('*').remove()
      svg.attr('width', width).attr('height', height)

      const allMdFiles = allFiles().filter(f => f.endsWith('.md'))

      if (allMdFiles.length === 0) {
        svg.append('text')
          .attr('x', width / 2).attr('y', height / 2)
          .attr('text-anchor', 'middle').attr('fill', '#444').attr('font-size', 14)
          .text('No notes indexed. Open a vault first.')
        return
      }

      // Build edges
      const edgeSet = new Set<string>()
      const allEdges: GraphLink[] = []
      const connectedFiles = new Set<string>()

      for (const file of allMdFiles) {
        for (const target of outlinks(file)) {
          if (allMdFiles.includes(target)) {
            const key = [file, target].sort().join('|')
            if (!edgeSet.has(key)) {
              edgeSet.add(key)
              allEdges.push({ source: file, target })
              connectedFiles.add(file)
              connectedFiles.add(target)
            }
          }
        }
      }

      const files = allMdFiles.slice(0, 300)
      const links = allEdges.filter(
        l => files.includes(l.source as string) && files.includes(l.target as string)
      )

      const nodes: GraphNode[] = files.map(f => ({
        id: f,
        name: f.split('/').pop()?.replace(/\.md$/, '') ?? '',
        linked: connectedFiles.has(f),
        // Start near center
        x: width / 2 + (Math.random() - 0.5) * 200,
        y: height / 2 + (Math.random() - 0.5) * 200,
      }))

      const simulation = d3.forceSimulation<GraphNode>(nodes)
        .force('link', d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(80).strength(0.5))
        .force('charge', d3.forceManyBody().strength(-60))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide(18))

      const g = svg.append('g')

      // Zoom + pan
      svg.call(
        d3.zoom<SVGSVGElement, unknown>()
          .scaleExtent([0.2, 4])
          .on('zoom', ({ transform }) => g.attr('transform', transform.toString()))
      )

      // Links
      const link = g.append('g').selectAll('line')
        .data(links).join('line')
        .attr('stroke', '#3a3a5a')
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.8)

      // Nodes
      const node = g.append('g').selectAll<SVGCircleElement, GraphNode>('circle')
        .data(nodes).join('circle')
        .attr('r', d => d.linked ? 9 : 5)
        .attr('fill', d => d.linked ? '#7c6af7' : '#444')
        .attr('stroke', d => d.linked ? '#a89df7' : '#555')
        .attr('stroke-width', 1.5)
        .style('cursor', 'pointer')
        .on('mouseover', function(_, d) {
          d3.select(this).attr('fill', '#a89df7').attr('r', d.linked ? 12 : 7)
          labelGroup.selectAll<SVGTextElement, GraphNode>('text')
            .filter(l => l.id === d.id)
            .attr('fill', '#fff').attr('font-size', 13)
        })
        .on('mouseout', function(_, d) {
          d3.select(this).attr('fill', d.linked ? '#7c6af7' : '#444').attr('r', d.linked ? 9 : 5)
          labelGroup.selectAll<SVGTextElement, GraphNode>('text')
            .filter(l => l.id === d.id)
            .attr('fill', d.linked ? '#ccc' : '#666').attr('font-size', 11)
        })
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

      // Labels — show for linked nodes, and all nodes if vault is small
      const showLabel = (d: GraphNode) => d.linked || files.length <= 25
      const labelGroup = g.append('g').attr('pointer-events', 'none')
      const label = labelGroup.selectAll<SVGTextElement, GraphNode>('text')
        .data(nodes.filter(showLabel)).join('text')
        .text(d => d.name)
        .attr('font-size', 11)
        .attr('fill', d => d.linked ? '#ccc' : '#666')
        .attr('text-anchor', 'middle')
        .attr('dy', 22)

      simulation.on('tick', () => {
        link
          .attr('x1', d => (d.source as GraphNode).x ?? 0)
          .attr('y1', d => (d.source as GraphNode).y ?? 0)
          .attr('x2', d => (d.target as GraphNode).x ?? 0)
          .attr('y2', d => (d.target as GraphNode).y ?? 0)
        node.attr('cx', d => d.x ?? 0).attr('cy', d => d.y ?? 0)
        label.attr('x', d => d.x ?? 0).attr('y', d => d.y ?? 0)
      })

      // Let simulation run longer before settling
      simulation.alpha(1).restart()

      return () => { simulation.stop() }
    })

    return () => cancelAnimationFrame(frame)
  }, [allFiles, outlinks, openFile])

  return (
    <div ref={containerRef} style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden', background: '#161616' }}>
      <svg ref={svgRef} style={{ display: 'block' }} />
    </div>
  )
}
