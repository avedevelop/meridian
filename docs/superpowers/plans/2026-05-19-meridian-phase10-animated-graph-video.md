# Meridian Phase 10: Animated Graph + Video Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a timeline-scrubbing animated graph that shows vault growth over time (based on file creation timestamps) and lets the user record and export the animation as a `.webm` video.

**Architecture:** `VaultFile` gains a `birthtime` field (from `fs.stat().birthtimeMs`) so every node in the graph knows when it was created. The `GraphView` is refactored to keep the full D3 force simulation running at all times but control node/link opacity based on a `progress` slider (0 = oldest file, 1 = now). A `requestAnimationFrame` loop drives auto-play. Video export uses an offscreen `<canvas>` that captures SVG frames via `XMLSerializer` → `Image` → `ctx.drawImage`, fed to `MediaRecorder`; the resulting WebM blob is saved via a new `vault:save-video` IPC that opens a native save dialog.

**Tech Stack:** D3 v7, Web APIs (`requestAnimationFrame`, `MediaRecorder`, `HTMLCanvasElement.captureStream`), Node.js `fs.stat().birthtimeMs`, Electron `dialog.showSaveDialog`.

---

## File Structure

```
Modified:
  meridian/src/shared/types.ts                              — add birthtime to VaultFile + VAULT_SAVE_VIDEO IPC
  meridian/src/main/vault.ts                                — populate birthtime in listFiles + getFile
  meridian/src/main/ipc.ts                                  — save-video handler (dialog + writeFile)
  meridian/src/preload/index.ts                             — expose saveVideo
  meridian/src/renderer/src/hooks/useVaultBridge.ts         — add saveVideo to Window.vault type
  meridian/src/renderer/src/components/Graph/GraphView.tsx  — full refactor: timeline controls + recording
```

---

## Task 1: birthtime in VaultFile + save-video IPC

**Files:**
- Modify: `meridian/src/shared/types.ts`
- Modify: `meridian/src/main/vault.ts`
- Modify: `meridian/src/main/ipc.ts`
- Modify: `meridian/src/preload/index.ts`
- Modify: `meridian/src/renderer/src/hooks/useVaultBridge.ts`

No unit tests — these are pure plumbing changes. Verified by typecheck.

- [ ] **Step 1: Add birthtime to VaultFile + VAULT_SAVE_VIDEO constant**

Read `meridian/src/shared/types.ts`.

In `VaultFile`, add after `mtime: number`:
```typescript
  birthtime: number    // file creation timestamp (ms)
```

In `IPC`, add after `MENU_ACTION`:
```typescript
  VAULT_SAVE_VIDEO: 'vault:save-video',
```

- [ ] **Step 2: Populate birthtime in vault.ts**

Read `meridian/src/main/vault.ts`.

In `listFiles`, find the `file` object construction:
```typescript
      const file: VaultFile = {
        name: entry,
        path: fullPath,
        relativePath: relative(this.vaultPath, fullPath),
        isDirectory,
        mtime: info.mtimeMs,
      }
```
Add `birthtime` field:
```typescript
      const file: VaultFile = {
        name: entry,
        path: fullPath,
        relativePath: relative(this.vaultPath, fullPath),
        isDirectory,
        mtime: info.mtimeMs,
        birthtime: info.birthtimeMs,
      }
```

In `getFile`, find the similar object construction and add the same `birthtime: info.birthtimeMs` field.

- [ ] **Step 3: Add save-video IPC handler in ipc.ts**

Read `meridian/src/main/ipc.ts`.

Add `writeFile` to the existing `fs/promises` dynamic import pattern — check if it's already available. The handler uses `dialog.showSaveDialog` (already imported) and `writeFile` from `fs/promises`.

Add after the last `ipcMain.handle` block:

