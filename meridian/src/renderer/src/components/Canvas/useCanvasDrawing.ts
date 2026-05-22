import { useState, useRef, useCallback } from 'react'
import type Konva from 'konva'
import { CanvasData, CanvasNodeData, CanvasEdgeData } from './canvasTypes'
import {
  MAX_SCALE,
  MIN_SCALE,
  SCALE_BY,
  DEFAULT_NODE_W,
  DEFAULT_NODE_H
} from './canvasTools'

interface UseCanvasDrawingProps {
  stageRef: React.RefObject<Konva.Stage | null>
  canvasData: CanvasData
  setCanvasData: React.Dispatch<React.SetStateAction<CanvasData>>
  mutate: (updater: (prev: CanvasData) => CanvasData) => void
  mutateWithUndo: (updater: (prev: CanvasData) => CanvasData) => void
  stagePos: { x: number; y: number }
  setStagePos: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>
  stageScale: number
  setStageScale: React.Dispatch<React.SetStateAction<number>>
  setSelectedNodeId: React.Dispatch<React.SetStateAction<string | null>>
  setSelectedEdgeId: React.Dispatch<React.SetStateAction<string | null>>
  t: (key: string, options?: any) => string
}

export function useCanvasDrawing({
  stageRef,
  canvasData,
  setCanvasData,
  mutate,
  mutateWithUndo,
  stagePos,
  setStagePos,
  stageScale,
  setStageScale,
  setSelectedNodeId,
  setSelectedEdgeId,
  t
}: UseCanvasDrawingProps) {
  const frameChildrenRef = useRef<{ id: string; offsetX: number; offsetY: number }[]>([])
  const shiftDragOriginRef = useRef<string | null>(null)
  const [tempLineEnd, setTempLineEnd] = useState<{ x: number; y: number } | null>(null)

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
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
    },
    [stageRef, setStageScale, setStagePos]
  )

  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      if (e.target === stageRef.current) {
        setStagePos({ x: e.target.x(), y: e.target.y() })
      }
    },
    [stageRef, setStagePos]
  )

  const handleDblClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
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
        text: t('canvas.defaultCardText')
      }

      mutateWithUndo((prev) => ({ ...prev, nodes: [...prev.nodes, newNode] }))
    },
    [stageRef, stagePos, stageScale, mutateWithUndo, t]
  )

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target === stageRef.current) {
        setSelectedNodeId(null)
        setSelectedEdgeId(null)
      }
    },
    [stageRef, setSelectedNodeId, setSelectedEdgeId]
  )

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
  }, [setCanvasData])

  const handleNodeDragEnd = useCallback(
    (nodeId: string, e: Konva.KonvaEventObject<DragEvent>) => {
      const x = e.target.x()
      const y = e.target.y()
      const isFrame = frameChildrenRef.current.length > 0
      mutateWithUndo((prev) => ({
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
    [mutateWithUndo]
  )

  const handleNodeMouseDown = useCallback(
    (nodeId: string, e: Konva.KonvaEventObject<MouseEvent>) => {
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
    [stageRef, stagePos, stageScale, mutate]
  )

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
    [stageRef, stagePos, stageScale]
  )

  const handleStageMouseUp = useCallback(
    (_e: Konva.KonvaEventObject<MouseEvent>) => {
      const origin = shiftDragOriginRef.current
      if (!origin) return
      shiftDragOriginRef.current = null
      setTempLineEnd(null)

      const stage = stageRef.current
      if (!stage) return
      const pointer = stage.getPointerPosition()
      if (!pointer) return

      const canvasX = (pointer.x - stagePos.x) / stageScale
      const canvasY = (pointer.y - stagePos.y) / stageScale

      const targetNode = canvasData.nodes.find(
        (n) =>
          n.id !== origin &&
          canvasX >= n.x &&
          canvasX <= n.x + n.width &&
          canvasY >= n.y &&
          canvasY <= n.y + n.height
      )
      if (!targetNode) return

      mutateWithUndo((prev) => {
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
    [stageRef, mutateWithUndo, canvasData.nodes, stagePos, stageScale]
  )

  return {
    tempLineEnd,
    shiftDragOriginRef,
    handleWheel,
    handleDragEnd,
    handleDblClick,
    handleStageClick,
    handleNodeDragStart,
    handleNodeDragMove,
    handleNodeDragEnd,
    handleNodeMouseDown,
    handleStageMouseMove,
    handleStageMouseUp
  }
}
