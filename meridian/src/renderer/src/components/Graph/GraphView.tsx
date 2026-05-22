import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import * as d3 from 'd3'
import { useLinkStore } from '../../store/useLinkStore'
import { useVaultStore } from '../../store/useVaultStore'
import { HistoryTimelineBar } from './HistoryTimelineBar'
import { GraphSidebar, GROUP_COLORS } from './GraphSidebar'
import type { GNode, GraphViewProps } from './graphTypes'
import { flattenFiles, nodeR } from './graphLayout'
import { useGraphTimeline } from './useGraphTimeline'
import { useGraphSimulation } from './useGraphSimulation'

export function GraphView({ onFileOpen }: GraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const modeHandlerRef = useRef<(mode: 'live' | 'history') => void>(() => {})

  const files = useVaultStore((s) => s.files)
  const outlinks = useLinkStore((s) => s.outlinks)
  const indexVersion = useLinkStore((s) => s.indexVersion)

  const [viewMode, setViewMode] = useState<'live' | 'history'>('live')
  const [isRecording, setIsRecording] = useState(false)

  const {
    progress,
    setProgress,
    isPlaying,
    setIsPlaying,
    playDuration,
    setPlayDuration,
    birthtimes,
    minTime,
    maxTime,
    formattedDate,
    activityBuckets,
    historyTicks
  } = useGraphTimeline({ files, viewMode })

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

  const {
    containerRef,
    d3Ref,
    zoomBehaviorRef,
    isPhysicsRunning,
    handleTogglePhysics,
    hoveredNode,
    hoverPreviewContent
  } = useGraphSimulation({
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
  })

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

    const nodeG = state.nodeG
    if (!nodeG) return
    const nodeEl = nodeG.filter((d) => d.id === nodeId)
    if (nodeEl.empty()) return

    nodeEl.selectAll('circle.vis')
      .transition()
      .duration(200)
      .attr('r', (d) => nodeR(d as GNode) * 2.2)
      .transition()
      .duration(500)
      .attr('r', (d) => nodeR(d as GNode))
  }, [d3Ref, zoomBehaviorRef])

  const handleZoomIn = useCallback(() => {
    const state = d3Ref.current
    if (!state || !zoomBehaviorRef.current) return
    const svg = d3.select(state.svgEl)
    svg.transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 1.3)
  }, [d3Ref, zoomBehaviorRef])

  const handleZoomOut = useCallback(() => {
    const state = d3Ref.current
    if (!state || !zoomBehaviorRef.current) return
    const svg = d3.select(state.svgEl)
    svg.transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 1 / 1.3)
  }, [d3Ref, zoomBehaviorRef])

  const handleRecenter = useCallback(() => {
    const state = d3Ref.current
    if (!state || !zoomBehaviorRef.current || state.nodes.length === 0) return
    const svg = d3.select(state.svgEl)

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
  }, [d3Ref, zoomBehaviorRef])

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
