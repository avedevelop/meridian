import * as d3 from 'd3'
import type { VaultFile } from '@shared/types'
import type { GNode, GLink, D3State, GraphBuildResult } from '../graphTypes'
import { nodeR, labelColor, buildGraphData, getNodeGroup } from '../graphLayout'
import { GROUP_COLORS } from '../GraphSidebar'
import { shouldShowLabel, truncateLabel } from '../graphLabelHelpers'

export interface CreateSimulationOptions {
  el: HTMLDivElement
  files: VaultFile[]
  outlinks: (file: string) => string[]
  disabledCategories: Set<string>
  strictFilter: boolean
  debouncedSearchQuery: string
  linkDistance: number
  repulsionStrength: number
  textSize: number
  showArrows: boolean
  openFile: (path: string, name: string) => void
  onFileOpen?: () => void
  handleMouseOver: (gEl: SVGGElement, d: GNode, event: MouseEvent) => void
  handleMouseOut: (gEl: SVGGElement, d: GNode) => void
  maxNodes: number
  labelMode: 'auto' | 'hover' | 'all'
}

export interface SimulationResult {
  state: D3State
  zoom: d3.ZoomBehavior<SVGSVGElement, unknown>
  buildResult: GraphBuildResult
}

export function createD3Simulation({
  el,
  files,
  outlinks,
  disabledCategories,
  strictFilter,
  debouncedSearchQuery,
  linkDistance,
  repulsionStrength,
  textSize,
  showArrows,
  openFile,
  onFileOpen,
  handleMouseOver,
  handleMouseOut,
  maxNodes,
  labelMode
}: CreateSimulationOptions): SimulationResult | null {
  el.innerHTML = ''
  const width = el.clientWidth
  const height = el.clientHeight
  if (!width || !height) return null

  const buildResult = buildGraphData(files, outlinks, {
    disabledCategories,
    strictFilter,
    debouncedSearchQuery,
    width,
    height,
    maxNodes
  })
  const { nodes, links: finalLinks } = buildResult

  const sim = d3
    .forceSimulation(nodes)
    .alphaDecay(0.02)
    .velocityDecay(0.35)
    .force(
      'link',
      d3
        .forceLink<GNode, GLink>(finalLinks)
        .id((d) => d.id)
        .distance(linkDistance)
        .strength(0.25)
    )
    .force('charge', d3.forceManyBody().strength(repulsionStrength).distanceMax(300))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force(
      'collide',
      d3.forceCollide<GNode>((d) => nodeR(d) + 12 + (textSize * 0.5))
    )

  const svg = d3
    .select(el)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('data-label-mode', labelMode)
    .style('cursor', 'grab')
    .style('display', 'block')

  const defs = svg.append('defs')

  // Arrow marker
  defs
    .append('marker')
    .attr('id', 'arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 22)
    .attr('refY', 0)
    .attr('markerWidth', 5)
    .attr('markerHeight', 5)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', 'rgba(255, 255, 255, 0.4)')

  // Soft glow radial gradients (highly optimized, GPU accelerated)
  Object.entries(GROUP_COLORS).forEach(([name, color]) => {
    const grad = defs
      .append('radialGradient')
      .attr('id', `glow-grad-${name}`)
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%')

    grad.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.7)

    grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0)
  })

  // Grid background
  const pattern = defs
    .append('pattern')
    .attr('id', 'dotgrid')
    .attr('width', 28)
    .attr('height', 28)
    .attr('patternUnits', 'userSpaceOnUse')
  pattern
    .append('circle')
    .attr('cx', 14)
    .attr('cy', 14)
    .attr('r', 0.75)
    .attr('fill', 'var(--border-color)')

  svg.append('rect').attr('width', width).attr('height', height).attr('fill', 'var(--bg-secondary)')
  svg.append('rect').attr('width', width).attr('height', height).attr('fill', 'url(#dotgrid)')

  const root = svg.append('g')

  const zoom = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.1, 5])
    .on('zoom', (event) => {
      const transform = event.transform
      root.attr('transform', transform.toString())
      const currentLabelMode = (svg.node()?.getAttribute('data-label-mode') || 'auto') as any
      nodeG.selectAll('text').attr('opacity', function (this: any, d: any) {
        const parent = this?.parentNode
        const isHovered = parent ? d3.select(parent).classed('is-hovered') : false
        return shouldShowLabel(currentLabelMode, transform.k, d.degree, isHovered) ? 1 : 0
      })
    })
    .on('start', () => svg.style('cursor', 'grabbing'))
    .on('end', () => svg.style('cursor', 'grab'))

  svg.call(zoom)

  const linkSel = root
    .append('g')
    .selectAll<SVGLineElement, GLink>('line')
    .data(finalLinks)
    .join('line')
    .attr('stroke', 'rgba(255, 255, 255, 0.22)')
    .attr('stroke-width', 0)
    .attr('opacity', 0)

  const nodeG = root
    .append('g')
    .selectAll<SVGGElement, GNode>('g')
    .data(nodes)
    .join('g')
    .attr('opacity', 0)
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
      if (event.defaultPrevented) return
      openFile(d.id, d.name)
      onFileOpen?.()
    })
    .call(
      d3
        .drag<SVGGElement, GNode>()
        .on('start', (event, d) => {
          if (!event.active) sim?.alphaTarget(0.3).restart()
          d.fx = d.x
          d.fy = d.y
        })
        .on('drag', (event, d) => {
          d.fx = event.x
          d.fy = event.y
        })
        .on('end', (event, d) => {
          if (!event.active) sim?.alphaTarget(0)
          d.fx = null
          d.fy = null
        })
    )

  // Background pulsing glow
  nodeG
    .append('circle')
    .attr('class', 'glow-halo')
    .attr('r', (d) => nodeR(d) + 8)
    .attr('fill', (d) => `url(#glow-grad-${getNodeGroup(d.id, d.name, d.degree)})`)
    .attr('opacity', 0)
    .style('pointer-events', 'none')
    .style('transform-origin', 'center')

  // Node circles
  nodeG
    .append('circle')
    .attr('class', 'vis')
    .attr('r', 0)
    .attr('fill', (d) => GROUP_COLORS[getNodeGroup(d.id, d.name, d.degree)])
    .attr('stroke', (d) => GROUP_COLORS[getNodeGroup(d.id, d.name, d.degree)])
    .attr('stroke-width', 1.5)

  nodeG
    .append('text')
    .text((d) => truncateLabel(d.name))
    .attr('font-size', textSize)
    .attr('font-family', '-apple-system, sans-serif')
    .attr('fill', (d) => labelColor(d))
    .attr('text-anchor', 'middle')
    .attr('dy', (d) => nodeR(d) + textSize + 2)
    .attr('opacity', (d) => shouldShowLabel(labelMode, 1.0, d.degree, false) ? 1 : 0)
    .style('pointer-events', 'none')
    .style('user-select', 'none')

  const dateLabel = svg
    .append('text')
    .attr('x', width - 16)
    .attr('y', height - 16)
    .attr('text-anchor', 'end')
    .attr('font-size', 13)
    .attr('font-family', '-apple-system, sans-serif')
    .attr('fill', 'rgba(255,255,255,0.35)')

  nodeG.on('mouseenter', function (event, d) {
    handleMouseOver(this, d, event)
  })

  nodeG.on('mouseleave', function (_event, d) {
    handleMouseOut(this, d)
  })

  sim.on('tick', () => {
    linkSel
      .attr('x1', (d) => (d.source as GNode).x!)
      .attr('y1', (d) => (d.source as GNode).y!)
      .attr('x2', (d) => (d.target as GNode).x!)
      .attr('y2', (d) => (d.target as GNode).y!)
    nodeG.attr('transform', (d) => `translate(${d.x},${d.y})`)
  })

  // Warm up simulation to avoid layout explosion on first render
  sim.tick(120)
  sim.alphaTarget(0)

  if (showArrows) {
    linkSel.attr('marker-end', 'url(#arrow)')
  }

  const state: D3State = {
    sim,
    nodeG,
    linkSel,
    dateLabel,
    svgEl: svg.node()!,
    nodes,
    links: finalLinks,
    width,
    height
  }

  return {
    state,
    zoom,
    buildResult
  }
}
