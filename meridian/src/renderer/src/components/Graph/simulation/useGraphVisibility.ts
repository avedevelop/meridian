import { useCallback, useRef, useEffect, useState } from 'react'
import * as d3 from 'd3'
import type { GNode, D3State } from '../graphTypes'
import { nodeR, labelColor, getNodeGroup } from '../graphLayout'
import { GROUP_COLORS } from '../GraphSidebar'

export interface VisibilityOptions {
  searchQuery: string
  minTime: number
  maxTime: number
  progress: number
  viewMode: 'live' | 'history'
  birthtimes: Map<string, number>
  disabledCategories: Set<string>
  linkThickness: number
  textSize: number
}

/**
 * Determines if a node is visible based on history mode, category filters.
 */
export function isNodeVisible(
  d: GNode,
  opts: {
    isHistory: boolean
    ts: number
    birthtimes: Map<string, number>
    disabledCategories: Set<string>
  }
): boolean {
  const { isHistory, ts, birthtimes, disabledCategories } = opts

  if (isHistory) {
    const birth = birthtimes.get(d.id)
    if (birth === undefined || birth > ts) return false
  }
  if (d.id.endsWith('.canvas') && disabledCategories.has('canvas')) return false
  if (d.name.match(/^\d{4}-\d{2}-\d{2}$/) && disabledCategories.has('daily')) return false
  if (d.degree === 0 && disabledCategories.has('orphan')) return false

  return true
}

/**
 * Hook that manages node/link visibility, filtering, and hover interactions
 * for the graph simulation.
 */
export function useGraphVisibility(
  d3Ref: React.MutableRefObject<D3State | null>,
  containerRef: React.RefObject<HTMLDivElement | null>,
  opts: VisibilityOptions
) {
  const {
    searchQuery,
    minTime,
    maxTime,
    progress,
    viewMode,
    birthtimes,
    disabledCategories,
    linkThickness,
    textSize
  } = opts

  const visibleNodesRef = useRef<Set<string>>(new Set())

  // Hover preview state
  const [hoveredNode, setHoveredNode] = useState<{
    id: string
    name: string
    x: number
    y: number
  } | null>(null)
  const [hoverPreviewContent, setHoverPreviewContent] = useState<string>('')
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (viewMode === 'live') {
      visibleNodesRef.current = new Set()
    }
  }, [viewMode])

  const applyFiltersAndVisibility = useCallback(() => {
    const state = d3Ref.current
    if (!state) return

    const q = searchQuery.toLowerCase().trim()
    const ts = minTime + (maxTime - minTime) * progress
    const isHistory = viewMode === 'history'

    let reheated = false
    const visibleNodes = new Set<string>()

    state.nodeG.each(function (d) {
      const visible = isNodeVisible(d, { isHistory, ts, birthtimes, disabledCategories })
      if (visible) visibleNodes.add(d.id)
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

        const visible = isNodeVisible(n, { isHistory, ts, birthtimes, disabledCategories })

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

          const sVisible = isNodeVisible(sNode, { isHistory, ts, birthtimes, disabledCategories })
          const tVisible = isNodeVisible(tNode, { isHistory, ts, birthtimes, disabledCategories })

          if (!sVisible || !tVisible) return 0
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

  return {
    applyFiltersAndVisibility,
    handleMouseOver,
    handleMouseOut,
    hoveredNode,
    hoverPreviewContent
  }
}
