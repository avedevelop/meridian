import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { useLinkStore } from '../../store/useLinkStore'
import { useVaultStore } from '../../store/useVaultStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'
import type { VaultFile } from '@shared/types'

interface GNode extends d3.SimulationNodeDatum {
  id: string
  name: string
  degree: number
}

interface GLink extends d3.SimulationLinkDatum<GNode> {
  source: string | GNode
  target: string | GNode
}

interface GraphViewProps {
  onFileOpen?: () => void
}

function flattenFiles(files: VaultFile[]): VaultFile[] {
  return files.flatMap(file => file.children ? [file, ...flattenFiles(file.children)] : [file])
}

export function GraphView({ onFileOpen }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const files = useVaultStore(s => s.files)
  const outlinks = useLinkStore(s => s.outlinks)
  const indexVersion = useLinkStore(s => s.indexVersion)
  const { openFile } = useVaultBridge()

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let sim: d3.Simulation<GNode, GLink> | null = null

    const build = () => {
      el.innerHTML = ''
      const width = el.clientWidth
      const height = el.clientHeight
      if (!width || !height) return

      const allMdFiles = flattenFiles(files)
        .filter(file => !file.isDirectory && file.name.endsWith('.md'))
        .map(file => file.path)
        .slice(0, 400)
      const liveFiles = new Set(allMdFiles)
      const degree: Record<string, number> = {}
      const edgeSet = new Set<string>()
      const links: GLink[] = []

      for (const file of allMdFiles) {
        for (const target of outlinks(file)) {
          if (!liveFiles.has(target)) continue
          const key = [file, target].sort().join('|')
          if (edgeSet.has(key)) continue
          edgeSet.add(key)
          links.push({ source: file, target })
          degree[file] = (degree[file] ?? 0) + 1
          degree[target] = (degree[target] ?? 0) + 1
        }
      }

      const nodes: GNode[] = allMdFiles.map(f => ({
        id: f,
        name: f.split('/').pop()?.replace(/\.md$/, '') ?? '',
        degree: degree[f] ?? 0,
        x: width / 2 + (Math.random() - 0.5) * 100,
        y: height / 2 + (Math.random() - 0.5) * 100,
      }))

      sim = d3.forceSimulation(nodes)
        .force('link', d3.forceLink<GNode, GLink>(links).id(d => d.id).distance(70).strength(0.4))
        .force('charge', d3.forceManyBody().strength(-80).distanceMax(300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide<GNode>(d => nodeR(d) + 8))

      const svg = d3.select(el).append('svg')
        .attr('width', width).attr('height', height)
        .style('cursor', 'grab')
        .style('display', 'block')

      const defs = svg.append('defs')
      defs.append('filter').attr('id', 'glow')
        .append('feGaussianBlur').attr('stdDeviation', 3).attr('result', 'coloredBlur')

      const root = svg.append('g')

      // Zoom
      svg.call(
        d3.zoom<SVGSVGElement, unknown>()
          .scaleExtent([0.1, 5])
          .on('zoom', ({ transform }) => root.attr('transform', transform.toString()))
          .on('start', () => svg.style('cursor', 'grabbing'))
          .on('end', () => svg.style('cursor', 'grab'))
      )

      // Links
      const linkSel = root.append('g').selectAll<SVGLineElement, GLink>('line')
        .data(links).join('line')
        .attr('stroke', '#4a4080').attr('stroke-width', 1).attr('stroke-opacity', 0.6)

      // Node groups
      const nodeG = root.append('g').selectAll<SVGGElement, GNode>('g')
        .data(nodes).join('g')
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
          if (event.defaultPrevented) return // drag consumed the event
          openFile(d.id, d.name + '.md')
          onFileOpen?.()
        })
        .on('mouseover', function(_e, d) {
          d3.select(this).select('circle.vis')
            .attr('fill', '#a89df7').attr('r', nodeR(d) + 3)
          d3.select(this).select('text').attr('fill', '#fff').attr('font-size', 13)
          svg.style('cursor', 'pointer')
        })
        .on('mouseout', function(_e, d) {
          d3.select(this).select('circle.vis')
            .attr('fill', nodeColor(d)).attr('r', nodeR(d))
          d3.select(this).select('text').attr('fill', labelColor(d)).attr('font-size', 11)
          svg.style('cursor', 'grab')
        })
        .call(
          d3.drag<SVGGElement, GNode>()
            .on('start', (event, d) => { if (!event.active) sim!.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; svg.style('cursor', 'grabbing') })
            .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
            .on('end', (event, d) => { if (!event.active) sim!.alphaTarget(0); d.fx = null; d.fy = null; svg.style('cursor', 'grab') })
        )

      // Invisible hit area (larger than visible circle)
      nodeG.append('circle')
        .attr('r', d => Math.max(nodeR(d) + 10, 16))
        .attr('fill', 'transparent')

      // Visible circle
      nodeG.append('circle').attr('class', 'vis')
        .attr('r', d => nodeR(d))
        .attr('fill', d => nodeColor(d))
        .attr('stroke', d => d.degree > 0 ? '#6a5af7' : '#444')
        .attr('stroke-width', 1.5)

      // Labels
      nodeG.append('text')
        .text(d => d.name)
        .attr('font-size', 11)
        .attr('font-family', '-apple-system, sans-serif')
        .attr('fill', d => labelColor(d))
        .attr('text-anchor', 'middle')
        .attr('dy', d => nodeR(d) + 13)
        .style('pointer-events', 'none')
        .style('user-select', 'none')

      sim.on('tick', () => {
        linkSel
          .attr('x1', d => (d.source as GNode).x!)
          .attr('y1', d => (d.source as GNode).y!)
          .attr('x2', d => (d.target as GNode).x!)
          .attr('y2', d => (d.target as GNode).y!)
        nodeG.attr('transform', d => `translate(${d.x},${d.y})`)
      })
    }

    const ro = new ResizeObserver(build)
    ro.observe(el)
    build()

    return () => { ro.disconnect(); sim?.stop(); el.innerHTML = '' }
  }, [files, outlinks, openFile, indexVersion])

  return (
    <div ref={containerRef} style={{ flex: 1, width: '100%', height: '100%', background: '#161616' }} />
  )
}

const nodeR = (d: GNode) => d.degree > 0 ? 7 + Math.min(d.degree * 2, 10) : 5
const nodeColor = (d: GNode) => d.degree > 0 ? '#7c6af7' : '#3a3560'
const labelColor = (d: GNode) => d.degree > 0 ? '#bbb' : '#555'
