import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import * as d3 from 'd3'
import { useTranslation } from 'react-i18next'
import { useLinkStore } from '../../store/useLinkStore'
import { useVaultStore } from '../../store/useVaultStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { GraphSidebar } from './GraphSidebar'
import type { GNode, GraphViewProps } from './graphTypes'
import { nodeR, calculateGraphStats } from './graphLayout'
import { useGraphTimeline } from './useGraphTimeline'
import { useGraphSimulation } from './useGraphSimulation'
import { useGraphRecording } from './useGraphRecording'
import { GraphControls } from './GraphControls'
import {
  bannerStyle,
  bannerButtonStyle,
  openFiltersButtonStyle,
  tooltipStyleBase,
  hintBannerStyle
} from './graphStyles'

export function GraphView({ onFileOpen }: GraphViewProps) {
  const { t } = useTranslation()
  const graphMaxNodes = useSettingsStore((s) => s.graphMaxNodes)
  const updateSetting = useSettingsStore((s) => s.updateSetting)

  const modeHandlerRef = useRef<(mode: 'live' | 'history') => void>(() => {})

  const files = useVaultStore((s) => s.files)
  const outlinks = useLinkStore((s) => s.outlinks)
  const indexVersion = useLinkStore((s) => s.indexVersion)

  const [viewMode, setViewMode] = useState<'live' | 'history'>('live')

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
  const [linkDistance, setLinkDistance] = useState(100)
  const [repulsionStrength, setRepulsionStrength] = useState(-160)
  const [showArrows, setShowArrows] = useState(false)
  const [textSize, setTextSize] = useState(11)
  const [linkThickness, setLinkThickness] = useState(0.8)
  const [isSettingsOpen, setIsSettingsOpen] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 1200 : true
  })
  const [labelMode, setLabelMode] = useState<'auto' | 'hover' | 'all'>(() => {
    return (localStorage.getItem('meridian:graph-label-mode') as any) || 'auto'
  })

  useEffect(() => localStorage.setItem('meridian:graph-label-mode', labelMode), [labelMode])

  const [showGlow, setShowGlow] = useState<boolean>(() => {
    return localStorage.getItem('meridian:graph-show-glow') === 'true'
  })

  useEffect(() => localStorage.setItem('meridian:graph-show-glow', String(showGlow)), [showGlow])

  const [showLodHint, setShowLodHint] = useState(false)
  useEffect(() => {
    if (labelMode === 'auto' && !sessionStorage.getItem('meridian:graph-lod-hint')) setShowLodHint(true)
  }, [labelMode])

  const dismissHint = useCallback(() => {
    sessionStorage.setItem('meridian:graph-lod-hint', 'true'); setShowLodHint(false)
  }, [])

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
    hoverPreviewContent,
    buildResult
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
    onFileOpen,
    labelMode,
    showGlow
  })

  const { canvasRef, isRecording, startRecording, stopRecording, cancelRecording } =
    useGraphRecording({
      d3Ref,
      containerRef,
      progress,
      isPlaying,
      setIsPlaying,
      setProgress
    })

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 250)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleIncreaseLimit = useCallback(() => {
    const nextLimit = graphMaxNodes === 400 ? 800 : graphMaxNodes === 800 ? 0 : 400
    updateSetting('graphMaxNodes', nextLimit)
  }, [graphMaxNodes, updateSetting])

  const handleOpenFilters = useCallback(() => {
    setIsSettingsOpen(true); setActiveSidebarTab('filters')
  }, [])

  useEffect(() => {
    if (
      buildResult &&
      graphMaxNodes === 0 &&
      buildResult.totalEligible > 600 &&
      !sessionStorage.getItem('meridian:graph-slow-confirmed')
    ) {
      const confirmed = window.confirm(
        t('graph.truncation.slowWarning', { count: buildResult.totalEligible })
      )
      if (confirmed) {
        sessionStorage.setItem('meridian:graph-slow-confirmed', 'true')
      } else {
        updateSetting('graphMaxNodes', 400)
      }
    }
  }, [buildResult, graphMaxNodes, updateSetting, t])

  const graphStats = useMemo(() => {
    return calculateGraphStats(files, outlinks)
  }, [files, outlinks, indexVersion])

  const toggleCategory = (category: string) => {
    setDisabledCategories((prev) => {
      const next = new Set(prev)
      next.has(category) ? next.delete(category) : next.add(category)
      return next
    })
  }

  const focusNode = useCallback(
    (nodeId: string) => {
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
        .call(zoomBehaviorRef.current.transform, d3.zoomIdentity.translate(tx, ty).scale(scale))

      const nodeG = state.nodeG
      if (!nodeG) return
      const nodeEl = nodeG.filter((d) => d.id === nodeId)
      if (nodeEl.empty()) return

      nodeEl
        .selectAll('circle.vis')
        .transition()
        .duration(200)
        .attr('r', (d) => nodeR(d as GNode) * 2.2)
        .transition()
        .duration(500)
        .attr('r', (d) => nodeR(d as GNode))
    },
    [d3Ref, zoomBehaviorRef]
  )

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
    svg
      .transition()
      .duration(250)
      .call(zoomBehaviorRef.current.scaleBy, 1 / 1.3)
  }, [d3Ref, zoomBehaviorRef])

  const handleRecenter = useCallback(() => {
    const state = d3Ref.current
    if (!state || !zoomBehaviorRef.current || state.nodes.length === 0) return
    const svg = d3.select(state.svgEl)

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity
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
    const scale = Math.max(
      0.2,
      Math.min(2, 0.95 / Math.max(dx / (state.width - padding), dy / (state.height - padding)))
    )
    const tx = state.width / 2 - x * scale
    const ty = state.height / 2 - y * scale

    svg
      .transition()
      .duration(600)
      .call(zoomBehaviorRef.current.transform, d3.zoomIdentity.translate(tx, ty).scale(scale))
  }, [d3Ref, zoomBehaviorRef])

  const handleResetView = useCallback(() => {
    setSearchQuery('')
    setLinkDistance(100)
    setRepulsionStrength(-160)
    setShowArrows(false)
    setTextSize(11)
    setLinkThickness(0.8)
    setLabelMode('auto')
    setShowGlow(false)
    setStrictFilter(false)
    setDisabledCategories(new Set())

    const state = d3Ref.current
    if (state) {
      state.sim.alpha(1).restart()
    }

    if (state && zoomBehaviorRef.current) {
      const svg = d3.select(state.svgEl)
      svg
        .transition()
        .duration(600)
        .call(zoomBehaviorRef.current.transform, d3.zoomIdentity)
    }
  }, [d3Ref, zoomBehaviorRef])

  const handleToggleMode = (mode: 'live' | 'history') => {
    setViewMode(mode)
    if (mode === 'live') {
      setIsPlaying(false)
      cancelRecording()
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
        labelMode={labelMode}
        setLabelMode={setLabelMode}
        showGlow={showGlow}
        setShowGlow={setShowGlow}
        handleResetView={handleResetView}
      />

      <div
        ref={containerRef}
        style={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden' }}
      >
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {buildResult?.truncated && (
          <div style={bannerStyle}>
            <span>
              {t('graph.truncation.banner', {
                displayed: buildResult.displayedCount,
                total: buildResult.totalEligible
              })}
            </span>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handleIncreaseLimit}
                style={bannerButtonStyle}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')
                }
              >
                {t('graph.truncation.increaseLimit')}
              </button>
              <button
                onClick={handleOpenFilters}
                style={openFiltersButtonStyle}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                {t('graph.truncation.openFilters')}
              </button>
            </div>
          </div>
        )}

        {showLodHint && (
          <div style={hintBannerStyle}>
            <span>{t('graph.lodHint')}</span>
            <button
              onClick={dismissHint}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#aaa',
                cursor: 'pointer',
                fontSize: 14,
                padding: '0 4px',
                lineHeight: 1
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#aaa')}
            >
              ×
            </button>
          </div>
        )}
      </div>

      <GraphControls
        viewMode={viewMode}
        isPhysicsRunning={isPhysicsRunning}
        handleTogglePhysics={handleTogglePhysics}
        handleZoomIn={handleZoomIn}
        handleZoomOut={handleZoomOut}
        handleRecenter={handleRecenter}
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

      {hoveredNode && (
        <div
          style={{
            ...tooltipStyleBase,
            left: (() => {
              const xOffset = hoveredNode.x + 15
              const containerWidth = containerRef.current?.clientWidth ?? 800
              return xOffset + 250 > containerWidth ? hoveredNode.x - 265 : xOffset
            })(),
            top: (() => {
              const yOffset = hoveredNode.y + 15
              const containerHeight = containerRef.current?.clientHeight ?? 600
              return yOffset + 150 > containerHeight ? hoveredNode.y - 165 : yOffset
            })()
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
