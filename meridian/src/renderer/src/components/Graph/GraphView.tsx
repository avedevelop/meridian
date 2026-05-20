import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import * as d3 from 'd3'
import { useLinkStore } from '../../store/useLinkStore'
import { useVaultStore } from '../../store/useVaultStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'
import type { VaultFile } from '@shared/types'
import { SearchIcon, SettingsIcon } from '../Icons'

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

interface D3State {
  sim: d3.Simulation<GNode, GLink>
  nodeG: d3.Selection<SVGGElement, GNode, SVGGElement, unknown>
  linkSel: d3.Selection<SVGLineElement, GLink, SVGGElement, unknown>
  dateLabel: d3.Selection<SVGTextElement, unknown, null, undefined>
  svgEl: SVGSVGElement
  nodes: GNode[]
  links: GLink[]
  width: number
  height: number
}

function flattenFiles(files: VaultFile[]): VaultFile[] {
  return files.flatMap((f) => (f.children ? [f, ...flattenFiles(f.children)] : [f]))
}

const GROUP_COLORS = {
  canvas: '#b4befe', // Lavender
  project: '#f5c2e7', // Pink
  daily: '#a6e3a1', // Green
  connected: '#89b4fa', // Blue
  orphan: '#5c5f77' // Gray
}

function getNodeGroup(
  id: string,
  name: string,
  degree: number
): 'canvas' | 'project' | 'daily' | 'connected' | 'orphan' {
  if (id.endsWith('.canvas')) return 'canvas'
  if (name.match(/^\d{4}-\d{2}-\d{2}$/)) return 'daily'
  if (id.includes('/Projects/') || id.includes('\\Projects\\')) return 'project'
  return degree > 0 ? 'connected' : 'orphan'
}

const nodeR = (d: GNode) => (d.degree > 0 ? 8 + Math.min(d.degree * 2, 12) : 6)
const labelColor = (d: GNode) => (d.degree > 0 ? 'var(--text-primary)' : 'var(--text-secondary)')