```typescript
  ipcMain.handle(IPC.VAULT_SAVE_VIDEO, async (_event, data: Uint8Array) => {
    const { filePath } = await dialog.showSaveDialog({
      title: 'Export Graph Animation',
      defaultPath: 'meridian-graph.webm',
      filters: [{ name: 'WebM Video', extensions: ['webm'] }],
    })
    if (!filePath) return null
    const { writeFile } = await import('fs/promises')
    await writeFile(filePath, data)
    return filePath
  })
```

- [ ] **Step 4: Expose saveVideo in preload**

Read `meridian/src/preload/index.ts`.

Add to `vaultAPI` after `revealFile`:
```typescript
  saveVideo: (data: Uint8Array): Promise<string | null> =>
    ipcRenderer.invoke(IPC.VAULT_SAVE_VIDEO, data),
```

- [ ] **Step 5: Add saveVideo to Window.vault type in useVaultBridge.ts**

Read `meridian/src/renderer/src/hooks/useVaultBridge.ts`.

In the `Window` interface declaration (inside the `declare global` block), add after `revealFile`:
```typescript
      saveVideo: (data: Uint8Array) => Promise<string | null>
```

- [ ] **Step 6: Typecheck and commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm run typecheck 2>&1 | grep -v node_modules | grep "error TS" | head -20
```

Fix any errors. Then:

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && git add src/shared/types.ts src/main/vault.ts src/main/ipc.ts src/preload/index.ts src/renderer/src/hooks/useVaultBridge.ts && git commit -m "feat: add birthtime to VaultFile + vault:save-video IPC"
```

---

## Task 2: Animated GraphView with Timeline + Video Recording

**Files:**
- Modify: `meridian/src/renderer/src/components/Graph/GraphView.tsx`

This is a full rewrite of `GraphView.tsx`. Read the current file first. The new version:
- Keeps the same D3 force simulation and all existing interactions (zoom, drag, click-to-open)
- Adds `birthtime`-based opacity control (all nodes built upfront, visibility controlled by `progress`)
- Adds timeline controls bar at the bottom (slider, play/pause, speed selector, record button)
- Adds canvas-based `MediaRecorder` video export
- Adds date overlay in the SVG (visible in exported video)
- Adds a subtle dot-grid background pattern (visual polish for the video)

- [ ] **Step 1: Write the new GraphView.tsx**

Read `meridian/src/renderer/src/components/Graph/GraphView.tsx` to understand current structure.

Replace the entire file with:

