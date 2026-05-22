import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import type { VaultFile } from '@shared/types'
import { useVaultBridge } from '../../hooks/useVaultBridge'
import { GROUP_COLORS } from './GraphSidebar'
import type { GNode, GLink, D3State } from './graphTypes'
import { nodeR, labelColor, buildGraphData, getNodeGroup } from './graphLayout'

export interface UseGraphSimulationOptions {
  files: VaultFile[]
  outlinks: (file: string) => string[]
  indexVersion: number
  disabledCategories: Set<string>
  strictFilter: boolean
  searchQuery: string
  debouncedSearchQuery: string
  linkDistance: number
  repulsionStrength: number
  showArrows: boolean
  textSize: number
  linkThickness: number
  viewMode: 'live' | 'history'
  progress: number
  birthtimes: Map<string, number>
  minTime: number
  maxTime: number
  onFileOpen?: () => void
}

export function useGraphSimulation({
  files,
  outlinks,
  indexVersion,
  disabledCategories,
  strictFilter,
  searchQuery,
  debouncedSearchQuery,
  linkDistance,
  repulsionStrength,
  showArrows,
  textSize,
  linkThickness,
  viewMode,
  progress,
  birthtimes,
  minTime,
  maxTime,
  onFileOpen
}: UseGraphSimulationOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const d3Ref = useRef<D3State | null>(null)
  const zoomBehaviorRef = useRef<any>(null)

  const { openFile } = useVaultBridge()

  const [isPhysicsRunning, setIsPhysicsRunning] = useState(true)
  const isPhysicsRunningRef = useRef(isPhysicsRunning)

  useEffect(() => {
    isPhysicsRunningRef.current = isPhysicsRunning
  }, [isPhysicsRunning])

  // Hover Preview state
  const [hoveredNode, setHoveredNode] = useState<{
    id: string
    name: string
    x: number
    y: number
  } | null>(null)
  const [hoverPreviewContent, setHoverPreviewContent] = useState<string>('')
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const visibleNodesRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (viewMode === 'live') {
      visibleNodesRef.current = new Set()
    }
  }, [viewMode])

  // Dynamic filter application
  const applyFiltersAndVisibility = useCallback(() => {
    const state = d3Ref.current
    if (!state) return

    const q = searchQuery.toLowerCase().trim()
    const ts = minTime + (maxTime - minTime) * progress
    const isHistory = viewMode === 'history'

    let reheated = false
    const visibleNodes = new Set<string>()

    state.nodeG.each(function (d) {
      let visible = true

      if (isHistory) {
        const birth = birthtimes.get(d.id)
        visible = birth !== undefined && birth <= ts
      }

      if (d.id.endsWith('.canvas') && disabledCategories.has('canvas')) visible = false
      if (d.name.match(/^\d{4}-\d{2}-\d{2}$/) && disabledCategories.has('daily')) visible = false
      if (d.degree === 0 && disabledCategories.has('orphan')) visible = false

      if (visible) {
        visibleNodes.add(d.id)
      }
    })

    state.nodeG.each(function (d) {
      const visible = visibleNodes.has(d.id)
      const group = d3.select(this)
      const circle = group.select('circle.vis')
      const text = group.select('text')

      const wasHidden = !visibleNodesRef.current.has(d.id)

      if (visible) {
        if (wasHidden) {
          const neighbors = state.links.filter(
            (l) =>
              (typeof l.source === 'object' ? (l.source as GNode).id : l.source) === d.id ||
              (typeof l.target === 'object' ? (l.target as GNode).id : l.target) === d.id
          )

          let parentNode: GNode | null = null
          for (const l of neighbors) {
            const otherId =
              (typeof l.source === 'object' ? (l.source as GNode).id : l.source) === d.id
                ? typeof l.target === 'object'
                  ? (l.target as GNode).id
                  : l.target
                : typeof l.source === 'object'
                  ? (l.source as GNode).id
                  : l.source

            if (visibleNodes.has(otherId as string)) {
              const foundNode = state.nodes.find((n) => n.id === otherId)
              if (foundNode) {
                parentNode = foundNode
                break
              }
            }
          }

          if (parentNode) {
            d.x = parentNode.x
            d.y = parentNode.y
          } else {
            d.x = state.width / 2 + (Math.random() - 0.5) * 40
            d.y = state.height / 2 + (Math.random() - 0.5) * 40
          }

          d.fx = null
          d.fy = null
          reheated = true
        }

        circle.transition().duration(800).ease(d3.easeBackOut).attr('r', nodeR(d))

        text.transition().duration(150).attr('opacity', 1)

        let baseOpacity = 1
        if (q) {
          baseOpacity = d.name.toLowerCase().includes(q) ? 1 : 0.15
        }

        group
          .transition()
          .duration(250)
          .attr('opacity', baseOpacity)
          .style('pointer-events', baseOpacity > 0.15 ? 'auto' : 'none')
      } else {
        circle.transition().duration(200).attr('r', 0)

        text.transition().duration(150).attr('opacity', 0)

        group.transition().duration(200).attr('opacity', 0).style('pointer-events', 'none')
      }
    })

    state.linkSel.each(function (d) {
      const sNode = d.source as GNode
      const tNode = d.target as GNode
      const visible = visibleNodes.has(sNode.id) && visibleNodes.has(tNode.id)

      let opacity = visible ? 1 : 0
      if (visible && q) {
        const sMatch = sNode.name.toLowerCase().includes(q)
        const tMatch = tNode.name.toLowerCase().includes(q)
        opacity = sMatch && tMatch ? 1 : 0.15
      }

      d3.select(this)
        .transition()
        .duration(250)
        .attr('stroke', 'rgba(255, 255, 255, 0.22)')
        .attr('opacity', opacity)
        .attr('stroke-width', visible ? linkThickness : 0)
    })

    visibleNodesRef.current = visibleNodes

    if (reheated) {
      state.sim.alpha(0.3).restart()
    }

    if (isHistory) {
      state.dateLabel.text(
        new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      )
    } else {
      state.dateLabel.text('')
    }
  }, [
    searchQuery,
    minTime,
    maxTime,
    progress,
    viewMode,
    birthtimes,
    disabledCategories,
    linkThickness
  ])

  // Hook up hover preview interaction
  const handleMouseOver = useCallback(
    (gEl: SVGGElement, d: GNode, event: MouseEvent) => {
      const state = d3Ref.current
      if (!state) return

      const q = searchQuery.toLowerCase().trim()
      const ts = minTime + (maxTime - minTime) * progress
      const isHistory = viewMode === 'history'

      const connectedNodes = new Set<string>()
      connectedNodes.add(d.id)

      state.links.forEach((l) => {
        const sourceId = (l.source as GNode).id
        const targetId = (l.target as GNode).id
        if (sourceId === d.id) connectedNodes.add(targetId)
        if (targetId === d.id) connectedNodes.add(sourceId)
      })

      const hoverGroup = getNodeGroup(d.id, d.name, d.degree)
      const hoverColor = GROUP_COLORS[hoverGroup]

      d3.select(gEl)
        .select('circle.glow-halo')
        .transition()
        .duration(150)
        .attr('r', nodeR(d) + 12)
        .attr('opacity', 1)

      d3.select(gEl)
        .select('circle.vis')
        .transition()
        .duration(150)
        .attr('r', nodeR(d) + 3)
        .attr('fill', '#fff')
        .attr('stroke', hoverColor)
        .attr('stroke-width', 3.5)

      d3.select(gEl)
        .select('text')
        .transition()
        .duration(150)
        .attr('fill', '#fff')
        .attr('font-size', textSize + 1)
        .style('font-weight', 'bold')

      state.nodeG.each(function (n) {
        if (n.id === d.id) return

        let visible = true
        if (isHistory) {
          const birth = birthtimes.get(n.id)
          visible = birth !== undefined && birth <= ts
        }
        if (n.id.endsWith('.canvas') && disabledCategories.has('canvas')) visible = false
        if (n.name.match(/^\d{4}-\d{2}-\d{2}$/) && disabledCategories.has('daily')) visible = false
        if (n.degree === 0 && disabledCategories.has('orphan')) visible = false

        let baseOpacity = visible ? 1 : 0
        if (visible && q) {
          baseOpacity = n.name.toLowerCase().includes(q) ? 1 : 0.15
        }

        const targetOpacity = baseOpacity > 0 ? (connectedNodes.has(n.id) ? baseOpacity : 0.15) : 0

        d3.select(this).transition().duration(150).attr('opacity', targetOpacity)
      })

      state.linkSel
        .transition()
        .duration(150)
        .attr('stroke', (l) => {
          const sNode = l.source as GNode
          const tNode = l.target as GNode
          const isConnected = sNode.id === d.id || tNode.id === d.id
          return isConnected ? hoverColor : 'rgba(255, 255, 255, 0.22)'
        })
        .attr('stroke-width', (l) => {
          const sNode = l.source as GNode
          const tNode = l.target as GNode
          const isConnected = sNode.id === d.id || tNode.id === d.id
          return isConnected ? linkThickness + 1.2 : linkThickness
        })
        .attr('opacity', (l) => {
          const sNode = l.source as GNode
          const tNode = l.target as GNode
          const isConnected = sNode.id === d.id || tNode.id === d.id

          let visible = true
          if (isHistory) {
            const sb = birthtimes.get(sNode.id)
            const tb = birthtimes.get(tNode.id)
            visible = sb !== undefined && tb !== undefined && sb <= ts && tb <= ts
          }
          if (sNode.id.endsWith('.canvas') && disabledCategories.has('canvas')) visible = false
          if (tNode.id.endsWith('.canvas') && disabledCategories.has('canvas')) visible = false
          if (sNode.name.match(/^\d{4}-\d{2}-\d{2}$/) && disabledCategories.has('daily')) visible = false
          if (tNode.name.match(/^\d{4}-\d{2}-\d{2}$/) && disabledCategories.has('daily')) visible = false
          if (sNode.degree === 0 && disabledCategories.has('orphan')) visible = false
          if (tNode.degree === 0 && disabledCategories.has('orphan')) visible = false

          if (!visible) return 0
          return isConnected ? 1 : 0.15
        })

      // Graph hover tooltip preview
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current)
      const rect = containerRef.current?.getBoundingClientRect()
      const x = event.clientX - (rect?.left ?? 0)
      const y = event.clientY - (rect?.top ?? 0)
      setHoveredNode({ id: d.id, name: d.name, x, y })
      setHoverPreviewContent('Loading...')

      previewTimeoutRef.current = setTimeout(async () => {
        if (d.id.endsWith('.canvas')) {
          setHoverPreviewContent('Canvas File')
          return
        }
        try {
          const content = await window.vault.readFile(d.id)
          const preview = content.slice(0, 300) + (content.length > 300 ? '...' : '')
          setHoverPreviewContent(preview || '(Empty file)')
        } catch {
          setHoverPreviewContent('Failed to load note content')
        }
      }, 250)
    },
    [
      searchQuery,
      disabledCategories,
      textSize,
      linkThickness,
      progress,
      viewMode,
      birthtimes,
      minTime,
      maxTime
    ]
  )

  const handleMouseOut = useCallback(
    (gEl: SVGGElement, d: GNode) => {
      const group = getNodeGroup(d.id, d.name, d.degree)

      d3.select(gEl)
        .select('circle.glow-halo')
        .transition()
        .duration(150)
        .attr('r', nodeR(d) + 8)
        .attr('opacity', 0)

      d3.select(gEl)
        .select('circle.vis')
        .transition()
        .duration(150)
        .attr('r', nodeR(d))
        .attr('fill', GROUP_COLORS[group])
        .attr('stroke', GROUP_COLORS[group])
        .attr('stroke-width', 1.5)
        .style('filter', null)

      d3.select(gEl)
        .select('text')
        .transition()
        .duration(150)
        .attr('fill', labelColor(d))
        .attr('font-size', textSize)
        .style('font-weight', 'normal')

      applyFiltersAndVisibility()

      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current)
        previewTimeoutRef.current = null
      }
      setHoveredNode(null)
      setHoverPreviewContent('')
    },
    [textSize, applyFiltersAndVisibility]
  )

  const handleMouseOverRef = useRef(handleMouseOver)
  handleMouseOverRef.current = handleMouseOver

  const handleMouseOutRef = useRef(handleMouseOut)
  handleMouseOutRef.current = handleMouseOut

  // Effect: Update Forces (Link distance and charge repulsion)
  useEffect(() => {
    const state = d3Ref.current
    if (!state) return

    const linkForce = state.sim.force('link') as d3.ForceLink<GNode, GLink>
    if (linkForce) linkForce.distance(linkDistance)

    const chargeForce = state.sim.force('charge') as d3.ForceManyBody<GNode>
    if (chargeForce) chargeForce.strength(repulsionStrength)

    state.sim.alpha(0.3).restart()
  }, [linkDistance, repulsionStrength])

  // Effect: Update Text Size
  useEffect(() => {
    const state = d3Ref.current
    if (!state) return

    state.nodeG
      .selectAll('text')
      .attr('font-size', textSize)
      .attr('dy', (d) => nodeR(d as GNode) + textSize + 2)
  }, [textSize])

  // Effect: Update Arrows
  useEffect(() => {
    const state = d3Ref.current
    if (!state) return

    state.linkSel.attr('marker-end', showArrows ? 'url(#arrow)' : null)
  }, [showArrows])

  // Effect: Reapply filters on filter changes
  useEffect(() => {
    applyFiltersAndVisibility()
  }, [applyFiltersAndVisibility])

  // Effect: Build Simulation
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let sim: d3.Simulation<GNode, GLink> | null = null

    const build = () => {
      el.innerHTML = ''
      const width = el.clientWidth
      const height = el.clientHeight
      if (!width || !height) return

      const { nodes, links: finalLinks } = buildGraphData(files, outlinks, {
        disabledCategories,
        strictFilter,
        debouncedSearchQuery,
        width,
        height
      })

      sim = d3
        .forceSimulation(nodes)
        .force(
          'link',
          d3
            .forceLink<GNode, GLink>(finalLinks)
            .id((d) => d.id)
            .distance(linkDistance)
            .strength(0.4)
        )
        .force('charge', d3.forceManyBody().strength(repulsionStrength).distanceMax(300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force(
          'collide',
          d3.forceCollide<GNode>((d) => nodeR(d) + 8)
        )

      const svg = d3
        .select(el)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
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

        grad
          .append('stop')
          .attr('offset', '100%')
          .attr('stop-color', color)
          .attr('stop-opacity', 0)
      })

      // Grid background
      const pattern = defs
        .append('pattern')
        .attr('id', 'dotgrid')
        .attr('width', 28)
        .attr('height', 28)
        .attr('patternUnits', 'userSpaceOnUse')
      pattern.append('circle').attr('cx', 14).attr('cy', 14).attr('r', 0.75).attr('fill', 'var(--border-color)')

      svg.append('rect').attr('width', width).attr('height', height).attr('fill', 'var(--bg-secondary)')
      svg.append('rect').attr('width', width).attr('height', height).attr('fill', 'url(#dotgrid)')

      const root = svg.append('g')

      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 5])
        .on('zoom', ({ transform }) => root.attr('transform', transform.toString()))
        .on('start', () => svg.style('cursor', 'grabbing'))
        .on('end', () => svg.style('cursor', 'grab'))

      svg.call(zoom)
      zoomBehaviorRef.current = zoom

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
        .text((d) => d.name)
        .attr('font-size', textSize)
        .attr('font-family', '-apple-system, sans-serif')
        .attr('fill', (d) => labelColor(d))
        .attr('text-anchor', 'middle')
        .attr('dy', (d) => nodeR(d) + textSize + 2)
        .attr('opacity', 0)
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
        const handleMouseOver = handleMouseOverRef.current
        if (handleMouseOver) handleMouseOver(this, d, event)
      })

      nodeG.on('mouseleave', function (_event, d) {
        const handleMouseOut = handleMouseOutRef.current
        if (handleMouseOut) handleMouseOut(this, d)
      })

      sim.on('tick', () => {
        linkSel
          .attr('x1', (d) => (d.source as GNode).x!)
          .attr('y1', (d) => (d.source as GNode).y!)
          .attr('x2', (d) => (d.target as GNode).x!)
          .attr('y2', (d) => (d.target as GNode).y!)
        nodeG.attr('transform', (d) => `translate(${d.x},${d.y})`)
      })

      d3Ref.current = {
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
      applyFiltersAndVisibility()
      if (!isPhysicsRunningRef.current) {
        sim.stop()
      }
    }

    const ro = new ResizeObserver(build)
    ro.observe(el)
    build()

    return () => {
      ro.disconnect()
      sim?.stop()
      el.innerHTML = ''
      d3Ref.current = null
    }
  }, [
    files,
    outlinks,
    openFile,
    indexVersion,
    disabledCategories,
    strictFilter,
    debouncedSearchQuery,
    onFileOpen
  ])

  const handleTogglePhysics = useCallback(() => {
    const state = d3Ref.current
    if (!state) return
    if (isPhysicsRunning) {
      state.sim.stop()
      setIsPhysicsRunning(false)
    } else {
      state.sim.alpha(0.3).restart()
      setIsPhysicsRunning(true)
    }
  }, [isPhysicsRunning])

  return {
    containerRef,
    d3Ref,
    zoomBehaviorRef,
    isPhysicsRunning,
    handleTogglePhysics,
    hoveredNode,
    hoverPreviewContent
  }
}
