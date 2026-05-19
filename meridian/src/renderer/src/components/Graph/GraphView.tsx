import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
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
  return files.flatMap(f => f.children ? [f, ...flattenFiles(f.children)] : [f])
}

const nodeR = (d: GNode) => d.degree > 0 ? 7 + Math.min(d.degree * 2, 10) : 5
const nodeColor = (d: GNode) => d.degree > 0 ? '#7c6af7' : '#3a3560'
const labelColor = (d: GNode) => d.degree > 0 ? '#bbb' : '#555'

export function GraphView({ onFileOpen }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const d3Ref = useRef<D3State | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const progressRef = useRef(1)
  const visibleNodesRef = useRef<Set<string>>(new Set())

  const files = useVaultStore(s => s.files)
  const outlinks = useLinkStore(s => s.outlinks)
  const indexVersion = useLinkStore(s => s.indexVersion)
  const { openFile } = useVaultBridge()

  const [viewMode, setViewMode] = useState<'live' | 'history'>('live')
  const [progress, setProgress] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playDuration, setPlayDuration] = useState(20000)
  const [isRecording, setIsRecording] = useState(false)

  progressRef.current = progress
  const viewModeRef = useRef(viewMode)
  viewModeRef.current = viewMode

  const { birthtimes, minTime, maxTime } = useMemo(() => {
    const bt = new Map<string, number>()
    flattenFiles(files).forEach(f => { if (!f.isDirectory) bt.set(f.path, f.birthtime ?? f.mtime) })
    const times = Array.from(bt.values())
    const min = times.length > 0 ? Math.min(...times) : Date.now() - 86_400_000
    const max = times.length > 0 ? Math.max(...times) : Date.now()
    const finalMax = max === min ? min + 3600000 : max
    return {
      birthtimes: bt,
      minTime: min,
      maxTime: finalMax,
    }
  }, [files])

  const currentTimestamp = minTime + (maxTime - minTime) * progress

  const formattedDate = new Date(currentTimestamp).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const updateVisibility = useCallback((prog: number, mode: 'live' | 'history') => {
    const state = d3Ref.current
    if (!state) return

    if (mode === 'live') {
      state.nodeG.each(function(d) {
        const group = d3.select(this)
        group.transition().duration(300).attr('opacity', 1).style('pointer-events', 'auto')
        group.select('circle.vis').transition().duration(300).attr('r', nodeR(d))
        group.select('text').transition().duration(300).attr('opacity', 1)
      })

      state.linkSel.each(function() {
        d3.select(this).transition().duration(300)
          .attr('opacity', 0.6)
          .attr('stroke-width', 1)
      })

      state.dateLabel.text('')
      return
    }

    const ts = minTime + (maxTime - minTime) * prog
    let reheated = false
    const visibleNodes = new Set<string>()

    state.nodeG.each(function(d) {
      const birth = birthtimes.get(d.id)
      const visible = birth !== undefined && birth <= ts
      if (visible) {
        visibleNodes.add(d.id)
      }
    })

    state.nodeG.each(function(d) {
      const birth = birthtimes.get(d.id)
      const visible = birth !== undefined && birth <= ts
      const group = d3.select(this)
      const circle = group.select('circle.vis')
      const text = group.select('text')

      const wasHidden = !visibleNodesRef.current.has(d.id)

      if (visible) {
        if (wasHidden) {
          const neighbors = state.links.filter(l => 
            (typeof l.source === 'object' ? l.source.id : l.source) === d.id ||
            (typeof l.target === 'object' ? l.target.id : l.target) === d.id
          )
          
          let parentNode: GNode | null = null
          for (const l of neighbors) {
            const otherId = (typeof l.source === 'object' ? l.source.id : l.source) === d.id
              ? (typeof l.target === 'object' ? l.target.id : l.target)
              : (typeof l.source === 'object' ? l.source.id : l.source)
            
            if (visibleNodes.has(otherId)) {
              const foundNode = state.nodes.find(n => n.id === otherId)
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

        circle.transition()
          .duration(800)
          .ease(d3.easeBackOut)
          .attr('r', nodeR(d))
        
        text.transition()
          .duration(150)
          .attr('opacity', 1)

        group.transition()
          .duration(100)
          .attr('opacity', 1)
          .style('pointer-events', 'auto')
      } else {
        circle.transition()
          .duration(200)
          .attr('r', 0)

        text.transition()
          .duration(150)
          .attr('opacity', 0)

        group.transition()
          .duration(200)
          .attr('opacity', 0)
          .style('pointer-events', 'none')
      }
    })

    state.linkSel.each(function(d) {
      const sb = birthtimes.get((d.source as GNode).id)
      const tb = birthtimes.get((d.target as GNode).id)
      const visible = sb !== undefined && tb !== undefined && sb <= ts && tb <= ts
      d3.select(this).transition().duration(visible ? 250 : 150)
        .attr('opacity', visible ? 0.6 : 0)
        .attr('stroke-width', visible ? 1 : 0)
    })

    visibleNodesRef.current = visibleNodes

    if (reheated) {
      state.sim.alpha(0.3).restart()
    }

    state.dateLabel.text(
      new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    )
  }, [birthtimes, minTime, maxTime])

  useEffect(() => {
    updateVisibility(progress, viewMode)
  }, [progress, viewMode, updateVisibility])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let sim: d3.Simulation<GNode, GLink> | null = null

    const build = () => {
      el.innerHTML = ''
      const width = el.clientWidth
      const height = el.clientHeight
      if (!width || !height) return

      const allMd = flattenFiles(files)
        .filter(f => !f.isDirectory && f.name.endsWith('.md'))
        .map(f => f.path)
        .slice(0, 400)
      const liveSet = new Set(allMd)
      const degree: Record<string, number> = {}
      const edgeSet = new Set<string>()
      const links: GLink[] = []

      for (const file of allMd) {
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

      const nodes: GNode[] = allMd.map(f => ({
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
        .style('cursor', 'grab').style('display', 'block')

      const defs = svg.append('defs')
      const filter = defs.append('filter').attr('id', 'glow')
      filter.append('feGaussianBlur').attr('stdDeviation', 3).attr('result', 'coloredBlur')
      const merge = filter.append('feMerge')
      merge.append('feMergeNode').attr('in', 'coloredBlur')
      merge.append('feMergeNode').attr('in', 'SourceGraphic')
      const pattern = defs.append('pattern')
        .attr('id', 'dotgrid').attr('width', 28).attr('height', 28).attr('patternUnits', 'userSpaceOnUse')
      pattern.append('circle').attr('cx', 14).attr('cy', 14).attr('r', 0.6).attr('fill', '#1e1e2a')

      svg.append('rect').attr('width', width).attr('height', height).attr('fill', '#161616')
      svg.append('rect').attr('width', width).attr('height', height).attr('fill', 'url(#dotgrid)')

      const root = svg.append('g')

      svg.call(
        d3.zoom<SVGSVGElement, unknown>()
          .scaleExtent([0.1, 5])
          .on('zoom', ({ transform }) => root.attr('transform', transform.toString()))
          .on('start', () => svg.style('cursor', 'grabbing'))
          .on('end', () => svg.style('cursor', 'grab'))
      )

      const linkSel = root.append('g').selectAll<SVGLineElement, GLink>('line')
        .data(links).join('line')
        .attr('stroke', '#4a4080').attr('stroke-width', 0).attr('opacity', 0)

      const nodeG = root.append('g').selectAll<SVGGElement, GNode>('g')
        .data(nodes).join('g')
        .attr('opacity', 0)
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
          if (event.defaultPrevented) return
          openFile(d.id, d.name + '.md')
          onFileOpen?.()
        })
        .on('mouseover', function(_e, d) {
          d3.select(this).select('circle.vis').attr('fill', '#a89df7').attr('r', nodeR(d) + 3)
            .style('filter', 'url(#glow)')
          d3.select(this).select('text').attr('fill', '#fff').attr('font-size', 13)
        })
        .on('mouseout', function(_e, d) {
          d3.select(this).select('circle.vis').attr('fill', nodeColor(d)).attr('r', nodeR(d))
            .style('filter', null)
          d3.select(this).select('text').attr('fill', labelColor(d)).attr('font-size', 11)
        })
        .call(
          d3.drag<SVGGElement, GNode>()
            .on('start', (event, d) => { if (!event.active) sim!.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
            .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
            .on('end', (event, d) => { if (!event.active) sim!.alphaTarget(0); d.fx = null; d.fy = null })
        )

      nodeG.append('circle').attr('r', d => Math.max(nodeR(d) + 10, 16)).attr('fill', 'transparent')
      nodeG.append('circle').attr('class', 'vis')
        .attr('r', 0).attr('fill', d => nodeColor(d))
        .attr('stroke', d => d.degree > 0 ? '#6a5af7' : '#444').attr('stroke-width', 1.5)
      nodeG.append('text').text(d => d.name)
        .attr('font-size', 11).attr('font-family', '-apple-system, sans-serif')
        .attr('fill', d => labelColor(d)).attr('text-anchor', 'middle')
        .attr('dy', d => nodeR(d) + 13)
        .attr('opacity', 0)
        .style('pointer-events', 'none').style('user-select', 'none')

      const dateLabel = svg.append('text')
        .attr('x', width - 16).attr('y', height - 16)
        .attr('text-anchor', 'end').attr('font-size', 13)
        .attr('font-family', '-apple-system, sans-serif')
        .attr('fill', 'rgba(255,255,255,0.35)')

      sim.on('tick', () => {
        linkSel
          .attr('x1', d => (d.source as GNode).x!)
          .attr('y1', d => (d.source as GNode).y!)
          .attr('x2', d => (d.target as GNode).x!)
          .attr('y2', d => (d.target as GNode).y!)
        nodeG.attr('transform', d => `translate(${d.x},${d.y})`)
      })

      d3Ref.current = { sim, nodeG, linkSel, dateLabel, svgEl: svg.node()!, nodes, links, width, height }
      updateVisibility(progressRef.current, viewModeRef.current)
    }

    const ro = new ResizeObserver(build)
    ro.observe(el)
    build()

    return () => { ro.disconnect(); sim?.stop(); el.innerHTML = ''; d3Ref.current = null }
  }, [files, outlinks, openFile, indexVersion])

  useEffect(() => {
    if (!isPlaying) return
    const startTime = performance.now()
    const startProgress = progressRef.current
    let raf: number
    const tick = (now: number) => {
      const newProgress = Math.min(startProgress + (now - startTime) / playDuration, 1)
      setProgress(newProgress)
      if (newProgress >= 1) { setIsPlaying(false); return }
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
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
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
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {/* Mode Selector */}
      <div style={{
        position: 'absolute', top: 12, right: 12,
        background: 'rgba(22, 22, 22, 0.85)',
        backdropFilter: 'blur(8px)',
        border: '1px solid #2a2a2a',
        borderRadius: 8, padding: 3, display: 'flex', gap: 4,
        zIndex: 10
      }}>
        <button
          onClick={() => handleToggleMode('live')}
          style={{
            background: viewMode === 'live' ? '#7c6af7' : 'transparent',
            border: 'none', borderRadius: 6,
            color: viewMode === 'live' ? '#fff' : '#aaa',
            padding: '6px 12px', cursor: 'pointer', fontSize: 12,
            fontWeight: 500, transition: 'all 0.2s'
          }}
        >
          Сеть
        </button>
        <button
          onClick={() => handleToggleMode('history')}
          style={{
            background: viewMode === 'history' ? '#7c6af7' : 'transparent',
            border: 'none', borderRadius: 6,
            color: viewMode === 'history' ? '#fff' : '#aaa',
            padding: '6px 12px', cursor: 'pointer', fontSize: 12,
            fontWeight: 500, transition: 'all 0.2s'
          }}
        >
          История
        </button>
      </div>

      <div ref={containerRef} style={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden' }}>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      {viewMode === 'history' && (
        <div style={{
          height: 60, background: '#111', borderTop: '1px solid #2a2a2a',
          display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, color: '#666', minWidth: 136, flexShrink: 0 }}>
            {formattedDate}
          </span>
          <input
            type="range" min={0} max={1000} value={Math.round(progress * 1000)}
            onChange={e => { setProgress(Number(e.target.value) / 1000); setIsPlaying(false) }}
            style={{ flex: 1, accentColor: '#7c6af7', cursor: 'pointer', height: 4 }}
          />
          <button
            onClick={() => { if (progress >= 1) setProgress(0); setIsPlaying(p => !p) }}
            style={{ background: '#7c6af7', border: 'none', borderRadius: 6, color: '#fff', padding: '5px 14px', cursor: 'pointer', fontSize: 15, flexShrink: 0 }}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <select
            value={playDuration}
            onChange={e => setPlayDuration(Number(e.target.value))}
            style={{ background: '#1e1e1e', border: '1px solid #3a3a3a', color: '#aaa', borderRadius: 4, padding: '4px 6px', fontSize: 12, cursor: 'pointer' }}
          >
            <option value={10000}>10s</option>
            <option value={20000}>20s</option>
            <option value={40000}>40s</option>
            <option value={60000}>60s</option>
          </select>
          {isRecording ? (
            <button onClick={stopRecording} style={{ background: '#c62828', border: 'none', borderRadius: 6, color: '#fff', padding: '5px 14px', cursor: 'pointer', fontSize: 13, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
              Stop
            </button>
          ) : (
            <button onClick={startRecording} title="Record graph animation as WebM video" style={{ background: '#1e1e1e', border: '1px solid #3a3a3a', borderRadius: 6, color: '#ccc', padding: '5px 14px', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>
              ⏺ Record
            </button>
          )}
        </div>
      )}
    </div>
  )
}