```typescript
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

  const files = useVaultStore(s => s.files)
  const outlinks = useLinkStore(s => s.outlinks)
  const indexVersion = useLinkStore(s => s.indexVersion)
  const { openFile } = useVaultBridge()

  const [progress, setProgress] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playDuration, setPlayDuration] = useState(20000)
  const [isRecording, setIsRecording] = useState(false)

  progressRef.current = progress

  const { birthtimes, minTime, maxTime } = useMemo(() => {
    const bt = new Map<string, number>()
    flattenFiles(files).forEach(f => { if (!f.isDirectory) bt.set(f.path, f.birthtime ?? f.mtime) })
    const times = Array.from(bt.values())
    return {
      birthtimes: bt,
      minTime: times.length > 0 ? Math.min(...times) : Date.now() - 86_400_000,
      maxTime: Date.now(),
    }
  }, [files])

  const currentTimestamp = minTime + (maxTime - minTime) * progress

  const formattedDate = new Date(currentTimestamp).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const updateVisibility = useCallback((prog: number) => {
    const state = d3Ref.current
    if (!state) return
    const ts = minTime + (maxTime - minTime) * prog

    state.nodeG.each(function(d) {
      const birth = birthtimes.get(d.id)
      const visible = birth !== undefined && birth <= ts
      d3.select(this)
        .transition().duration(visible ? 500 : 150)
        .attr('opacity', visible ? 1 : 0)
        .style('pointer-events', visible ? 'auto' : 'none')
    })

    state.linkSel.each(function(d) {
      const sb = birthtimes.get((d.source as GNode).id)
      const tb = birthtimes.get((d.target as GNode).id)
      const visible = sb !== undefined && tb !== undefined && sb <= ts && tb <= ts
      d3.select(this).transition().duration(300).attr('opacity', visible ? 0.6 : 0)
    })

    state.dateLabel.text(
      new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    )
  }, [birthtimes, minTime, maxTime])

  useEffect(() => { updateVisibility(progress) }, [progress, updateVisibility])

  // Build D3 graph
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
      // Glow filter
      const filter = defs.append('filter').attr('id', 'glow')
      filter.append('feGaussianBlur').attr('stdDeviation', 3).attr('result', 'coloredBlur')
      const merge = filter.append('feMerge')
      merge.append('feMergeNode').attr('in', 'coloredBlur')
      merge.append('feMergeNode').attr('in', 'SourceGraphic')
      // Dot grid pattern (visual polish)
      const pattern = defs.append('pattern')
        .attr('id', 'dotgrid').attr('width', 28).attr('height', 28).attr('patternUnits', 'userSpaceOnUse')
      pattern.append('circle').attr('cx', 14).attr('cy', 14).attr('r', 0.6).attr('fill', '#1e1e2a')

      // Background with dot grid
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
        .attr('stroke', '#4a4080').attr('stroke-width', 1).attr('opacity', 0)

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
        .attr('r', d => nodeR(d)).attr('fill', d => nodeColor(d))
        .attr('stroke', d => d.degree > 0 ? '#6a5af7' : '#444').attr('stroke-width', 1.5)
      nodeG.append('text').text(d => d.name)
        .attr('font-size', 11).attr('font-family', '-apple-system, sans-serif')
        .attr('fill', d => labelColor(d)).attr('text-anchor', 'middle')
        .attr('dy', d => nodeR(d) + 13)
        .style('pointer-events', 'none').style('user-select', 'none')

      // Date label overlay (bottom-right, appears in video)
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

      d3Ref.current = { sim, nodeG, linkSel, dateLabel, svgEl: svg.node()! }
      updateVisibility(progressRef.current)
    }

    const ro = new ResizeObserver(build)
    ro.observe(el)
    build()

    return () => { ro.disconnect(); sim?.stop(); el.innerHTML = ''; d3Ref.current = null }
  }, [files, outlinks, openFile, indexVersion])

  // Auto-play loop
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

  // Capture canvas frame for recording
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

  // Capture frame whenever progress changes during recording
  useEffect(() => {
    if (isRecording) renderFrameToCanvas()
  }, [progress, isRecording, renderFrameToCanvas])

  // Auto-stop recording when playback finishes
  useEffect(() => {
    if (isRecording && !isPlaying && progress >= 1) {
      const t = setTimeout(() => mediaRecorderRef.current?.stop(), 600)
      return () => clearTimeout(t)
    }
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

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Graph canvas area */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative' }}>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      {/* Timeline controls bar */}
      <div style={{
        height: 60, background: '#111', borderTop: '1px solid #2a2a2a',
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', flexShrink: 0,
      }}>
        {/* Current date */}
        <span style={{ fontSize: 12, color: '#666', minWidth: 136, flexShrink: 0 }}>
          {formattedDate}
        </span>

        {/* Timeline slider */}
        <input
          type="range" min={0} max={1000} value={Math.round(progress * 1000)}
          onChange={e => { setProgress(Number(e.target.value) / 1000); setIsPlaying(false) }}
          style={{ flex: 1, accentColor: '#7c6af7', cursor: 'pointer', height: 4 }}
        />

        {/* Play / Pause */}
        <button
          onClick={() => {
            if (progress >= 1) setProgress(0)
            setIsPlaying(p => !p)
          }}
          style={{
            background: '#7c6af7', border: 'none', borderRadius: 6,
            color: '#fff', padding: '5px 14px', cursor: 'pointer', fontSize: 15, flexShrink: 0,
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        {/* Duration selector */}
        <select
          value={playDuration}
          onChange={e => setPlayDuration(Number(e.target.value))}
          style={{
            background: '#1e1e1e', border: '1px solid #3a3a3a', color: '#aaa',
            borderRadius: 4, padding: '4px 6px', fontSize: 12, cursor: 'pointer',
          }}
        >
          <option value={10000}>10s</option>
          <option value={20000}>20s</option>
          <option value={40000}>40s</option>
          <option value={60000}>60s</option>
        </select>

        {/* Record / Stop */}
        {isRecording ? (
          <button
            onClick={stopRecording}
            style={{
              background: '#c62828', border: 'none', borderRadius: 6,
              color: '#fff', padding: '5px 14px', cursor: 'pointer', fontSize: 13,
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span style={{
              width: 7, height: 7, borderRadius: '50%', background: '#fff',
              display: 'inline-block', opacity: 1,
            }} />
            Stop
          </button>
        ) : (
          <button
            onClick={startRecording}
            title="Record graph animation as WebM video"
            style={{
              background: '#1e1e1e', border: '1px solid #3a3a3a', borderRadius: 6,
              color: '#ccc', padding: '5px 14px', cursor: 'pointer', fontSize: 13, flexShrink: 0,
            }}
          >
            ⏺ Record
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm run typecheck 2>&1 | grep -v node_modules | grep "error TS" | head -20
```

