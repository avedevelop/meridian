import React, { useState, useRef, useEffect, useCallback } from 'react'
import type Konva from 'konva'
import { useVaultStore } from '../../store/useVaultStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'
import { useLinkStore } from '../../store/useLinkStore'
import { TrashIcon, NoteConvertIcon } from '../Icons'
import { useTranslation } from 'react-i18next'
import { CanvasToolbar } from './CanvasToolbar'
import { CanvasStage } from './CanvasStage'

import { CanvasNodeData, CanvasData, CanvasViewProps } from './canvasTypes'
import {
  BG,
  MIN_SCALE,
  MAX_SCALE,
  SAVE_DEBOUNCE_MS,
  DEFAULT_NODE_W,
  DEFAULT_NODE_H,
  FONT_FAMILY,
  parseCanvasData,
  isUrl
} from './canvasTools'

/* ------------------------------------------------------------------ */
/*  CanvasView                                                         */
/* ------------------------------------------------------------------ */

export function CanvasView({ filePath, content, onSave }: CanvasViewProps) {
  const { t } = useTranslation()
  const { openFile, refreshFiles } = useVaultBridge()
  const vault = useVaultStore((s) => s.vault)

  /* --- Container sizing ------------------------------------------- */
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 800, height: 600 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setSize({ width: el.clientWidth, height: el.clientHeight })
    })
    ro.observe(el)
    setSize({ width: el.clientWidth, height: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  /* --- Canvas data state ------------------------------------------ */
  const [canvasData, setCanvasData] = useState<CanvasData>(() => parseCanvasData(content))
  const loadedPathsRef = useRef<Record<string, string>>({})

  // Only reset when the FILE changes or on initial asynchronous load
  useEffect(() => {
    const lastLoadedContent = loadedPathsRef.current[filePath]
    const isNewFile = lastLoadedContent === undefined
    const isInitialLoad = !lastLoadedContent && content.trim() !== ''

    if (isNewFile || isInitialLoad) {
      setCanvasData(parseCanvasData(content))
      undoHistoryRef.current = []
      loadedPathsRef.current[filePath] = content
    }
  }, [filePath, content])

  /* --- Undo history (ref — no extra re-renders) -------------------- */
  const undoHistoryRef = useRef<CanvasData[]>([])
  const canvasDataRef = useRef(canvasData)
  canvasDataRef.current = canvasData
  const scheduleSaveRef = useRef<((data: CanvasData) => void) | null>(null)

  // File and URL content loaders
  const [fileContents, setFileContents] = useState<Record<string, string>>({})
  const loadedFilesRef = useRef<Set<string>>(new Set())
  const [urlMetadata, setUrlMetadata] = useState<
    Record<string, { title: string; description: string; image: string; url: string }>
  >({})
  const loadedUrlsRef = useRef<Set<string>>(new Set())

  // Dynamic file loader
  useEffect(() => {
    canvasData.nodes.forEach(async (n) => {
      if (n.type === 'file' && n.file && !loadedFilesRef.current.has(n.file)) {
        loadedFilesRef.current.add(n.file)
        try {
          const content = await window.vault.readFile(n.file)
          setFileContents((prev) => ({ ...prev, [n.file!]: content }))
        } catch {
          setFileContents((prev) => ({
            ...prev,
            [n.file!]: t('canvas.failedToLoadFile', { file: n.file })
          }))
        }
      }
    })
  }, [canvasData.nodes])

  // Dynamic URL metadata loader
  useEffect(() => {
    canvasData.nodes.forEach(async (n) => {
      const trimmedText = n.text?.trim()
      if (
        n.type === 'text' &&
        trimmedText &&
        isUrl(trimmedText) &&
        !loadedUrlsRef.current.has(trimmedText)
      ) {
        loadedUrlsRef.current.add(trimmedText)
        try {
          const meta = await window.vault.fetchUrlMetadata(trimmedText)
          setUrlMetadata((prev) => ({ ...prev, [trimmedText]: meta }))
        } catch {
          // ignore
        }
      }
    })
  }, [canvasData.nodes])

  // Subscribe to vault file changes to update canvas cards reactively
  useEffect(() => {
    const unsub = window.vault.onFileChanged((e) => {
      const relativePath = e.path.replace(e.vaultPath + '/', '').replace(e.vaultPath, '')
      if (loadedFilesRef.current.has(relativePath)) {
        if (e.type === 'change' || e.type === 'add') {
          window.vault
            .readFile(relativePath)
            .then((content) => {
              setFileContents((prev) => ({ ...prev, [relativePath]: content }))
            })
            .catch(() => {})
        }
      }
    })
    return unsub
  }, [])

  /* --- Save debounce ---------------------------------------------- */
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleSave = useCallback(
    (data: CanvasData) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        onSave(filePath, JSON.stringify(data, null, 2))
      }, SAVE_DEBOUNCE_MS)
    },
    [filePath, onSave]
  )

  const mutate = useCallback(
    (updater: (prev: CanvasData) => CanvasData) => {
      setCanvasData((prev) => {
        const next = updater(prev)
        scheduleSave(next)
        return next
      })
    },
    [scheduleSave]
  )

  // Keep scheduleSave ref fresh for undo handler
  scheduleSaveRef.current = scheduleSave

  // Wrap mutate to push undo snapshot before each structural change
  const mutateWithUndo = useCallback(
    (updater: (prev: CanvasData) => CanvasData) => {
      undoHistoryRef.current = [...undoHistoryRef.current.slice(-49), canvasDataRef.current]
      mutate(updater)
    },
    [mutate]
  )

  // ⌘Z undo handler — stable via refs
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== 'z' || e.shiftKey) return
      if (undoHistoryRef.current.length === 0) return
      e.preventDefault()
      const prev = undoHistoryRef.current[undoHistoryRef.current.length - 1]
      undoHistoryRef.current = undoHistoryRef.current.slice(0, -1)
      setCanvasData(prev)
      scheduleSaveRef.current?.(prev)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* --- Stage / viewport state ------------------------------------- */
  const stageRef = useRef<Konva.Stage>(null)
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const [stageScale, setStageScale] = useState(1)

  /* --- Selection & Transformer ------------------------------------ */
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)


  /* --- Inline editing --------------------------------------------- */
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [initialEditingHeight, setInitialEditingHeight] = useState<number>(0)

  /* --- Space-bar panning / Shift for edge creation ---------------- */
  const [spaceHeld, setSpaceHeld] = useState(false)
  const [shiftHeld, setShiftHeld] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) setSpaceHeld(true)
      if (e.key === 'Shift' && !e.repeat) setShiftHeld(true)
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceHeld(false)
      if (e.key === 'Shift') setShiftHeld(false)
    }
    const blur = () => {
      setSpaceHeld(false)
      setShiftHeld(false)
    }
    const mouseMove = (e: MouseEvent) => {
      // Sync shift key state from physical hardware modifier keys on any mouse movement
      if (e.shiftKey !== shiftHeld) {
        setShiftHeld(e.shiftKey)
      }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    window.addEventListener('mousemove', mouseMove)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      window.removeEventListener('mousemove', mouseMove)
    }
  }, [shiftHeld])



  /* --- Delete selected node or edge ------------------------------- */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).tagName === 'INPUT' ||
        (e.target as HTMLElement).tagName === 'TEXTAREA'
      )
        return
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      if (editingNodeId) return

      if (selectedEdgeId) {
        mutateWithUndo((prev) => ({
          ...prev,
          edges: prev.edges.filter((ed) => ed.id !== selectedEdgeId)
        }))
        setSelectedEdgeId(null)
        return
      }

      if (selectedNodeId) {
        mutateWithUndo((prev) => ({
          nodes: prev.nodes.filter((n) => n.id !== selectedNodeId),
          edges: prev.edges.filter(
            (ed) => ed.fromNode !== selectedNodeId && ed.toNode !== selectedNodeId
          )
        }))
        setSelectedNodeId(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedNodeId, selectedEdgeId, editingNodeId, mutate])

  /* --- Listen for external center requests (e.g. from TOC) --------- */
  useEffect(() => {
    const handleCenter = (e: Event) => {
      const customEvent = e as CustomEvent<{ nodeId: string }>
      const nodeId = customEvent.detail.nodeId
      const node = canvasData.nodes.find((n) => n.id === nodeId)
      if (node && containerRef.current) {
        setSelectedNodeId(nodeId)
        setSelectedEdgeId(null)
        // Center camera on this node
        const { clientWidth, clientHeight } = containerRef.current
        setStagePos({
          x: clientWidth / 2 - (node.x + node.width / 2) * stageScale,
          y: clientHeight / 2 - (node.y + node.height / 2) * stageScale
        })
      }
    }
    window.addEventListener('canvas:center-node', handleCenter)
    return () => window.removeEventListener('canvas:center-node', handleCenter)
  }, [canvasData.nodes, stageScale])



  /* --- Toolbar actions -------------------------------------------- */
  const addNodeAtCenter = useCallback(() => {
    const cx = (size.width / 2 - stagePos.x) / stageScale
    const cy = (size.height / 2 - stagePos.y) / stageScale
    const newNode: CanvasNodeData = {
      id: crypto.randomUUID(),
      type: 'text',
      x: cx - DEFAULT_NODE_W / 2,
      y: cy - DEFAULT_NODE_H / 2,
      width: DEFAULT_NODE_W,
      height: DEFAULT_NODE_H,
      text: t('canvas.defaultCardText')
    }
    mutateWithUndo((prev) => ({ ...prev, nodes: [...prev.nodes, newNode] }))
  }, [size, stagePos, stageScale, mutate])

  const addFrameAtCenter = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return
    const sp = stage.position()
    const ss = stage.scaleX()
    const cx = (stage.width() / 2 - sp.x) / ss
    const cy = (stage.height() / 2 - sp.y) / ss
    mutateWithUndo((prev) => ({
      ...prev,
      nodes: [
        ...prev.nodes,
        {
          id: `${Date.now()}${Math.random().toString(36).slice(2)}`,
          type: 'frame' as const,
          x: cx - 200,
          y: cy - 150,
          width: 400,
          height: 300,
          text: t('canvas.defaultFrameText')
        }
      ]
    }))
  }, [mutateWithUndo, t])

  const fitToContent = useCallback(() => {
    const { nodes } = canvasData
    if (nodes.length === 0) {
      setStagePos({ x: 0, y: 0 })
      setStageScale(1)
      return
    }
    const minX = Math.min(...nodes.map((n) => n.x))
    const minY = Math.min(...nodes.map((n) => n.y))
    const maxX = Math.max(...nodes.map((n) => n.x + n.width))
    const maxY = Math.max(...nodes.map((n) => n.y + n.height))
    const contentW = maxX - minX
    const contentH = maxY - minY

    const pad = 80
    const scaleX = (size.width - pad * 2) / contentW
    const scaleY = (size.height - pad * 2) / contentH
    const newScale = Math.min(Math.max(Math.min(scaleX, scaleY), MIN_SCALE), MAX_SCALE)

    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    setStageScale(newScale)
    setStagePos({
      x: size.width / 2 - centerX * newScale,
      y: size.height / 2 - centerY * newScale
    })
  }, [canvasData, size])

  /* --- Mind Map auto-arrange -------------------------------------- */
  const autoArrangeMindMap = useCallback(() => {
    const { nodes, edges } = canvasData
    if (nodes.length === 0) return

    // Build adjacency list (directed: fromNode → toNode)
    const children = new Map<string, string[]>()
    const hasParent = new Set<string>()
    nodes.forEach((n) => children.set(n.id, []))
    edges.forEach((e) => {
      children.get(e.fromNode)?.push(e.toNode)
      hasParent.add(e.toNode)
    })

    // Find roots (nodes with no incoming edges)
    const roots = nodes.filter((n) => !hasParent.has(n.id)).map((n) => n.id)
    if (roots.length === 0) roots.push(nodes[0].id) // fallback: first node

    const H_GAP = 80   // horizontal gap between nodes
    const V_GAP = 60   // vertical gap between rows
    const positions = new Map<string, { x: number; y: number }>()

    // Compute subtree height (in rows) for a node, preventing infinite loops
    const heightCache = new Map<string, number>()
    function subtreeHeight(id: string, pathStack: Set<string> = new Set()): number {
      if (pathStack.has(id)) return 1 // break cycle
      if (heightCache.has(id)) return heightCache.get(id)!

      const kids = children.get(id) ?? []
      if (kids.length === 0) return 1

      pathStack.add(id)
      let sum = 0
      for (const kid of kids) {
        sum += subtreeHeight(kid, pathStack)
      }
      pathStack.delete(id)

      const height = sum || 1
      heightCache.set(id, height)
      return height
    }

    // Place a subtree rooted at `id`, top-left corner at (x, startY)
    // Returns the total height consumed
    const placed = new Set<string>()
    function place(id: string, x: number, startY: number, pathStack: Set<string> = new Set()): number {
      if (placed.has(id) || pathStack.has(id)) return 0
      placed.add(id)
      pathStack.add(id)

      const node = nodes.find((n) => n.id === id)
      if (!node) {
        pathStack.delete(id)
        return 0
      }

      const kids = children.get(id) ?? []
      const totalRows = Math.max(1, subtreeHeight(id))
      const totalH = totalRows * (node.height + V_GAP) - V_GAP
      const cy = startY + totalH / 2 - node.height / 2

      positions.set(id, { x, y: cy })

      let cursor = startY
      kids.forEach((kid) => {
        const kidNode = nodes.find((n) => n.id === kid)
        if (!kidNode) return
        const h = subtreeHeight(kid)
        place(kid, x + node.width + H_GAP, cursor, pathStack)
        cursor += h * (kidNode.height + V_GAP)
      })

      pathStack.delete(id)
      return totalH
    }

    // Place each root tree, stacking vertically
    const ROOT_X = 80
    let cursor = 80
    roots.forEach((root) => {
      const h = place(root, ROOT_X, cursor)
      const node = nodes.find((n) => n.id === root)
      cursor += h + (node?.height ?? 120) + V_GAP
    })

    // Animate: update positions with smooth transition via requestAnimationFrame
    const startPositions = new Map(nodes.map((n) => [n.id, { x: n.x, y: n.y }]))
    const targetPositions = positions

    const startTime = performance.now()
    const duration = 500 // ms

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const progressT = 1 - Math.pow(1 - progress, 3) // cubic ease-out

      setCanvasData((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => {
          const start = startPositions.get(n.id)
          const target = targetPositions.get(n.id)
          if (start && target) {
            return {
              ...n,
              x: start.x + (target.x - start.x) * progressT,
              y: start.y + (target.y - start.y) * progressT
            }
          }
          return n
        })
      }))

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        // Complete the animation by saving the final coordinates to history/file
        mutateWithUndo((prev) => ({
          ...prev,
          nodes: prev.nodes.map((n) => {
            const target = targetPositions.get(n.id)
            return target ? { ...n, x: target.x, y: target.y } : n
          })
        }))
        setTimeout(fitToContent, 50)
      }
    }
    requestAnimationFrame(animate)
  }, [canvasData, mutate, fitToContent])


  /* --- Drop handler for files from sidebar ------------------------ */
  const handleContainerDragOver = useCallback((e: React.DragEvent) => {
    // Must call preventDefault to allow drop
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleContainerDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const raw = e.dataTransfer.getData('application/meridian-file')
      if (!raw) return
      try {
        const fileInfo = JSON.parse(raw) as { path: string; name: string; relativePath: string }
        // Use Konva's setPointersPositions to register the event position
        const stage = stageRef.current
        if (stage) {
          stage.setPointersPositions(e.nativeEvent)
        }
        const el = containerRef.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        const canvasX = (e.clientX - rect.left - stagePos.x) / stageScale
        const canvasY = (e.clientY - rect.top - stagePos.y) / stageScale

        const newNode: CanvasNodeData = {
          id: crypto.randomUUID(),
          type: 'file',
          x: canvasX - DEFAULT_NODE_W / 2,
          y: canvasY - DEFAULT_NODE_H / 2,
          width: DEFAULT_NODE_W,
          height: DEFAULT_NODE_H,
          text: fileInfo.name.replace(/\.md$/i, ''),
          file: fileInfo.relativePath
        }
        mutateWithUndo((prev) => ({ ...prev, nodes: [...prev.nodes, newNode] }))
      } catch {
        /* ignore */
      }
    },
    [stagePos, stageScale, mutate]
  )

  /* --- Zoom percentage label -------------------------------------- */
  const zoomPct = Math.round(stageScale * 100)



  /* --- Render ----------------------------------------------------- */
  return (
    <div
      ref={containerRef}
      onDragOver={handleContainerDragOver}
      onDrop={handleContainerDrop}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: BG
      }}
    >
      {/* Floating Toolbar */}
      <CanvasToolbar
        addCard={addNodeAtCenter}
        addFrame={addFrameAtCenter}
        fitToContent={fitToContent}
        autoLayout={autoArrangeMindMap}
        zoomPct={zoomPct}
      />

      {/* Konva Stage */}
      <CanvasStage
        stageRef={stageRef}
        size={size}
        stagePos={stagePos}
        setStagePos={setStagePos}
        stageScale={stageScale}
        setStageScale={setStageScale}
        spaceHeld={spaceHeld}
        shiftHeld={shiftHeld}
        canvasData={canvasData}
        setCanvasData={setCanvasData}
        mutate={mutate}
        mutateWithUndo={mutateWithUndo}
        selectedNodeId={selectedNodeId}
        setSelectedNodeId={setSelectedNodeId}
        selectedEdgeId={selectedEdgeId}
        setSelectedEdgeId={setSelectedEdgeId}
        setEditingNodeId={setEditingNodeId}
        setEditText={setEditText}
        setInitialEditingHeight={setInitialEditingHeight}
        fileContents={fileContents}
        urlMetadata={urlMetadata}
        openFile={openFile}
      />

      {/* Inline text editing overlay */}
      {editingNodeId &&
        (() => {
          const node = canvasData.nodes.find((n) => n.id === editingNodeId)
          if (!node) return null
          const screenX = node.x * stageScale + stagePos.x
          const screenY = node.y * stageScale + stagePos.y
          const screenW = node.width * stageScale
          const screenH = node.height * stageScale
          return (
            <textarea
              autoFocus
              value={editText}
              onChange={(e) => {
                setEditText(e.target.value)
                const el = e.target
                const oldH = el.style.height
                el.style.height = '1px'
                const intrinsicH = el.scrollHeight / stageScale
                el.style.height = oldH

                const targetH = Math.max(initialEditingHeight, intrinsicH)
                if (targetH !== node.height) {
                  setCanvasData((prev) => ({
                    ...prev,
                    nodes: prev.nodes.map((n) => (n.id === node.id ? { ...n, height: targetH } : n))
                  }))
                }
              }}
              onBlur={(e) => {
                const el = e.target
                const trimmedText = editText.trimEnd()
                const oldVal = el.value
                el.value = trimmedText
                const oldH = el.style.height
                el.style.height = '1px'
                const trimmedH = el.scrollHeight / stageScale
                el.style.height = oldH
                el.value = oldVal

                const finalH = Math.max(initialEditingHeight, trimmedH)

                mutate((prev) => ({
                  ...prev,
                  nodes: prev.nodes.map((n) =>
                    n.id === editingNodeId ? { ...n, text: trimmedText, height: finalH } : n
                  )
                }))
                setEditingNodeId(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  const el = e.currentTarget
                  const trimmedText = editText.trimEnd()
                  const oldVal = el.value
                  el.value = trimmedText
                  const oldH = el.style.height
                  el.style.height = '1px'
                  const trimmedH = el.scrollHeight / stageScale
                  el.style.height = oldH
                  el.value = oldVal

                  const finalH = Math.max(initialEditingHeight, trimmedH)

                  mutate((prev) => ({
                    ...prev,
                    nodes: prev.nodes.map((n) =>
                      n.id === editingNodeId ? { ...n, text: trimmedText, height: finalH } : n
                    )
                  }))
                  setEditingNodeId(null)
                }
                e.stopPropagation()
              }}
              style={{
                position: 'absolute',
                left: screenX,
                top: screenY,
                width: screenW,
                height: screenH,
                background: '#1e1e2e',
                border: '2px solid #7c6af7',
                borderRadius: 8 * stageScale,
                color: '#ccc',
                fontFamily: FONT_FAMILY,
                fontSize: 13 * stageScale,
                padding: `${16 * stageScale}px ${20 * stageScale}px`,
                resize: 'none',
                outline: 'none',
                zIndex: 1200,
                boxSizing: 'border-box'
              }}
            />
          )
        })()}

      {/* Floating Node Toolbar (Color Picker & Delete) */}
      {selectedNodeId &&
        !editingNodeId &&
        !spaceHeld &&
        !shiftHeld &&
        (() => {
          const node = canvasData.nodes.find((n) => n.id === selectedNodeId)
          if (!node) return null

          // Position slightly above the node
          const screenX = node.x * stageScale + stagePos.x
          const screenY = node.y * stageScale + stagePos.y
          const toolbarHeight = 36
          const gap = 8
          const topPos = screenY - toolbarHeight - gap

          // If the node is too close to the top of the container, place toolbar below it
          const finalTop = topPos < 10 ? screenY + node.height * stageScale + gap : topPos

          const colors = [
            '#1e1e2e', // Default dark
            '#7c6af7', // Purple
            '#38bdf8', // Blue
            '#34d399', // Green
            '#facc15', // Yellow
            '#f472b6', // Pink
            '#f87171' // Red
          ]

          return (
            <div
              style={{
                position: 'absolute',
                left: screenX,
                top: finalTop,
                height: toolbarHeight,
                background: '#2a2a3a',
                border: '1px solid #444',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                padding: '0 8px',
                gap: 8,
                zIndex: 1100,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}
              // Prevent clicks from reaching the canvas and deselecting
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    mutate((prev) => ({
                      ...prev,
                      nodes: prev.nodes.map((n) =>
                        n.id === node.id ? { ...n, color: c === '#1e1e2e' ? undefined : c } : n
                      )
                    }))
                  }}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: c,
                    border:
                      node.color === c || (!node.color && c === '#1e1e2e')
                        ? '2px solid #fff'
                        : '2px solid transparent',
                    cursor: 'pointer',
                    padding: 0
                  }}
                  title={t('canvas.nodeToolbar.changeColor')}
                />
              ))}
              {node.type === 'text' && !isUrl(node.text) && (
                <>
                  <button
                    onClick={async () => {
                      const name = prompt(t('canvas.nodeToolbar.enterFilename'), t('canvas.nodeToolbar.defaultFilename'))
                      if (!name) return
                      const fileName = name.endsWith('.md') ? name : `${name}.md`
                      if (!vault) return
                      try {
                        const filePath = await window.vault.createFile(vault.path, fileName)
                        await window.vault.writeFile(filePath, node.text)
                        const relativePath = filePath
                          .replace(vault.path + '/', '')
                          .replace(vault.path, '')

                        mutate((prev) => ({
                          ...prev,
                          nodes: prev.nodes.map((n) =>
                            n.id === node.id
                              ? {
                                  ...n,
                                  type: 'file',
                                  file: relativePath,
                                  text: fileName.replace(/\.md$/, '')
                                }
                              : n
                          )
                        }))

                        useLinkStore.getState().indexFile(filePath, fileName, node.text, vault.path)
                        await refreshFiles()
                      } catch (err: any) {
                        alert(t('canvas.nodeToolbar.failedToCreateFile', { message: err.message }))
                      }
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#7c6af7',
                      cursor: 'pointer',
                      fontSize: 14,
                      padding: '2px 6px',
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600
                    }}
                    title={t('canvas.nodeToolbar.createNoteFromText')}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = 'rgba(124, 106, 247, 0.1)')
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <NoteConvertIcon size={14} />
                  </button>
                  <div style={{ width: 1, height: 20, background: '#444' }} />
                </>
              )}
              <button
                onClick={() => {
                  mutate((prev) => ({
                    nodes: prev.nodes.filter((n) => n.id !== node.id),
                    edges: prev.edges.filter(
                      (ed) => ed.fromNode !== node.id && ed.toNode !== node.id
                    )
                  }))
                  setSelectedNodeId(null)
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#f87171',
                  cursor: 'pointer',
                  fontSize: 16,
                  padding: '2px 6px',
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={t('canvas.nodeToolbar.deleteCard')}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'rgba(248, 113, 113, 0.1)')
                }
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <TrashIcon size={14} />
              </button>
            </div>
          )
        })()}
    </div>
  )
}
