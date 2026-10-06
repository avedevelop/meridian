import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import type { VaultFile } from '@shared/types'
import { useVaultBridge } from '../../hooks/useVaultBridge'
import type { GNode, GLink, D3State, GraphBuildResult } from './graphTypes'
import { useSettingsStore } from '../../store/useSettingsStore'
import { nodeR } from './graphLayout'
import { useGraphVisibility } from './simulation/useGraphVisibility'
import { createD3Simulation } from './simulation/createD3Simulation'
import { shouldShowLabel } from './graphLabelHelpers'
import type { ForceShape } from './graphForces'
import type { GroupMode } from './graphGroups'
import { applyForces } from './simulation/applyForces'
import { resizeGraph } from './simulation/resizeGraph'
import { fitView } from './simulation/fitView'

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
  shape: ForceShape
  showArrows: boolean
  textSize: number
  linkThickness: number
  viewMode: 'live' | 'history'
  progress: number
  birthtimes: Map<string, number>
  minTime: number
  maxTime: number
  onFileOpen?: () => void
  labelMode: 'auto' | 'hover' | 'all'
  showGlow: boolean
  groupMode: GroupMode
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
  shape,
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
  showGlow,
  groupMode
}: UseGraphSimulationOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const d3Ref = useRef<D3State | null>(null)
  const zoomBehaviorRef = useRef<any>(null)

  const { openFile } = useVaultBridge()

  const graphMaxNodes = useSettingsStore((s) => s.graphMaxNodes)
  const [buildResult, setBuildResult] = useState<GraphBuildResult | null>(null)

  const [isPhysicsRunning, setIsPhysicsRunning] = useState(true)
  const isPhysicsRunningRef = useRef(isPhysicsRunning)

  useEffect(() => {
    isPhysicsRunningRef.current = isPhysicsRunning
  }, [isPhysicsRunning])

  // Get visibility, filtering, and hover preview helpers
  const {
    applyFiltersAndVisibility,
    handleMouseOver,
    handleMouseOut,
    hoveredNode,
    hoverPreviewContent
  } = useGraphVisibility(d3Ref, containerRef, {
    searchQuery,
    minTime,
    maxTime,
    progress,
    viewMode,
    birthtimes,
    disabledCategories,
    linkThickness,
    textSize,
    labelMode
  })

  // Mutable refs to prevent stale closures in d3 event handlers
  const handleMouseOverRef = useRef(handleMouseOver)
  const handleMouseOutRef = useRef(handleMouseOut)

  useEffect(() => {
    handleMouseOverRef.current = handleMouseOver
    handleMouseOutRef.current = handleMouseOut
  }, [handleMouseOver, handleMouseOut])

  // Effect: Update forces. Presets change more than the two sliders (see graphForces.ts).
  useEffect(() => {
    const state = d3Ref.current
    if (!state) return
    const { sim } = state
    applyForces(sim, {
      linkDistance,
      repulsionStrength,
      shape,
      textSize,
      linkDamp: state.groups.linkDamp
    })

    // A paused graph keeps its layout; the new forces apply when physics is resumed.
    if (isPhysicsRunningRef.current) sim.alpha(0.5).restart()
  }, [linkDistance, repulsionStrength, shape, textSize])

  // Effect: colour and gather by folder (or back), keeping the layout. The simulation is reheated so
  // the folders can move together; a paused graph only recolours.
  useEffect(() => {
    const state = d3Ref.current
    if (!state || state.groups.getMode() === groupMode) return
    state.groups.setMode(groupMode)
    if (isPhysicsRunningRef.current) state.sim.alpha(0.6).restart()
    // The islands move apart (or back); once they have settled, bring them all into view.
    const timer = setTimeout(() => {
      const s = d3Ref.current
      if (s && zoomBehaviorRef.current) fitView(s, zoomBehaviorRef.current)
    }, 1500)
    return () => clearTimeout(timer)
  }, [groupMode])

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

  // Effect: Update Label Mode dynamically
  useEffect(() => {
    const state = d3Ref.current
    if (!state) return

    state.svgEl.setAttribute('data-label-mode', labelMode)

    const zoomK = state.svgEl ? d3.zoomTransform(state.svgEl).k : 1.0
    state.nodeG
      .selectAll('text')
      .transition()
      .duration(150)
      .attr('opacity', function (this: any, d: any) {
        const parent = this?.parentNode
        const isHovered = parent ? d3.select(parent).classed('is-hovered') : false
        return shouldShowLabel(labelMode, zoomK, d.degree, isHovered) ? 1 : 0
      })
  }, [labelMode])

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
      const res = createD3Simulation({
        el,
        files,
        outlinks,
        disabledCategories,
        strictFilter,
        debouncedSearchQuery,
        linkDistance,
        repulsionStrength,
        shape,
        textSize,
        showArrows,
        openFile,
        onFileOpen,
        handleMouseOver: (gEl, d, event) => handleMouseOverRef.current(gEl, d, event),
        handleMouseOut: (gEl, d) => handleMouseOutRef.current(gEl, d),
        maxNodes: graphMaxNodes,
        labelMode,
        showGlow,
        groupMode
      })

      if (!res) return
      d3Ref.current = res.state
      zoomBehaviorRef.current = res.zoom
      sim = res.state.sim
      setBuildResult(res.buildResult)

      applyFiltersAndVisibility()
      if (!isPhysicsRunningRef.current) {
        sim.stop()
      }
    }

    const resize = () => {
      const state = d3Ref.current
      if (!state) return build()
      if (resizeGraph(state, el.clientWidth, el.clientHeight) && isPhysicsRunningRef.current) {
        state.sim.alpha(Math.max(state.sim.alpha(), 0.1)).restart()
      }
    }

    const ro = new ResizeObserver(resize)
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
    onFileOpen,
    graphMaxNodes,
    showGlow
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
    hoverPreviewContent,
    buildResult
  }
}
