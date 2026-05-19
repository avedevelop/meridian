import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Stage, Layer, Rect, Text, Group, Line, Circle, Transformer } from 'react-konva'
import type Konva from 'konva'
import { Html } from 'react-konva-utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useVaultStore } from '../../store/useVaultStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'
import { useLinkStore } from '../../store/useLinkStore'
import { TrashIcon, NoteConvertIcon, FrameIcon } from '../Icons'

/* ------------------------------------------------------------------ */
/*  Data model                                                         */
/* ------------------------------------------------------------------ */

export interface CanvasNodeData {
  id: string
  type: 'text' | 'file' | 'frame'
  x: number
  y: number
  width: number
  height: number
  text: string
  file?: string
  color?: string
}

export interface CanvasEdgeData {
  id: string
  fromNode: string
  toNode: string
  fromSide: 'top' | 'right' | 'bottom' | 'left'
  toSide: 'top' | 'right' | 'bottom' | 'left'
}

export interface CanvasData {
  nodes: CanvasNodeData[]
  edges: CanvasEdgeData[]
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface CanvasViewProps {
  filePath: string
  content: string
  onSave: (path: string, content: string) => void
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const BG = '#161616'
const NODE_FILL = '#1e1e2e'
const NODE_STROKE = '#3a3a5a'
const NODE_SELECTED_STROKE = '#7c6af7'
const EDGE_COLOR = '#7c6af7'
const DOT_COLOR = '#2a2a2a'
const DOT_SPACING = 30
const DOT_RADIUS = 1
const SCALE_BY = 1.05
const MIN_SCALE = 0.1
const MAX_SCALE = 5
const SAVE_DEBOUNCE_MS = 500
const DEFAULT_NODE_W = 200
const DEFAULT_NODE_H = 80
const FONT_FAMILY = 'Inter, -apple-system, sans-serif'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function parseCanvasData(raw: string): CanvasData {
  try {
    const parsed = JSON.parse(raw) as Partial<CanvasData>
    return {
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
      edges: Array.isArray(parsed.edges) ? parsed.edges : []
    }
  } catch {
    return { nodes: [], edges: [] }
  }
}

function nodeCenter(n: CanvasNodeData): { x: number; y: number } {
  return { x: n.x + n.width / 2, y: n.y + n.height / 2 }
}

function getContrastColor(hexColor: string | undefined): string {
  if (!hexColor) return '#ccc' // default text color for dark node
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 128 ? '#111' : '#ccc'
}

function isUrl(str: string): boolean {
  try {
    const trimmed = str.trim()
    const url = new URL(trimmed)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/* ------------------------------------------------------------------ */
/*  Dot-grid background                                                */
/* ------------------------------------------------------------------ */

interface DotGridProps {
  stageX: number
  stageY: number
  stageScale: number
  width: number
  height: number
}

function DotGrid({ stageX, stageY, stageScale, width, height }: DotGridProps) {
  const dots = useMemo(() => {
    const spacing = DOT_SPACING
    const startX = Math.floor(-stageX / stageScale / spacing) * spacing - spacing
    const startY = Math.floor(-stageY / stageScale / spacing) * spacing - spacing
    const endX = startX + width / stageScale + spacing * 2
    const endY = startY + height / stageScale + spacing * 2
    const result: { x: number; y: number }[] = []
    for (let x = startX; x <= endX; x += spacing) {
      for (let y = startY; y <= endY; y += spacing) {
        result.push({ x, y })
      }
    }
    return result
  }, [stageX, stageY, stageScale, width, height])

  return (
    <>
      {dots.map((d, i) => (
        <Circle key={i} x={d.x} y={d.y} radius={DOT_RADIUS} fill={DOT_COLOR} listening={false} />
      ))}
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  CanvasView                                                         */
/* ------------------------------------------------------------------ */

export function CanvasView({ filePath, content, onSave }: CanvasViewProps) {
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

  // Sync if external content prop changes
  useEffect(() => {
    setCanvasData(parseCanvasData(content))
  }, [content])

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
          setFileContents((prev) => ({ ...prev, [n.file!]: `Error loading: ${n.file}` }))
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

  /* --- Stage / viewport state ------------------------------------- */
  const stageRef = useRef<Konva.Stage>(null)
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const [stageScale, setStageScale] = useState(1)

  /* --- Selection & Transformer ------------------------------------ */
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const trRef = useRef<Konva.Transformer>(null)
  const nodeRefs = useRef<Record<string, Konva.Group | null>>({})
  const nodeMinHeights = useRef<Record<string, number>>({})

  useEffect(() => {
    if (selectedNodeId && trRef.current) {
      const node = nodeRefs.current[selectedNodeId]
      if (node) {
        trRef.current.nodes([node])
        trRef.current.getLayer()?.batchDraw()
      }
    } else if (trRef.current) {
      trRef.current.nodes([])
    }
  }, [selectedNodeId, canvasData.nodes])

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

  /* --- Shift-drag edge creation ----------------------------------- */
  const shiftDragOriginRef = useRef<string | null>(null)
  const [tempLineEnd, setTempLineEnd] = useState<{ x: number; y: number } | null>(null)

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
        mutate((prev) => ({
          ...prev,
          edges: prev.edges.filter((ed) => ed.id !== selectedEdgeId)
        }))
        setSelectedEdgeId(null)
        return
      }

      if (selectedNodeId) {
        mutate((prev) => ({
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

  /* --- Wheel zoom ------------------------------------------------- */
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return

    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const direction = e.evt.deltaY > 0 ? -1 : 1
    const newScale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, direction > 0 ? oldScale * SCALE_BY : oldScale / SCALE_BY)
    )

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale
    }

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale
    }

    setStageScale(newScale)
    setStagePos(newPos)
  }, [])

  /* --- Drag end (pan) --------------------------------------------- */
  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    if (e.target === stageRef.current) {
      setStagePos({ x: e.target.x(), y: e.target.y() })
    }
  }, [])

  /* --- Double-click to create node -------------------------------- */
  const handleDblClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Only on empty stage area
      if (e.target !== stageRef.current) return
      const stage = stageRef.current!
      const pointer = stage.getPointerPosition()
      if (!pointer) return

      const canvasX = (pointer.x - stagePos.x) / stageScale
      const canvasY = (pointer.y - stagePos.y) / stageScale

      const newNode: CanvasNodeData = {
        id: crypto.randomUUID(),
        type: 'text',
        x: canvasX - DEFAULT_NODE_W / 2,
        y: canvasY - DEFAULT_NODE_H / 2,
        width: DEFAULT_NODE_W,
        height: DEFAULT_NODE_H,
        text: 'New Card'
      }

      mutate((prev) => ({ ...prev, nodes: [...prev.nodes, newNode] }))
    },
    [stagePos, stageScale, mutate]
  )

  /* --- Click on empty stage to deselect --------------------------- */
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === stageRef.current) {
      setSelectedNodeId(null)
      setSelectedEdgeId(null)
    }
  }, [])

  /* --- Node drag -------------------------------------------------- */
  const frameChildrenRef = useRef<{ id: string; offsetX: number; offsetY: number }[]>([])

  const handleNodeDragStart = useCallback(
    (nodeId: string) => {
      const node = canvasData.nodes.find((n) => n.id === nodeId)
      if (node?.type === 'frame') {
        const children = canvasData.nodes.filter(
          (n) =>
            n.id !== nodeId &&
            n.x >= node.x &&
            n.x + n.width <= node.x + node.width &&
            n.y >= node.y &&
            n.y + n.height <= node.y + node.height
        )
        frameChildrenRef.current = children.map((c) => ({
          id: c.id,
          offsetX: c.x - node.x,
          offsetY: c.y - node.y
        }))
      } else {
        frameChildrenRef.current = []
      }
    },
    [canvasData.nodes]
  )

  const handleNodeDragMove = useCallback((nodeId: string, e: Konva.KonvaEventObject<DragEvent>) => {
    const x = e.target.x()
    const y = e.target.y()
    const isFrame = frameChildrenRef.current.length > 0
    setCanvasData((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => {
        if (n.id === nodeId) return { ...n, x, y }
        if (isFrame) {
          const child = frameChildrenRef.current.find((c) => c.id === n.id)
          if (child) return { ...n, x: x + child.offsetX, y: y + child.offsetY }
        }
        return n
      })
    }))
  }, [])

  const handleNodeDragEnd = useCallback(
    (nodeId: string, e: Konva.KonvaEventObject<DragEvent>) => {
      const x = e.target.x()
      const y = e.target.y()
      const isFrame = frameChildrenRef.current.length > 0
      mutate((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => {
          if (n.id === nodeId) return { ...n, x, y }
          if (isFrame) {
            const child = frameChildrenRef.current.find((c) => c.id === n.id)
            if (child) return { ...n, x: x + child.offsetX, y: y + child.offsetY }
          }
          return n
        })
      }))
    },
    [mutate]
  )

  /* --- Shift-drag: edge creation & Z-index ------------------------ */
  const handleNodeMouseDown = useCallback(
    (nodeId: string, e: Konva.KonvaEventObject<MouseEvent>) => {
      // Bring node to front
      mutate((prev) => {
        const nodeIdx = prev.nodes.findIndex((n) => n.id === nodeId)
        if (nodeIdx === -1 || nodeIdx === prev.nodes.length - 1) return prev
        const newNodes = [...prev.nodes]
        const [node] = newNodes.splice(nodeIdx, 1)
        newNodes.push(node)
        return { ...prev, nodes: newNodes }
      })

      if (e.evt.shiftKey) {
        shiftDragOriginRef.current = nodeId
        // Initialize temp line at mouse position
        const stage = stageRef.current
        if (stage) {
          const pointer = stage.getPointerPosition()
          if (pointer) {
            setTempLineEnd({
              x: (pointer.x - stagePos.x) / stageScale,
              y: (pointer.y - stagePos.y) / stageScale
            })
          }
        }
      }
    },
    [stagePos, stageScale, mutate]
  )

  /* Stage-level mouseMove: update temp line during shift-drag */
  const handleStageMouseMove = useCallback(
    (_e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!shiftDragOriginRef.current) return
      const stage = stageRef.current
      if (!stage) return
      const pointer = stage.getPointerPosition()
      if (!pointer) return
      setTempLineEnd({
        x: (pointer.x - stagePos.x) / stageScale,
        y: (pointer.y - stagePos.y) / stageScale
      })
    },
    [stagePos, stageScale]
  )

  /* Stage-level mouseUp: detect target node under cursor for edge creation */
  const handleStageMouseUp = useCallback(
    (_e: Konva.KonvaEventObject<MouseEvent>) => {
      const origin = shiftDragOriginRef.current
      if (!origin) return
      shiftDragOriginRef.current = null
      setTempLineEnd(null)

      // Find which node is under the pointer
      const stage = stageRef.current
      if (!stage) return
      const pointer = stage.getPointerPosition()
      if (!pointer) return

      // Convert screen coords to canvas coords
      const canvasX = (pointer.x - stagePos.x) / stageScale
      const canvasY = (pointer.y - stagePos.y) / stageScale

      // Find which node contains this point
      const targetNode = canvasData.nodes.find(
        (n) =>
          n.id !== origin &&
          canvasX >= n.x &&
          canvasX <= n.x + n.width &&
          canvasY >= n.y &&
          canvasY <= n.y + n.height
      )
      if (!targetNode) return

      mutate((prev) => {
        const exists = prev.edges.some(
          (ed) =>
            (ed.fromNode === origin && ed.toNode === targetNode.id) ||
            (ed.fromNode === targetNode.id && ed.toNode === origin)
        )
        if (exists) return prev

        const newEdge: CanvasEdgeData = {
          id: crypto.randomUUID(),
          fromNode: origin,
          toNode: targetNode.id,
          fromSide: 'right',
          toSide: 'left'
        }
        return { ...prev, edges: [...prev.edges, newEdge] }
      })
    },
    [mutate, canvasData.nodes, stagePos, stageScale]
  )

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
      text: 'New Card'
    }
    mutate((prev) => ({ ...prev, nodes: [...prev.nodes, newNode] }))
  }, [size, stagePos, stageScale, mutate])

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

  /* --- Build edge lines ------------------------------------------- */
  const edgeLines = useMemo(() => {
    const nodeMap = new Map(canvasData.nodes.map((n) => [n.id, n]))
    return canvasData.edges
      .map((edge) => {
        const from = nodeMap.get(edge.fromNode)
        const to = nodeMap.get(edge.toNode)
        if (!from || !to) return null
        const fc = nodeCenter(from)
        const tc = nodeCenter(to)
        return { id: edge.id, points: [fc.x, fc.y, tc.x, tc.y] }
      })
      .filter(Boolean) as { id: string; points: number[] }[]
  }, [canvasData])
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
        mutate((prev) => ({ ...prev, nodes: [...prev.nodes, newNode] }))
      } catch {
        /* ignore */
      }
    },
    [stagePos, stageScale, mutate]
  )

  /* --- Zoom percentage label -------------------------------------- */
  const zoomPct = Math.round(stageScale * 100)

  /* --- Render Node Helper ------------------------------------------ */
  const renderNode = (node: CanvasNodeData) => {
    const isSelected = node.id === selectedNodeId
    const displayText =
      node.type === 'file' && node.file ? (node.file.split('/').pop() ?? node.text) : node.text

    return (
      <Group
        key={node.id}
        ref={(el) => {
          nodeRefs.current[node.id] = el
        }}
        x={node.x}
        y={node.y}
        draggable={!spaceHeld && !shiftHeld}
        onDragStart={() => handleNodeDragStart(node.id)}
        onDragEnd={(e) => handleNodeDragEnd(node.id, e)}
        onDragMove={(e) => handleNodeDragMove(node.id, e)}
        onClick={() => {
          setSelectedNodeId(node.id)
          setSelectedEdgeId(null)
        }}
        onDblClick={() => {
          if (node.type === 'text') {
            if (isUrl(node.text)) {
              window.vault.openExternal(node.text.trim())
            } else {
              setEditingNodeId(node.id)
              setEditText(node.text)
              setInitialEditingHeight(node.height)
            }
          } else if (node.type === 'file' && node.file) {
            const fileName = node.file.split('/').pop() ?? ''
            openFile(node.file, fileName)
          }
        }}
        onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
        onTransform={(e) => {
          const el = e.target
          const scaleX = el.scaleX()
          const scaleY = el.scaleY()
          el.scaleX(1)
          el.scaleY(1)
          setCanvasData((prev) => ({
            ...prev,
            nodes: prev.nodes.map((n) =>
              n.id === node.id
                ? {
                    ...n,
                    x: el.x(),
                    y: el.y(),
                    width: Math.max(150, n.width * scaleX),
                    height: Math.max(60, n.height * scaleY)
                  }
                : n
            )
          }))
        }}
        onTransformEnd={(e) => {
          const el = e.target
          mutate((prev) => ({
            ...prev,
            nodes: prev.nodes.map((n) =>
              n.id === node.id
                ? {
                    ...n,
                    x: el.x(),
                    y: el.y(),
                    width: n.width,
                    height: n.height
                  }
                : n
            )
          }))
        }}
      >
        <Rect
          width={node.width}
          height={node.height}
          fill={
            node.type === 'frame'
              ? node.color
                ? `${node.color}33`
                : 'rgba(255,255,255,0.05)'
              : (node.color ?? NODE_FILL)
          }
          stroke={
            isSelected
              ? NODE_SELECTED_STROKE
              : node.type === 'frame'
                ? (node.color ?? '#555')
                : NODE_STROKE
          }
          strokeWidth={isSelected ? 2 : node.type === 'frame' ? 2 : 1}
          cornerRadius={8}
          shadowColor="#000"
          shadowBlur={isSelected ? 12 : 4}
          shadowOpacity={isSelected ? 0.4 : 0.2}
          shadowOffsetY={2}
        />
        {node.type === 'frame' && (
          <Text
            text={displayText}
            fill={node.color ?? '#ccc'}
            fontFamily={FONT_FAMILY}
            fontSize={18}
            fontStyle="bold"
            y={-28}
            listening={false}
          />
        )}
        {node.type !== 'frame' && (
          <Html
            divProps={{
              style: {
                pointerEvents: 'none',
                width: `${node.width}px`,
                height: `${node.height}px`,
                overflow: 'hidden',
                boxSizing: 'border-box'
              }
            }}
          >
            {node.type === 'text' && isUrl(node.text) ? (
              (() => {
                const trimmed = node.text.trim()
                const meta = urlMetadata[trimmed]
                return (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      height: '100%',
                      width: '100%',
                      background: node.color ? `${node.color}55` : 'rgba(25, 25, 30, 0.75)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                      fontFamily: FONT_FAMILY
                    }}
                  >
                    {meta?.image && (
                      <div
                        style={{
                          width: '30%',
                          minWidth: 70,
                          height: '100%',
                          background: `url(${meta.image}) center/cover no-repeat`,
                          borderRight: '1px solid rgba(255,255,255,0.08)'
                        }}
                      />
                    )}
                    <div
                      style={{
                        flex: 1,
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{ overflow: 'hidden' }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 13,
                            color: '#fff',
                            marginBottom: 4,
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden'
                          }}
                        >
                          {meta?.title || trimmed}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: '#aaa',
                            lineHeight: '1.4em',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {meta?.description || 'No description'}
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: 10,
                          color: '#7c6af7',
                          fontWeight: 500,
                          marginTop: 4
                        }}
                      >
                        <span
                          style={{
                            opacity: 0.8,
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            maxWidth: '65%'
                          }}
                        >
                          {(() => {
                            try {
                              return new URL(trimmed).hostname
                            } catch {
                              return trimmed
                            }
                          })()}
                        </span>
                        <button
                          style={{
                            background: 'rgba(124, 106, 247, 0.2)',
                            border: 'none',
                            borderRadius: 4,
                            color: '#a395ff',
                            padding: '2px 8px',
                            fontSize: 10,
                            cursor: 'pointer',
                            pointerEvents: 'auto',
                            fontWeight: 600
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            window.vault.openExternal(trimmed)
                          }}
                        >
                          Open ↗
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })()
            ) : (
              <div
                className="markdown-preview"
                style={{
                  color: getContrastColor(node.color),
                  fontFamily: FONT_FAMILY,
                  fontSize: 13,
                  margin: 0,
                  padding: '16px 20px',
                  width: '100%',
                  height: '100%',
                  boxSizing: 'border-box',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap'
                }}
              >
                <div
                  ref={(el) => {
                    if (el) {
                      const contentHeight = el.offsetHeight + 32
                      nodeMinHeights.current[node.id] = contentHeight
                      if (node.height < contentHeight) {
                        setTimeout(() => {
                          setCanvasData((prev) => ({
                            ...prev,
                            nodes: prev.nodes.map((n) =>
                              n.id === node.id && n.height < contentHeight
                                ? { ...n, height: contentHeight }
                                : n
                            )
                          }))
                        }, 0)
                      }
                    }
                  }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {node.type === 'file' && node.file
                      ? fileContents[node.file] !== undefined
                        ? `### Note: ${node.file.split('/').pop()?.replace(/\.md$/, '')}\n\n${fileContents[node.file]}`
                        : `### Note: ${displayText}\nLoading...`
                      : displayText}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </Html>
        )}
      </Group>
    )
  }

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
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          background: '#14141a',
          borderRadius: 8,
          border: '1px solid #2a2a35',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          padding: '4px 8px',
          userSelect: 'none'
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontFamily: FONT_FAMILY,
            color: '#888',
            minWidth: 38,
            textAlign: 'center',
            fontWeight: 500
          }}
        >
          {zoomPct}%
        </span>
        <button
          onClick={fitToContent}
          style={{
            background: '#21212a',
            border: '1px solid #333342',
            borderRadius: 6,
            color: '#aaa',
            fontSize: 12,
            fontFamily: FONT_FAMILY,
            height: 28,
            padding: '0 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = NODE_SELECTED_STROKE
            ;(e.currentTarget as HTMLButtonElement).style.color = '#ddd'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#333342'
            ;(e.currentTarget as HTMLButtonElement).style.color = '#aaa'
          }}
        >
          Fit
        </button>
        <button
          onClick={addNodeAtCenter}
          style={{
            background: NODE_SELECTED_STROKE,
            border: `1px solid ${NODE_SELECTED_STROKE}`,
            borderRadius: 6,
            color: '#fff',
            fontSize: 18,
            fontWeight: 500,
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'opacity 0.15s'
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.opacity = '0.85'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.opacity = '1'
          }}
        >
          +
        </button>
        <button
          onClick={() => {
            const stage = stageRef.current
            if (!stage) return
            const stagePos = stage.position()
            const stageScale = stage.scaleX()
            const canvasX = (stage.width() / 2 - stagePos.x) / stageScale
            const canvasY = (stage.height() / 2 - stagePos.y) / stageScale

            const newNode: CanvasNodeData = {
              id: Date.now().toString() + Math.random().toString(36).slice(2),
              type: 'frame',
              x: canvasX - 200,
              y: canvasY - 150,
              width: 400,
              height: 300,
              text: 'New Frame'
            }

            mutate((prev) => ({ ...prev, nodes: [...prev.nodes, newNode] }))
          }}
          title="Add Frame"
          style={{
            background: '#21212a',
            border: '1px solid #333342',
            borderRadius: 6,
            color: '#ccc',
            fontSize: 12,
            fontFamily: FONT_FAMILY,
            height: 28,
            padding: '0 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = NODE_SELECTED_STROKE
            ;(e.currentTarget as HTMLButtonElement).style.color = '#fff'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#333342'
            ;(e.currentTarget as HTMLButtonElement).style.color = '#ccc'
          }}
        >
          <FrameIcon size={14} color="#7c6af7" />
          <span>Frame</span>
        </button>
      </div>

      {/* Konva Stage */}
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        x={stagePos.x}
        y={stagePos.y}
        scaleX={stageScale}
        scaleY={stageScale}
        draggable={!shiftHeld}
        onWheel={handleWheel}
        onDragEnd={handleDragEnd}
        onDblClick={handleDblClick}
        onClick={handleStageClick}
        onMouseUp={handleStageMouseUp}
        onMouseMove={handleStageMouseMove}
        style={{ cursor: shiftHeld ? 'crosshair' : spaceHeld ? 'grab' : 'default' }}
      >
        {/* Background layer */}
        <Layer listening={false}>
          <Rect
            x={-stagePos.x / stageScale}
            y={-stagePos.y / stageScale}
            width={size.width / stageScale}
            height={size.height / stageScale}
            fill={BG}
            listening={false}
          />
          <DotGrid
            stageX={stagePos.x}
            stageY={stagePos.y}
            stageScale={stageScale}
            width={size.width}
            height={size.height}
          />
        </Layer>

        {/* Layer 2: Frames */}
        <Layer>
          {canvasData.nodes.filter((node) => node.type === 'frame').map((node) => renderNode(node))}
        </Layer>

        {/* Layer 3: Edges */}
        <Layer>
          {edgeLines.map((edge) => {
            const isEdgeSelected = edge.id === selectedEdgeId
            return (
              <Line
                key={edge.id}
                points={edge.points}
                stroke={isEdgeSelected ? '#a78bfa' : EDGE_COLOR}
                strokeWidth={isEdgeSelected ? 3 : 2}
                opacity={isEdgeSelected ? 1 : 0.6}
                lineCap="round"
                hitStrokeWidth={16}
                onClick={() => {
                  setSelectedEdgeId(edge.id)
                  setSelectedNodeId(null)
                }}
              />
            )
          })}
          {/* Temporary line while shift-dragging */}
          {shiftDragOriginRef.current &&
            tempLineEnd &&
            (() => {
              const originNode = canvasData.nodes.find((n) => n.id === shiftDragOriginRef.current)
              if (!originNode) return null
              const oc = nodeCenter(originNode)
              return (
                <Line
                  points={[oc.x, oc.y, tempLineEnd.x, tempLineEnd.y]}
                  stroke={EDGE_COLOR}
                  strokeWidth={2}
                  opacity={0.8}
                  dash={[8, 4]}
                  lineCap="round"
                  listening={false}
                />
              )
            })()}
        </Layer>

        {/* Layer 4: Cards & Transformer */}
        <Layer>
          {canvasData.nodes.filter((node) => node.type !== 'frame').map((node) => renderNode(node))}
          <Transformer
            ref={trRef}
            boundBoxFunc={(oldBox, newBox) => {
              const minH = Math.max(
                60,
                (selectedNodeId && nodeMinHeights.current[selectedNodeId]) || 60
              )
              if (newBox.width < 150 || newBox.height < minH) return oldBox
              return newBox
            }}
            padding={4}
            anchorSize={8}
            anchorCornerRadius={4}
            borderStroke="#7c6af7"
            anchorStroke="#7c6af7"
            anchorFill="#fff"
            rotateEnabled={false}
            keepRatio={false}
            shiftBehavior="none"
          />
        </Layer>
      </Stage>

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
                  title="Change Color"
                />
              ))}
              {node.type === 'text' && !isUrl(node.text) && (
                <>
                  <button
                    onClick={async () => {
                      const name = prompt('Enter new note filename:', 'Note.md')
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
                        alert(`Failed to create file: ${err.message}`)
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
                    title="Create note from text"
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
                title="Delete Card"
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
