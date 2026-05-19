import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Stage, Layer, Rect, Text, Group, Line, Circle } from 'react-konva'
import type Konva from 'konva'

/* ------------------------------------------------------------------ */
/*  Data model                                                         */
/* ------------------------------------------------------------------ */

export interface CanvasNodeData {
  id: string
  type: 'text' | 'file'
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
      edges: Array.isArray(parsed.edges) ? parsed.edges : [],
    }
  } catch {
    return { nodes: [], edges: [] }
  }
}

function nodeCenter(n: CanvasNodeData): { x: number; y: number } {
  return { x: n.x + n.width / 2, y: n.y + n.height / 2 }
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

  /* --- Save debounce ---------------------------------------------- */
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleSave = useCallback(
    (data: CanvasData) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        onSave(filePath, JSON.stringify(data, null, 2))
      }, SAVE_DEBOUNCE_MS)
    },
    [filePath, onSave],
  )

  const mutate = useCallback(
    (updater: (prev: CanvasData) => CanvasData) => {
      setCanvasData(prev => {
        const next = updater(prev)
        scheduleSave(next)
        return next
      })
    },
    [scheduleSave],
  )

  /* --- Stage / viewport state ------------------------------------- */
  const stageRef = useRef<Konva.Stage>(null)
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const [stageScale, setStageScale] = useState(1)

  /* --- Selection -------------------------------------------------- */
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)

  /* --- Inline editing --------------------------------------------- */
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

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
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  /* --- Shift-drag edge creation ----------------------------------- */
  const shiftDragOriginRef = useRef<string | null>(null)
  const [tempLineEnd, setTempLineEnd] = useState<{ x: number; y: number } | null>(null)

  /* --- Delete selected node or edge ------------------------------- */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      if (editingNodeId) return

      if (selectedEdgeId) {
        mutate(prev => ({
          ...prev,
          edges: prev.edges.filter(ed => ed.id !== selectedEdgeId),
        }))
        setSelectedEdgeId(null)
        return
      }

      if (selectedNodeId) {
        mutate(prev => ({
          nodes: prev.nodes.filter(n => n.id !== selectedNodeId),
          edges: prev.edges.filter(
            ed => ed.fromNode !== selectedNodeId && ed.toNode !== selectedNodeId,
          ),
        }))
        setSelectedNodeId(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedNodeId, selectedEdgeId, editingNodeId, mutate])

  /* --- Wheel zoom ------------------------------------------------- */
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault()
      const stage = stageRef.current
      if (!stage) return

      const oldScale = stage.scaleX()
      const pointer = stage.getPointerPosition()
      if (!pointer) return

      const direction = e.evt.deltaY > 0 ? -1 : 1
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, direction > 0 ? oldScale * SCALE_BY : oldScale / SCALE_BY))

      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      }

      const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      }

      setStageScale(newScale)
      setStagePos(newPos)
    },
    [],
  )

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
        text: 'New Card',
      }

      mutate(prev => ({ ...prev, nodes: [...prev.nodes, newNode] }))
    },
    [stagePos, stageScale, mutate],
  )

  /* --- Click on empty stage to deselect --------------------------- */
  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target === stageRef.current) {
        setSelectedNodeId(null)
        setSelectedEdgeId(null)
      }
    },
    [],
  )

  /* --- Node drag end ---------------------------------------------- */
  const handleNodeDragEnd = useCallback(
    (nodeId: string, e: Konva.KonvaEventObject<DragEvent>) => {
      const x = e.target.x()
      const y = e.target.y()
      mutate(prev => ({
        ...prev,
        nodes: prev.nodes.map(n => (n.id === nodeId ? { ...n, x, y } : n)),
      }))
    },
    [mutate],
  )

  /* Live update node position during drag so edges follow */
  const handleNodeDragMove = useCallback(
    (nodeId: string, e: Konva.KonvaEventObject<DragEvent>) => {
      const x = e.target.x()
      const y = e.target.y()
      setCanvasData(prev => ({
        ...prev,
        nodes: prev.nodes.map(n => (n.id === nodeId ? { ...n, x, y } : n)),
      }))
    },
    [],
  )

  /* --- Shift-drag: edge creation ---------------------------------- */
  const handleNodeMouseDown = useCallback(
    (nodeId: string, e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.evt.shiftKey) {
        shiftDragOriginRef.current = nodeId
        // Initialize temp line at mouse position
        const stage = stageRef.current
        if (stage) {
          const pointer = stage.getPointerPosition()
          if (pointer) {
            setTempLineEnd({
              x: (pointer.x - stagePos.x) / stageScale,
              y: (pointer.y - stagePos.y) / stageScale,
            })
          }
        }
      }
    },
    [stagePos, stageScale],
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
        y: (pointer.y - stagePos.y) / stageScale,
      })
    },
    [stagePos, stageScale],
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
      const targetNode = canvasData.nodes.find(n =>
        n.id !== origin &&
        canvasX >= n.x && canvasX <= n.x + n.width &&
        canvasY >= n.y && canvasY <= n.y + n.height
      )
      if (!targetNode) return

      mutate(prev => {
        const exists = prev.edges.some(
          ed =>
            (ed.fromNode === origin && ed.toNode === targetNode.id) ||
            (ed.fromNode === targetNode.id && ed.toNode === origin),
        )
        if (exists) return prev

        const newEdge: CanvasEdgeData = {
          id: crypto.randomUUID(),
          fromNode: origin,
          toNode: targetNode.id,
          fromSide: 'right',
          toSide: 'left',
        }
        return { ...prev, edges: [...prev.edges, newEdge] }
      })
    },
    [mutate, canvasData.nodes, stagePos, stageScale],
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
      text: 'New Card',
    }
    mutate(prev => ({ ...prev, nodes: [...prev.nodes, newNode] }))
  }, [size, stagePos, stageScale, mutate])

  const fitToContent = useCallback(() => {
    const { nodes } = canvasData
    if (nodes.length === 0) {
      setStagePos({ x: 0, y: 0 })
      setStageScale(1)
      return
    }
    const minX = Math.min(...nodes.map(n => n.x))
    const minY = Math.min(...nodes.map(n => n.y))
    const maxX = Math.max(...nodes.map(n => n.x + n.width))
    const maxY = Math.max(...nodes.map(n => n.y + n.height))
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
      y: size.height / 2 - centerY * newScale,
    })
  }, [canvasData, size])

  /* --- Build edge lines ------------------------------------------- */
  const edgeLines = useMemo(() => {
    const nodeMap = new Map(canvasData.nodes.map(n => [n.id, n]))
    return canvasData.edges
      .map(edge => {
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

  const handleContainerDrop = useCallback((e: React.DragEvent) => {
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
        file: fileInfo.relativePath,
      }
      mutate(prev => ({ ...prev, nodes: [...prev.nodes, newNode] }))
    } catch { /* ignore */ }
  }, [stagePos, stageScale, mutate])

  /* --- Zoom percentage label -------------------------------------- */
  const zoomPct = Math.round(stageScale * 100)

  /* --- Render ----------------------------------------------------- */
  return (
    <div
      ref={containerRef}
      onDragOver={handleContainerDragOver}
      onDrop={handleContainerDrop}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: BG }}
    >
      {/* Floating Toolbar */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(22,22,22,0.85)',
          backdropFilter: 'blur(12px)',
          borderRadius: 10,
          border: '1px solid #2a2a2a',
          padding: '6px 12px',
          userSelect: 'none',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontFamily: FONT_FAMILY,
            color: '#888',
            minWidth: 36,
            textAlign: 'center',
          }}
        >
          {zoomPct}%
        </span>
        <button
          onClick={fitToContent}
          style={{
            background: 'transparent',
            border: '1px solid #3a3a3a',
            borderRadius: 6,
            color: '#aaa',
            fontSize: 11,
            fontFamily: FONT_FAMILY,
            padding: '3px 8px',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            ;(e.target as HTMLButtonElement).style.borderColor = NODE_SELECTED_STROKE
            ;(e.target as HTMLButtonElement).style.color = '#ddd'
          }}
          onMouseLeave={e => {
            ;(e.target as HTMLButtonElement).style.borderColor = '#3a3a3a'
            ;(e.target as HTMLButtonElement).style.color = '#aaa'
          }}
        >
          Fit
        </button>
        <button
          onClick={addNodeAtCenter}
          style={{
            background: NODE_SELECTED_STROKE,
            border: 'none',
            borderRadius: 6,
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            width: 26,
            height: 26,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            lineHeight: 1,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => {
            ;(e.target as HTMLButtonElement).style.opacity = '0.85'
          }}
          onMouseLeave={e => {
            ;(e.target as HTMLButtonElement).style.opacity = '1'
          }}
        >
          +
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

        {/* Edges layer */}
        <Layer>
          {edgeLines.map(edge => {
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
          {shiftDragOriginRef.current && tempLineEnd && (() => {
            const originNode = canvasData.nodes.find(n => n.id === shiftDragOriginRef.current)
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

        {/* Nodes layer */}
        <Layer>
          {canvasData.nodes.map(node => {
            const isSelected = node.id === selectedNodeId
            const displayText =
              node.type === 'file' && node.file
                ? node.file.split('/').pop() ?? node.text
                : node.text

            return (
              <Group
                key={node.id}
                x={node.x}
                y={node.y}
                draggable={!spaceHeld && !shiftHeld}
                onDragEnd={e => handleNodeDragEnd(node.id, e)}
                onDragMove={e => handleNodeDragMove(node.id, e)}
                onClick={() => { setSelectedNodeId(node.id); setSelectedEdgeId(null) }}
                onDblClick={() => {
                  if (node.type === 'text') {
                    setEditingNodeId(node.id)
                    setEditText(node.text)
                  }
                }}
                onMouseDown={e => handleNodeMouseDown(node.id, e)}
              >
                <Rect
                  width={node.width}
                  height={node.height}
                  fill={node.color ?? NODE_FILL}
                  stroke={isSelected ? NODE_SELECTED_STROKE : NODE_STROKE}
                  strokeWidth={isSelected ? 2 : 1}
                  cornerRadius={8}
                  shadowColor="#000"
                  shadowBlur={isSelected ? 12 : 4}
                  shadowOpacity={isSelected ? 0.4 : 0.2}
                  shadowOffsetY={2}
                />
                <Text
                  text={displayText}
                  fill="#ccc"
                  fontFamily={FONT_FAMILY}
                  fontSize={13}
                  padding={12}
                  width={node.width}
                  height={node.height}
                  verticalAlign="top"
                  listening={false}
                />
              </Group>
            )
          })}
        </Layer>
      </Stage>


      {/* Inline text editing overlay */}
      {editingNodeId && (() => {
        const node = canvasData.nodes.find(n => n.id === editingNodeId)
        if (!node) return null
        const screenX = node.x * stageScale + stagePos.x
        const screenY = node.y * stageScale + stagePos.y
        const screenW = node.width * stageScale
        const screenH = node.height * stageScale
        return (
          <textarea
            autoFocus
            value={editText}
            onChange={e => setEditText(e.target.value)}
            onBlur={() => {
              mutate(prev => ({
                ...prev,
                nodes: prev.nodes.map(n =>
                  n.id === editingNodeId ? { ...n, text: editText } : n
                ),
              }))
              setEditingNodeId(null)
            }}
            onKeyDown={e => {
              if (e.key === 'Escape') {
                mutate(prev => ({
                  ...prev,
                  nodes: prev.nodes.map(n =>
                    n.id === editingNodeId ? { ...n, text: editText } : n
                  ),
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
              padding: 12 * stageScale,
              resize: 'none',
              outline: 'none',
              zIndex: 20,
              boxSizing: 'border-box',
            }}
          />
        )
      })()}
    </div>
  )
}