export function GraphView({ onFileOpen }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const d3Ref = useRef<D3State | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const progressRef = useRef(1)
  const visibleNodesRef = useRef<Set<string>>(new Set())

  const files = useVaultStore((s) => s.files)
  const outlinks = useLinkStore((s) => s.outlinks)
  const indexVersion = useLinkStore((s) => s.indexVersion)
  const { openFile } = useVaultBridge()

  const [viewMode, setViewMode] = useState<'live' | 'history'>('live')
  const [progress, setProgress] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playDuration, setPlayDuration] = useState(20000)
  const [isRecording, setIsRecording] = useState(false)

  // Graph View Settings State
  const [searchQuery, setSearchQuery] = useState('')
  const [showOrphans, setShowOrphans] = useState(true)
  const [showCanvases, setShowCanvases] = useState(true)
  const [showDaily, setShowDaily] = useState(true)
  const [linkDistance, setLinkDistance] = useState(70)
  const [repulsionStrength, setRepulsionStrength] = useState(-80)
  const [showArrows, setShowArrows] = useState(false)
  const [textSize, setTextSize] = useState(11)
  const [linkThickness, setLinkThickness] = useState(1)
  const [isSettingsOpen, setIsSettingsOpen] = useState(true)

  // Hover Preview state
  const [hoveredNode, setHoveredNode] = useState<{
    id: string
    name: string
    x: number
    y: number
  } | null>(null)
  const [hoverPreviewContent, setHoverPreviewContent] = useState<string>('')
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  progressRef.current = progress
  const viewModeRef = useRef(viewMode)
  viewModeRef.current = viewMode

  const { birthtimes, minTime, maxTime } = useMemo(() => {
    const bt = new Map<string, number>()
    flattenFiles(files).forEach((f) => {
      if (!f.isDirectory) bt.set(f.path, f.birthtime ?? f.mtime)
    })
    const times = Array.from(bt.values())
    const min = times.length > 0 ? Math.min(...times) : Date.now() - 86_400_000
    const max = times.length > 0 ? Math.max(...times) : Date.now()
    const finalMax = max === min ? min + 3600000 : max
    return {
      birthtimes: bt,
      minTime: min,
      maxTime: finalMax
    }
  }, [files])

  const currentTimestamp = minTime + (maxTime - minTime) * progress

  const formattedDate = new Date(currentTimestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

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

      if (d.id.endsWith('.canvas') && !showCanvases) visible = false
      if (d.name.match(/^\d{4}-\d{2}-\d{2}$/) && !showDaily) visible = false
      if (d.degree === 0 && !showOrphans) visible = false

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
    birthtimes,
    minTime,
    maxTime,
    progress,
    viewMode,
    searchQuery,
    showOrphans,
    showCanvases,
    showDaily,
    linkThickness
  ])

  useEffect(() => {
    applyFiltersAndVisibility()
  }, [applyFiltersAndVisibility])

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
        if (n.id.endsWith('.canvas') && !showCanvases) visible = false
        if (n.name.match(/^\d{4}-\d{2}-\d{2}$/) && !showDaily) visible = false
        if (n.degree === 0 && !showOrphans) visible = false

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
          if (sNode.id.endsWith('.canvas') && !showCanvases) visible = false
          if (tNode.id.endsWith('.canvas') && !showCanvases) visible = false
          if (sNode.name.match(/^\d{4}-\d{2}-\d{2}$/) && !showDaily) visible = false
          if (tNode.name.match(/^\d{4}-\d{2}-\d{2}$/) && !showDaily) visible = false
          if (sNode.degree === 0 && !showOrphans) visible = false
          if (tNode.degree === 0 && !showOrphans) visible = false

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
      showCanvases,
      showDaily,
      showOrphans,
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

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let sim: d3.Simulation<GNode, GLink> | null = null

    const build = () => {
      el.innerHTML = ''
      const width = el.clientWidth
      const height = el.clientHeight
      if (!width || !height) return

      const allFiles = flattenFiles(files)
        .filter((f) => !f.isDirectory && (f.name.endsWith('.md') || f.name.endsWith('.canvas')))
        .map((f) => f.path)
        .slice(0, 400)
      const liveSet = new Set(allFiles)
      const degree: Record<string, number> = {}
      const edgeSet = new Set<string>()
      const links: GLink[] = []

      for (const file of allFiles) {
        for (const target of outlinks(file)) {
          if (!liveSet.has(target)) continue
          const key = [file, target].sort().join('|')
          if (edgeSet.has(key)) continue
          edgeSet.add(key)
          links.push({ source: file, target })
          degree[file] = (degree[file] ?? 0) + 1
          degree[target] = (degree[target] ?? 0) + 1
        }
      }

      const nodes: GNode[] = allFiles.map((f) => ({
        id: f,
        name:
          f
            .split('/')
            .pop()
            ?.replace(/\.(md|canvas)$/, '') ?? '',
        degree: degree[f] ?? 0,
        x: width / 2 + (Math.random() - 0.5) * 100,
        y: height / 2 + (Math.random() - 0.5) * 100
      }))

      sim = d3
        .forceSimulation(nodes)
        .force(
          'link',
          d3
            .forceLink<GNode, GLink>(links)
            .id((d) => d.id)
            .distance(70)
            .strength(0.4)
        )
        .force('charge', d3.forceManyBody().strength(-80).distanceMax(300))
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
        .attr('fill', 'rgba(255, 255, 255, 0.15)')

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
          .attr('offset', '45%')
          .attr('stop-color', color)
          .attr('stop-opacity', 0.2)

        grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0)
      })

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

      svg.call(
        d3
          .zoom<SVGSVGElement, unknown>()
          .scaleExtent([0.1, 5])
          .on('zoom', ({ transform }) => root.attr('transform', transform.toString()))
          .on('start', () => svg.style('cursor', 'grabbing'))
          .on('end', () => svg.style('cursor', 'grab'))
      )

      const linkSel = root
        .append('g')
        .selectAll<SVGLineElement, GLink>('line')
        .data(links)
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
          openFile(d.id, d.name + '.md')
          onFileOpen?.()
        })
        .on('mouseover', function (event, d) {
          handleMouseOverRef.current?.(this, d, event)
        })
        .on('mouseout', function (_e, d) {
          handleMouseOutRef.current?.(this, d)
        })
        .call(
          d3
            .drag<SVGGElement, GNode>()
            .on('start', (event, d) => {
              if (!event.active) sim!.alphaTarget(0.3).restart()
              d.fx = d.x
              d.fy = d.y
            })
            .on('drag', (event, d) => {
              d.fx = event.x
              d.fy = event.y
            })
            .on('end', (event, d) => {
              if (!event.active) sim!.alphaTarget(0)
              d.fx = null
              d.fy = null
            })
        )

      nodeG
        .append('circle')
        .attr('r', (d) => Math.max(nodeR(d) + 10, 16))
        .attr('fill', 'transparent')
      nodeG
        .append('circle')
        .attr('class', 'glow-halo')
        .attr('r', (d) => nodeR(d) + 8)
        .attr('fill', (d) => `url(#glow-grad-${getNodeGroup(d.id, d.name, d.degree)})`)
        .attr('opacity', 0)
        .style('pointer-events', 'none')
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
        links,
        width,
        height
      }
      applyFiltersAndVisibility()
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
  }, [files, outlinks, openFile, indexVersion])

  useEffect(() => {
    if (!isPlaying) return
    const startTime = performance.now()
    const startProgress = progressRef.current
    let raf: number
    const tick = (now: number) => {
      const newProgress = Math.min(startProgress + (now - startTime) / playDuration, 1)
      setProgress(newProgress)
      if (newProgress >= 1) {
        setIsPlaying(false)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isPlaying, playDuration])

  const renderFrameToCanvas = useCallback(() => {
    const state = d3Ref.current
    const canvas = canvasRef.current
    if (!state || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const data = new XMLSerializer().serializeToString(state.svgEl)
    const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#161616'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
    }
    img.src = url
  }, [])

  useEffect(() => {
    if (isRecording) renderFrameToCanvas()
  }, [progress, isRecording, renderFrameToCanvas])

  useEffect(() => {
    if (isRecording && !isPlaying && progress >= 1) {
      const t = setTimeout(() => mediaRecorderRef.current?.stop(), 600)
      return () => clearTimeout(t)
    }
    return
  }, [isRecording, isPlaying, progress])

  const startRecording = useCallback(() => {
    const el = containerRef.current
    const canvas = canvasRef.current
    if (!el || !canvas) return
    canvas.width = el.clientWidth
    canvas.height = el.clientHeight
    const stream = canvas.captureStream(15)
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
    chunksRef.current = []
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = async () => {
      setIsRecording(false)
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      const buf = await blob.arrayBuffer()
      await window.vault.saveVideo(new Uint8Array(buf))
    }
    recorder.start(200)
    mediaRecorderRef.current = recorder
    setIsRecording(true)
    setProgress(0)
    setIsPlaying(true)
  }, [])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
    setIsPlaying(false)
  }, [])

  const handleToggleMode = (mode: 'live' | 'history') => {
    setViewMode(mode)
    if (mode === 'live') {
      setIsPlaying(false)
      if (isRecording) {
        mediaRecorderRef.current?.stop()
        setIsRecording(false)
      }
    } else {
      setProgress(0)
      setIsPlaying(false)
    }
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Search and Settings Toggle */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}
      >
        <div
          style={{
            background: 'rgba(22, 22, 22, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid #2a2a2a',
            borderRadius: 8,
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            width: 220,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
          }}
        >
          <SearchIcon size={13} color="#aaa" style={{ opacity: 0.6 }} />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#fff',
              fontSize: 12,
              width: '100%'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                fontSize: 10,
                padding: 2
              }}
            >
              ✕
            </button>
          )}
        </div>

        <button
          onClick={() => setIsSettingsOpen((o) => !o)}
          style={{
            background: isSettingsOpen ? '#7c6af7' : 'rgba(22, 22, 22, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid #2a2a2a',
            borderRadius: 8,
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: 14,
            color: '#fff',
            transition: 'all 0.2s',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
          }}
          title="Graph settings"
        >
          <SettingsIcon size={15} />
        </button>
      </div>

      {/* Settings Panel */}
      {isSettingsOpen && (
        <div
          style={{
            position: 'absolute',
            top: 52,
            left: 12,
            zIndex: 10,
            width: 280,
            background: 'rgba(22, 22, 22, 0.9)',
            backdropFilter: 'blur(10px)',
            border: '1px solid #2a2a2a',
            borderRadius: 12,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            color: '#fff',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
            maxHeight: 'calc(100% - 80px)',
            overflowY: 'auto'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #2a2a2a',
              paddingBottom: 8
            }}
          >
            <span
              style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: '#a6adc8' }}
            >
              GRAPH SETTINGS
            </span>
            <button
              onClick={() => setIsSettingsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                fontSize: 12
              }}
            >
              ✕
            </button>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#585b70' }}>FILTERS</span>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <input
                type="checkbox"
                checked={showOrphans}
                onChange={(e) => setShowOrphans(e.target.checked)}
                style={{ accentColor: '#7c6af7', cursor: 'pointer' }}
              />
              <span
                style={{
                  display: 'inline-flex',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: GROUP_COLORS.orphan
                }}
              />
              Orphan files
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <input
                type="checkbox"
                checked={showCanvases}
                onChange={(e) => setShowCanvases(e.target.checked)}
                style={{ accentColor: '#7c6af7', cursor: 'pointer' }}
              />
              <span
                style={{
                  display: 'inline-flex',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: GROUP_COLORS.canvas
                }}
              />
              Canvases (.canvas)
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <input
                type="checkbox"
                checked={showDaily}
                onChange={(e) => setShowDaily(e.target.checked)}
                style={{ accentColor: '#7c6af7', cursor: 'pointer' }}
              />
              <span
                style={{
                  display: 'inline-flex',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: GROUP_COLORS.daily
                }}
              />
              Daily notes
            </label>
          </div>

          {/* Physics Forces */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              borderTop: '1px solid #222',
              paddingTop: 12
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: '#585b70' }}>FORCES</span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: '#a6adc8' }}>Link distance</span>
                <span style={{ color: '#7c6af7', fontWeight: 500 }}>{linkDistance}px</span>
              </div>
              <input
                type="range"
                min={30}
                max={200}
                value={linkDistance}
                onChange={(e) => setLinkDistance(Number(e.target.value))}
                style={{ accentColor: '#7c6af7', cursor: 'pointer', height: 3 }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: '#a6adc8' }}>Repulsion force</span>
                <span style={{ color: '#7c6af7', fontWeight: 500 }}>
                  {Math.abs(repulsionStrength)}
                </span>
              </div>
              <input
                type="range"
                min={-300}
                max={-20}
                value={repulsionStrength}
                onChange={(e) => setRepulsionStrength(Number(e.target.value))}
                style={{ accentColor: '#7c6af7', cursor: 'pointer', height: 3 }}
              />
            </div>
          </div>

          {/* Rendering */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              borderTop: '1px solid #222',
              paddingTop: 12
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: '#585b70' }}>DISPLAY</span>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <input
                type="checkbox"
                checked={showArrows}
                onChange={(e) => setShowArrows(e.target.checked)}
                style={{ accentColor: '#7c6af7', cursor: 'pointer' }}
              />
              Link direction arrows
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: '#a6adc8' }}>Text size</span>
                <span style={{ color: '#7c6af7', fontWeight: 500 }}>{textSize}px</span>
              </div>
              <input
                type="range"
                min={8}
                max={20}
                value={textSize}
                onChange={(e) => setTextSize(Number(e.target.value))}
                style={{ accentColor: '#7c6af7', cursor: 'pointer', height: 3 }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: '#a6adc8' }}>Link thickness</span>
                <span style={{ color: '#7c6af7', fontWeight: 500 }}>{linkThickness}px</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={linkThickness}
                onChange={(e) => setLinkThickness(Number(e.target.value))}
                style={{ accentColor: '#7c6af7', cursor: 'pointer', height: 3 }}
              />
            </div>
          </div>

          {/* Color Legend */}
          <div style={{ borderTop: '1px solid #222', paddingTop: 12 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#585b70',
                display: 'block',
                marginBottom: 8
              }}
            >
              COLOR LEGEND
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  color: '#a6adc8'
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: GROUP_COLORS.canvas
                  }}
                />
                <span>Canvases</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  color: '#a6adc8'
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: GROUP_COLORS.project
                  }}
                />
                <span>Projects</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  color: '#a6adc8'
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: GROUP_COLORS.daily
                  }}
                />
                <span>Daily Notes</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  color: '#a6adc8'
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: GROUP_COLORS.connected
                  }}
                />
                <span>Connected</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode Selector */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: 'rgba(22, 22, 22, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #2a2a2a',
          borderRadius: 8,
          padding: 3,
          display: 'flex',
          gap: 4,
          zIndex: 10
        }}
      >
        <button
          onClick={() => handleToggleMode('live')}
          style={{
            background: viewMode === 'live' ? '#7c6af7' : 'transparent',
            border: 'none',
            borderRadius: 6,
            color: viewMode === 'live' ? '#fff' : '#aaa',
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500,
            transition: 'all 0.2s'
          }}
        >
          Network
        </button>
        <button
          onClick={() => handleToggleMode('history')}
          style={{
            background: viewMode === 'history' ? '#7c6af7' : 'transparent',
            border: 'none',
            borderRadius: 6,
            color: viewMode === 'history' ? '#fff' : '#aaa',
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500,
            transition: 'all 0.2s'
          }}
        >
          History
        </button>
      </div>

      <div
        ref={containerRef}
        style={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden' }}
      >
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      {viewMode === 'history' && (
        <div
          style={{
            height: 60,
            background: '#111',
            borderTop: '1px solid #2a2a2a',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 16px',
            flexShrink: 0
          }}
        >
          <span style={{ fontSize: 12, color: '#666', minWidth: 136, flexShrink: 0 }}>
            {formattedDate}
          </span>
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round(progress * 1000)}
            onChange={(e) => {
              setProgress(Number(e.target.value) / 1000)
              setIsPlaying(false)
            }}
            style={{ flex: 1, accentColor: '#7c6af7', cursor: 'pointer', height: 4 }}
          />
          <button
            onClick={() => {
              if (progress >= 1) setProgress(0)
              setIsPlaying((p) => !p)
            }}
            style={{
              background: '#7c6af7',
              border: 'none',
              borderRadius: 6,
              color: '#fff',
              padding: '5px 14px',
              cursor: 'pointer',
              fontSize: 15,
              flexShrink: 0
            }}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <select
            value={playDuration}
            onChange={(e) => setPlayDuration(Number(e.target.value))}
            style={{
              background: '#1e1e1e',
              border: '1px solid #3a3a3a',
              color: '#aaa',
              borderRadius: 4,
              padding: '4px 6px',
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            <option value={10000}>10s</option>
            <option value={20000}>20s</option>
            <option value={40000}>40s</option>
            <option value={60000}>60s</option>
          </select>
          {isRecording ? (
            <button
              onClick={stopRecording}
              style={{
                background: '#c62828',
                border: 'none',
                borderRadius: 6,
                color: '#fff',
                padding: '5px 14px',
                cursor: 'pointer',
                fontSize: 13,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#fff',
                  display: 'inline-block'
                }}
              />
              Stop
            </button>
          ) : (
            <button
              onClick={startRecording}
              title="Record graph animation as WebM video"
              style={{
                background: '#1e1e1e',
                border: '1px solid #3a3a3a',
                borderRadius: 6,
                color: '#ccc',
                padding: '5px 14px',
                cursor: 'pointer',
                fontSize: 13,
                flexShrink: 0
              }}
            >
              ⏺ Record
            </button>
          )}
        </div>
      )}

      {hoveredNode && (
        <div
          style={{
            position: 'absolute',
            left: (() => {
              const xOffset = hoveredNode.x + 15
              const containerWidth = containerRef.current?.clientWidth ?? 800
              return xOffset + 250 > containerWidth ? hoveredNode.x - 265 : xOffset
            })(),
            top: (() => {
              const yOffset = hoveredNode.y + 15
              const containerHeight = containerRef.current?.clientHeight ?? 600
              return yOffset + 150 > containerHeight ? hoveredNode.y - 165 : yOffset
            })(),
            pointerEvents: 'none',
            zIndex: 1000,
            width: 250,
            background: 'rgba(25, 25, 35, 0.85)',
            backdropFilter: 'blur(12px)',
            borderRadius: 8,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: 12,
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            fontFamily: 'Inter, sans-serif'
          }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: 12,
              color: '#fff',
              marginBottom: 6,
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              paddingBottom: 4
            }}
          >
            {hoveredNode.name}
          </div>
          <div
            style={{
              fontSize: 11,
              color: '#aaa',
              lineHeight: '1.4em',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {hoverPreviewContent}
          </div>
        </div>
      )}
    </div>
  )
}