Fix any errors. Common issues:
- `f.birthtime` — needs `Task 1` to have added it to `VaultFile`. If Task 1 is done, this works.
- `window.vault.saveVideo` — needs `Task 1` to have added the Window type.

- [ ] **Step 3: Run all tests**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npx vitest run 2>&1 | tail -6
```

Expected: all tests pass (no tests touch GraphView directly).

- [ ] **Step 4: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && git add src/renderer/src/components/Graph/GraphView.tsx && git commit -m "feat: animated graph with timeline scrubber + video export"
```

---

## Self-Review

**Spec coverage:**
- ✅ `birthtime` on every `VaultFile` from `fs.stat().birthtimeMs` — Task 1
- ✅ Timeline slider (0 = oldest file → 1 = now) controls node/link opacity — Task 2
- ✅ D3 force simulation runs on all nodes always (stable positions) — Task 2
- ✅ Auto-play with configurable duration (10/20/40/60s) — Task 2
- ✅ Date label overlay in SVG bottom-right (visible in video) — Task 2
- ✅ Dot-grid background pattern (visual polish) — Task 2
- ✅ Glow filter on hover — Task 2 (preserves Phase 1 behavior)
- ✅ `vault:save-video` IPC (save dialog + write WebM) — Task 1
- ✅ Canvas + `MediaRecorder` at 15fps — Task 2
- ✅ Auto-stop recording when playback reaches end — Task 2
- ✅ `window.vault.saveVideo` exposed in preload + typed — Task 1

**Placeholder scan:** No TBDs. All code blocks complete.

**Type consistency:**
- `birthtimes.get(d.id)` returns `number | undefined` — guarded with `!== undefined` check ✅
- `D3State.nodeG` typed as `d3.Selection<SVGGElement, GNode, SVGGElement, unknown>` — matches `root.append('g').selectAll<SVGGElement, GNode>('g').data(nodes).join('g')` ✅
- `D3State.linkSel` typed as `d3.Selection<SVGLineElement, GLink, SVGGElement, unknown>` — matches `root.append('g').selectAll<SVGLineElement, GLink>('line').data(links).join('line')` ✅
- `saveVideo: (data: Uint8Array) => Promise<string | null>` — matches IPC handler return and preload exposure ✅
- `f.birthtime ?? f.mtime` — fallback for files where birthtime unavailable (some filesystems) ✅

**Task order:** Task 1 must complete before Task 2 (provides `VaultFile.birthtime` + `window.vault.saveVideo`).
