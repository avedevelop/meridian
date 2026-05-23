import React, { useState, useRef, useEffect, useCallback } from 'react'
import type Konva from 'konva'
import { useVaultBridge } from '../../hooks/useVaultBridge'
import { useTranslation } from 'react-i18next'
import { CanvasToolbar } from './CanvasToolbar'
import { CanvasStage } from './CanvasStage'
import { useCanvasKeys } from './useCanvasKeys'

import { CanvasNodeData, CanvasData, CanvasViewProps } from './canvasTypes'
import {
  BG,
  MIN_SCALE,
  MAX_SCALE,
  SAVE_DEBOUNCE_MS,
  DEFAULT_NODE_W,
  DEFAULT_NODE_H,
  parseCanvasData,
  isUrl,
  computeMindMapLayout
} from './canvasTools'

/* ------------------------------------------------------------------ */
/*  CanvasView                                                         */
/* ------------------------------------------------------------------ */

export function CanvasView({ filePath, content, onSave }: CanvasViewProps) {
  const { t } = useTranslation()
  const { openFile } = useVaultBridge()

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

  /* --- Key handlers (space bar pan, shift modifier, delete edge/node) --- */
  const { spaceHeld, shiftHeld } = useCanvasKeys({
    selectedNodeId,
    setSelectedNodeId,
    selectedEdgeId,
    setSelectedEdgeId,
    editingNodeId,
    mutateWithUndo
  })

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
    const { nodes } = canvasData
    if (nodes.length === 0) return

    const targetPositions = computeMindMapLayout(canvasData)
    const startPositions = new Map(nodes.map((n) => [n.id, { x: n.x, y: n.y }]))

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
  }, [canvasData, mutateWithUndo, fitToContent])

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
        editingNodeId={editingNodeId}
        editText={editText}
        initialEditingHeight={initialEditingHeight}
        setEditingNodeId={setEditingNodeId}
        setEditText={setEditText}
        setInitialEditingHeight={setInitialEditingHeight}
        fileContents={fileContents}
        urlMetadata={urlMetadata}
        openFile={openFile}
      />
    </div>
  )
}
