import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import * as d3 from 'd3'
import { useLinkStore } from '../../store/useLinkStore'
import { useVaultStore } from '../../store/useVaultStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'
import type { VaultFile } from '@shared/types'
import { HistoryTimelineBar } from './HistoryTimelineBar'
import { GraphSidebar, GROUP_COLORS } from './GraphSidebar'
import { useSettingsStore, ColorGroupRule } from '../../store/useSettingsStore'

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

function getNodeColor(
  id: string,
  name: string,
  degree: number,
  colorGroups: ColorGroupRule[]
): string {
  for (const rule of colorGroups) {
    if (!rule.value.trim()) continue

    if (rule.type === 'wildcard') {
      const normPath = id.replace(/\\/g, '/');
      const normWildcard = rule.value.replace(/\\/g, '/');
      const escaped = normWildcard.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      const regex = new RegExp(escaped.startsWith('/') ? `^${escaped}` : `${escaped}`, 'i');
      if (regex.test(normPath)) {
        return rule.color;
      }
    } else if (rule.type === 'tag') {
      const tags = useLinkStore.getState().tagsForFile(id);
      const cleanRuleTag = rule.value.replace(/^#/, '').toLowerCase().trim();
      const matched = tags.some((t) => t.toLowerCase().trim() === cleanRuleTag);
      if (matched) {
        return rule.color;
      }
    } else if (rule.type === 'pattern') {
      if (name.toLowerCase().includes(rule.value.toLowerCase().trim())) {
        return rule.color;
      }
    }
  }

  return GROUP_COLORS[getNodeGroup(id, name, degree)];
}

function getNodeGlowId(
  id: string,
  name: string,
  degree: number,
  colorGroups: ColorGroupRule[]
): string {
  for (const rule of colorGroups) {
    if (!rule.value.trim()) continue

    if (rule.type === 'wildcard') {
      const normPath = id.replace(/\\/g, '/');
      const normWildcard = rule.value.replace(/\\/g, '/');
      const escaped = normWildcard.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      const regex = new RegExp(escaped.startsWith('/') ? `^${escaped}` : `${escaped}`, 'i');
      if (regex.test(normPath)) {
        return `glow-grad-rule-${rule.id}`;
      }
    } else if (rule.type === 'tag') {
      const tags = useLinkStore.getState().tagsForFile(id);
      const cleanRuleTag = rule.value.replace(/^#/, '').toLowerCase().trim();
      const matched = tags.some((t) => t.toLowerCase().trim() === cleanRuleTag);
      if (matched) {
        return `glow-grad-rule-${rule.id}`;
      }
    } else if (rule.type === 'pattern') {
      if (name.toLowerCase().includes(rule.value.toLowerCase().trim())) {
        return `glow-grad-rule-${rule.id}`;
      }
    }
  }

  return `glow-grad-${getNodeGroup(id, name, degree)}`;
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
  const modeHandlerRef = useRef<(mode: 'live' | 'history') => void>(() => {})

  const files = useVaultStore((s) => s.files)
  const outlinks = useLinkStore((s) => s.outlinks)
  const indexVersion = useLinkStore((s) => s.indexVersion)
  const { openFile } = useVaultBridge()
  const colorGroups = useSettingsStore((s) => s.colorGroups) || []

  const [viewMode, setViewMode] = useState<'live' | 'history'>('live')
  const [progress, setProgress] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playDuration, setPlayDuration] = useState(20000)
  const [isRecording, setIsRecording] = useState(false)

  // Graph View Settings State
  const [searchQuery, setSearchQuery] = useState('')
  const [linkDistance, setLinkDistance] = useState(70)
  const [repulsionStrength, setRepulsionStrength] = useState(-80)
  const [showArrows, setShowArrows] = useState(false)
  const [textSize, setTextSize] = useState(11)
  const [linkThickness, setLinkThickness] = useState(1)
  const [isSettingsOpen, setIsSettingsOpen] = useState(true)

  const [strictFilter, setStrictFilter] = useState(false)
  const [disabledCategories, setDisabledCategories] = useState<Set<string>>(new Set())
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [activeSidebarTab, setActiveSidebarTab] = useState<'filters' | 'analytics'>('filters')
  const zoomBehaviorRef = useRef<any>(null)
  const [isPhysicsRunning, setIsPhysicsRunning] = useState(true)
  const isPhysicsRunningRef = useRef(isPhysicsRunning)
  useEffect(() => {
    isPhysicsRunningRef.current = isPhysicsRunning
  }, [isPhysicsRunning])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 250)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const graphStats = useMemo(() => {
    const allFiles = flattenFiles(files)
      .filter((f) => !f.isDirectory && (f.name.endsWith('.md') || f.name.endsWith('.canvas')))
      .map((f) => f.path)

    const liveSet = new Set(allFiles)
    const degree: Record<string, number> = {}
    const edgeSet = new Set<string>()
    const linksCount: { s: string; t: string }[] = []

    for (const file of allFiles) {
      for (const target of outlinks(file)) {
        if (!liveSet.has(target)) continue
        const key = [file, target].sort().join('|')
        if (edgeSet.has(key)) continue
        edgeSet.add(key)
        linksCount.push({ s: file, t: target })
        degree[file] = (degree[file] ?? 0) + 1
        degree[target] = (degree[target] ?? 0) + 1
      }
    }

    const hubs = allFiles
      .map((path) => ({
        id: path,
        name: path.split('/').pop()?.replace(/\.(md|canvas)$/, '') ?? '',
        degree: degree[path] ?? 0
      }))
      .filter((h) => h.degree > 0)
      .sort((a, b) => b.degree - a.degree)
      .slice(0, 5)

    const totalNodes = allFiles.length
    const totalLinks = linksCount.length
    const orphans = allFiles.filter((p) => !degree[p]).length
    const density = totalNodes > 1 ? (totalLinks / (totalNodes * (totalNodes - 1) / 2)) * 100 : 0

    return {
      totalNodes,
      totalLinks,
      orphans,
      density: density.toFixed(1) + '%',
      hubs
    }
  }, [files, outlinks, indexVersion])

  const toggleCategory = (category: string) => {
    setDisabledCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const focusNode = useCallback((nodeId: string) => {
    const state = d3Ref.current
    if (!state || !zoomBehaviorRef.current) return

    const node = state.nodes.find((n) => n.id === nodeId)
    if (!node) return

    const svg = d3.select(state.svgEl)
    const scale = 1.5
    const tx = state.width / 2 - node.x! * scale
    const ty = state.height / 2 - node.y! * scale

    svg
      .transition()
      .duration(800)
      .call(
        zoomBehaviorRef.current.transform,
        d3.zoomIdentity.translate(tx, ty).scale(scale)
      )

    const nodeEl = state.nodeG.filter((d) => d.id === nodeId)
    if (nodeEl.empty()) return

    nodeEl.selectAll('circle.vis')
      .transition()
      .duration(200)
      .attr('r', nodeR(node) * 2.2)
      .transition()
      .duration(500)
      .attr('r', nodeR(node))
  }, [])

  const handleZoomIn = useCallback(() => {
    const state = d3Ref.current
    if (!state || !zoomBehaviorRef.current) return
    const svg = d3.select(state.svgEl)
    svg.transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 1.3)
  }, [])

  const handleZoomOut = useCallback(() => {
    const state = d3Ref.current
    if (!state || !zoomBehaviorRef.current) return
    const svg = d3.select(state.svgEl)
    svg.transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 1 / 1.3)
  }, [])

  const handleRecenter = useCallback(() => {
    const state = d3Ref.current
    if (!state || !zoomBehaviorRef.current || state.nodes.length === 0) return
    const svg = d3.select(state.svgEl)

    // Calculate bounding box of all nodes
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    state.nodes.forEach((n) => {
      if (n.x !== undefined && n.y !== undefined) {
        if (n.x < minX) minX = n.x
        if (n.x > maxX) maxX = n.x
        if (n.y < minY) minY = n.y
        if (n.y > maxY) maxY = n.y
      }
    })

    if (minX === Infinity) return

    const dx = maxX - minX
    const dy = maxY - minY
    const x = (minX + maxX) / 2
    const y = (minY + maxY) / 2

    const padding = 60
    const scale = Math.max(0.2, Math.min(2, 0.95 / Math.max(dx / (state.width - padding), dy / (state.height - padding))))
    const tx = state.width / 2 - x * scale
    const ty = state.height / 2 - y * scale

    svg.transition().duration(600).call(
      zoomBehaviorRef.current.transform,
      d3.zoomIdentity.translate(tx, ty).scale(scale)
    )
  }, [])

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

  const historyTicks = useMemo(() => {
    if (maxTime === minTime) return []
    const span = maxTime - minTime
    const MS_MONTH = 30 * 86400000
    const MS_YEAR = 365 * 86400000
    const count = 6
    return Array.from({ length: count + 1 }, (_, i) => {
      const frac = i / count
      const ts = minTime + span * frac
      const d = new Date(ts)
      let label: string
      if (span > MS_YEAR * 1.5) {
        label = String(d.getFullYear())
      } else if (span > MS_MONTH * 2) {
        label = d.toLocaleDateString('en-US', { month: 'short' })
      } else {
        label = String(d.getDate())
      }
      return { frac, label }
    }).filter((t, i, arr) => t.frac > 0.04 && t.frac < 0.96 && (i === 0 || t.label !== arr[i - 1].label))
  }, [minTime, maxTime])

  const activityBuckets = useMemo(() => {
    const BUCKETS = 80
    const counts = new Array<number>(BUCKETS).fill(0)
    birthtimes.forEach((ts) => {
      const frac = (ts - minTime) / (maxTime - minTime)
      const idx = Math.min(Math.floor(frac * BUCKETS), BUCKETS - 1)
      counts[idx]++
    })
    const maxCount = Math.max(...counts, 1)
    return counts.map((c) => c / maxCount)
  }, [birthtimes, minTime, maxTime])

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
    birthtimes,
    minTime,
    maxTime,
    progress,
    viewMode,
    searchQuery,
    disabledCategories,
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

      const hoverColor = getNodeColor(d.id, d.name, d.degree, colorGroups)

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
      maxTime,
      colorGroups
    ]
  )

  const handleMouseOut = useCallback(
    (gEl: SVGGElement, d: GNode) => {
      const customColor = getNodeColor(d.id, d.name, d.degree, colorGroups)

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
        .attr('fill', customColor)
        .attr('stroke', customColor)
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
    [textSize, applyFiltersAndVisibility, colorGroups]
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

      // Phase 1: Filter base paths (daily, canvas, project, strict search)
      let filteredPaths = flattenFiles(files)
        .filter((f) => !f.isDirectory && (f.name.endsWith('.md') || f.name.endsWith('.canvas')))
        .map((f) => f.path)

      filteredPaths = filteredPaths.filter((path) => {
        const name = path.split('/').pop()?.replace(/\.(md|canvas)$/, '') ?? ''

        // Daily Notes filter
        const isDaily = !!name.match(/^\d{4}-\d{2}-\d{2}$/)
        if (isDaily && disabledCategories.has('daily')) return false

        // Canvases filter
        const isCanvas = path.endsWith('.canvas')
        if (isCanvas && disabledCategories.has('canvas')) return false

        // Projects folder filter
        const isProject = path.includes('/Projects/') || path.includes('\\Projects\\')
        if (isProject && disabledCategories.has('project')) return false

        // Strict search filter
        if (strictFilter && debouncedSearchQuery) {
          const q = debouncedSearchQuery.toLowerCase().trim()
          if (!name.toLowerCase().includes(q)) return false
        }

        return true
      })

      // Phase 2: Compute degrees & links on this subset
      const liveSet = new Set(filteredPaths)
      const degree: Record<string, number> = {}
      const edgeSet = new Set<string>()
      const links: GLink[] = []

      for (const file of filteredPaths) {
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

      // Phase 3: Filter based on orphan and connected states
      filteredPaths = filteredPaths.filter((path) => {
        const deg = degree[path] ?? 0
        const isOrphan = deg === 0

        if (isOrphan && disabledCategories.has('orphan')) return false
        if (!isOrphan && disabledCategories.has('connected')) return false

        return true
      })

      // Final dataset setup (limit to 400 for performance)
      const finalPathsSet = new Set(filteredPaths.slice(0, 400))
      const finalPaths = filteredPaths.filter((p) => finalPathsSet.has(p))

      const finalLinks = links.filter(
        (l) => finalPathsSet.has(l.source as string) && finalPathsSet.has(l.target as string)
      )

      const finalDegree: Record<string, number> = {}
      finalLinks.forEach((l) => {
        const s = l.source as string
        const t = l.target as string
        finalDegree[s] = (finalDegree[s] ?? 0) + 1
        finalDegree[t] = (finalDegree[t] ?? 0) + 1
      })

      const nodes: GNode[] = finalPaths.map((f) => ({
        id: f,
        name: f.split('/').pop()?.replace(/\.(md|canvas)$/, '') ?? '',
        degree: finalDegree[f] ?? 0,
        x: width / 2 + (Math.random() - 0.5) * 100,
        y: height / 2 + (Math.random() - 0.5) * 100
      }))

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

      // Soft glow radial gradients for color groups
      colorGroups.forEach((rule) => {
        const grad = defs
          .append('radialGradient')
          .attr('id', `glow-grad-rule-${rule.id}`)
          .attr('cx', '50%')
          .attr('cy', '50%')
          .attr('r', '50%')

        grad.append('stop').attr('offset', '0%').attr('stop-color', rule.color).attr('stop-opacity', 0.7)
        grad.append('stop').attr('offset', '100%').attr('stop-color', rule.color).attr('stop-opacity', 0)
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

      // Background pulsing glow (highly performant alternative to standard shadow blur)
      nodeG
        .append('circle')
        .attr('class', 'glow-halo')
        .attr('r', (d) => nodeR(d) + 8)
        .attr('fill', (d) => `url(#${getNodeGlowId(d.id, d.name, d.degree, colorGroups)})`)
        .attr('opacity', 0)
        .style('pointer-events', 'none')
        .style('transform-origin', 'center')

      // Node circles
      nodeG
        .append('circle')
        .attr('class', 'vis')
        .attr('r', 0)
        .attr('fill', (d) => getNodeColor(d.id, d.name, d.degree, colorGroups))
        .attr('stroke', (d) => getNodeColor(d.id, d.name, d.degree, colorGroups))
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
    strictFilter ? debouncedSearchQuery : '',
    colorGroups
  ])

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

  useEffect(() => {
    if (viewMode !== 'history') return
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
      if (e.code === 'Space') {
        e.preventDefault()
        if (progress >= 1) setProgress(0)
        setIsPlaying((p) => !p)
      } else if (e.code === 'ArrowRight') {
        e.preventDefault()
        setIsPlaying(false)
        setProgress((p) => Math.min(p + 0.01, 1))
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault()
        setIsPlaying(false)
        setProgress((p) => Math.max(p - 0.01, 0))
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [viewMode, progress])

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
      // Reset so all nodes are treated as newly visible and get respawn animation
      visibleNodesRef.current = new Set()
    } else {
      setProgress(1)
      setIsPlaying(false)
      setIsSettingsOpen(false)
    }
    // Notify header about mode change
    window.dispatchEvent(new CustomEvent('graph:mode-changed', { detail: mode }))
  }
  modeHandlerRef.current = handleToggleMode

  // Listen for mode changes from the Sidebar header
  useEffect(() => {
    const handler = (e: Event) => {
      const mode = (e as CustomEvent).detail as 'live' | 'history'
      modeHandlerRef.current(mode)
    }
    window.addEventListener('graph:set-mode', handler)
    // Notify header about initial mode
    window.dispatchEvent(new CustomEvent('graph:mode-changed', { detail: viewMode }))
    return () => window.removeEventListener('graph:set-mode', handler)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
      <GraphSidebar
        isSettingsOpen={isSettingsOpen}
        setIsSettingsOpen={setIsSettingsOpen}
        activeSidebarTab={activeSidebarTab}
        setActiveSidebarTab={setActiveSidebarTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        strictFilter={strictFilter}
        setStrictFilter={setStrictFilter}
        disabledCategories={disabledCategories}
        toggleCategory={toggleCategory}
        linkDistance={linkDistance}
        setLinkDistance={setLinkDistance}
        repulsionStrength={repulsionStrength}
        setRepulsionStrength={setRepulsionStrength}
        showArrows={showArrows}
        setShowArrows={setShowArrows}
        textSize={textSize}
        setTextSize={setTextSize}
        linkThickness={linkThickness}
        setLinkThickness={setLinkThickness}
        isPhysicsRunning={isPhysicsRunning}
        graphStats={graphStats}
        focusNode={focusNode}
      />

      <div
        ref={containerRef}
        style={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden' }}
      >
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      {viewMode === 'history' && (
        <HistoryTimelineBar
          progress={progress}
          setProgress={setProgress}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          playDuration={playDuration}
          setPlayDuration={setPlayDuration}
          isRecording={isRecording}
          startRecording={startRecording}
          stopRecording={stopRecording}
          isSettingsOpen={isSettingsOpen}
          formattedDate={formattedDate}
          activityBuckets={activityBuckets}
          historyTicks={historyTicks}
        />
      )}



      {/* Floating Legend / Quick Category Filter (Bottom-Center) */}
      <div
        style={{
          position: 'absolute',
          bottom: viewMode === 'history' ? 106 : 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(20, 20, 26, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 8,
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          zIndex: 20,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          whiteSpace: 'nowrap'
        }}
      >
        <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.5, marginRight: 2 }}>
          ⬡
        </span>
        {([
          { key: 'canvas', label: 'Canvases', color: GROUP_COLORS.canvas },
          { key: 'project', label: 'Projects', color: GROUP_COLORS.project },
          { key: 'daily', label: 'Daily Notes', color: GROUP_COLORS.daily },
          { key: 'connected', label: 'Connected', color: GROUP_COLORS.connected },
          { key: 'orphan', label: 'Orphans', color: GROUP_COLORS.orphan }
        ] as const).map((cat) => {
          const isDisabled = disabledCategories.has(cat.key)
          return (
            <button
              key={cat.key}
              onClick={() => toggleCategory(cat.key)}
              style={{
                background: isDisabled ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: isDisabled ? 0.4 : 1
              }}
              onMouseEnter={(e) => {
                if (!isDisabled) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'
              }}
              onMouseLeave={(e) => {
                if (!isDisabled) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: cat.color }} />
              <span style={{ fontSize: 11, color: 'var(--text-primary)', textDecoration: isDisabled ? 'line-through' : 'none' }}>
                {cat.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Floating Navigation & Physics Controls HUD (Bottom-Right) */}
      <div
        style={{
          position: 'absolute',
          bottom: viewMode === 'history' ? 106 : 24,
          right: 24,
          background: 'rgba(20, 20, 26, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 8,
          padding: '6px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          zIndex: 20,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
        }}
      >
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            width: 28,
            height: 28,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
            e.currentTarget.style.color = 'var(--accent-color)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 'bold' }}>＋</span>
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            width: 28,
            height: 28,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
            e.currentTarget.style.color = 'var(--accent-color)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 'bold' }}>－</span>
        </button>
        <button
          onClick={handleRecenter}
          title="Recenter & Fit View"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            width: 28,
            height: 28,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
            e.currentTarget.style.color = 'var(--accent-color)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }}
        >
          <span style={{ fontSize: 14 }}>⊙</span>
        </button>
        
        <div style={{ width: 1, height: 14, background: 'rgba(255, 255, 255, 0.12)' }} />

        <button
          onClick={handleTogglePhysics}
          title={isPhysicsRunning ? "Pause Physics Simulation" : "Resume Physics Simulation"}
          style={{
            background: 'transparent',
            border: 'none',
            color: isPhysicsRunning ? 'var(--accent-color)' : 'var(--text-secondary)',
            cursor: 'pointer',
            width: 28,
            height: 28,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <span style={{ fontSize: 12 }}>{isPhysicsRunning ? '⏸' : '▶'}</span>
        </button>
      </div>

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
            background: 'rgba(20, 20, 26, 0.85)',
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
              color: 'var(--text-secondary)',
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
