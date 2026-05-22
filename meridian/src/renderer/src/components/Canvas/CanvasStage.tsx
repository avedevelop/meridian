import React, { useMemo, useRef, useEffect } from 'react'
import { Stage, Layer, Rect, Transformer } from 'react-konva'
import type Konva from 'konva'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useVaultStore } from '../../store/useVaultStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'
import { CanvasData } from './canvasTypes'
import { useCanvasDrawing } from './useCanvasDrawing'
import { BG, FONT_FAMILY, getEdgePoints } from './canvasTools'

import { DotGrid } from './stages/DotGrid'
import { CanvasEdges } from './stages/CanvasEdges'
import { CanvasNode } from './stages/CanvasNode'
import { CanvasNodeToolbar } from './stages/CanvasNodeToolbar'

interface CanvasStageProps {
  stageRef: React.RefObject<Konva.Stage | null>
  size: { width: number; height: number }
  stagePos: { x: number; y: number }
  setStagePos: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>
  stageScale: number
  setStageScale: React.Dispatch<React.SetStateAction<number>>
  spaceHeld: boolean
  shiftHeld: boolean
  canvasData: CanvasData
  setCanvasData: React.Dispatch<React.SetStateAction<CanvasData>>
  mutate: (updater: (prev: CanvasData) => CanvasData) => void
  mutateWithUndo: (updater: (prev: CanvasData) => CanvasData) => void
  selectedNodeId: string | null
  setSelectedNodeId: React.Dispatch<React.SetStateAction<string | null>>
  selectedEdgeId: string | null
  setSelectedEdgeId: React.Dispatch<React.SetStateAction<string | null>>
  editingNodeId: string | null
  setEditingNodeId: React.Dispatch<React.SetStateAction<string | null>>
  editText: string
  setEditText: React.Dispatch<React.SetStateAction<string>>
  initialEditingHeight: number
  setInitialEditingHeight: React.Dispatch<React.SetStateAction<number>>
  fileContents: Record<string, string>
  urlMetadata: Record<string, any>
  openFile: (path: string, name: string) => void
}

export function CanvasStage({
  stageRef,
  size,
  stagePos,
  setStagePos,
  stageScale,
  setStageScale,
  spaceHeld,
  shiftHeld,
  canvasData,
  setCanvasData,
  mutate,
  mutateWithUndo,
  selectedNodeId,
  setSelectedNodeId,
  selectedEdgeId,
  setSelectedEdgeId,
  editingNodeId,
  setEditingNodeId,
  editText,
  setEditText,
  initialEditingHeight,
  setInitialEditingHeight,
  fileContents,
  urlMetadata,
  openFile
}: CanvasStageProps) {
  const connectionLineStyle = useSettingsStore((s) => s.connectionLineStyle) || 'curved'
  const vault = useVaultStore((s) => s.vault)
  const { refreshFiles } = useVaultBridge()

  const trRef = useRef<Konva.Transformer>(null)
  const nodeRefs = useRef<Record<string, Konva.Group | null>>({})
  const nodeMinHeights = useRef<Record<string, number>>({})

  const {
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
  } = useCanvasDrawing({
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
    t: (key: string) => key // TFunction mock not needed directly here
  })

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

  const edgeLines = useMemo(() => {
    const nodeMap = new Map(canvasData.nodes.map((n) => [n.id, n]))
    return canvasData.edges
      .map((edge) => {
        const from = nodeMap.get(edge.fromNode)
        const to = nodeMap.get(edge.toNode)
        if (!from || !to) return null
        const res = getEdgePoints(from, to, connectionLineStyle)
        return {
          id: edge.id,
          points: res.points,
          bezier: res.bezier ?? false
        }
      })
      .filter(Boolean) as { id: string; points: number[]; bezier: boolean }[]
  }, [canvasData, connectionLineStyle])

  return (
    <>
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
          {canvasData.nodes
            .filter((node) => node.type === 'frame')
            .map((node) => (
              <CanvasNode
                key={node.id}
                node={node}
                selectedNodeId={selectedNodeId}
                spaceHeld={spaceHeld}
                shiftHeld={shiftHeld}
                canvasData={canvasData}
                setCanvasData={setCanvasData}
                mutateWithUndo={mutateWithUndo}
                setSelectedNodeId={setSelectedNodeId}
                setSelectedEdgeId={setSelectedEdgeId}
                setEditingNodeId={setEditingNodeId}
                setEditText={setEditText}
                setInitialEditingHeight={setInitialEditingHeight}
                fileContents={fileContents}
                urlMetadata={urlMetadata}
                openFile={openFile}
                handleNodeDragStart={handleNodeDragStart}
                handleNodeDragEnd={handleNodeDragEnd}
                handleNodeDragMove={handleNodeDragMove}
                handleNodeMouseDown={handleNodeMouseDown}
                nodeMinHeights={nodeMinHeights}
                nodeRefs={nodeRefs}
              />
            ))}
        </Layer>

        {/* Layer 3: Edges */}
        <Layer>
          <CanvasEdges
            edgeLines={edgeLines}
            selectedEdgeId={selectedEdgeId}
            setSelectedEdgeId={setSelectedEdgeId}
            setSelectedNodeId={setSelectedNodeId}
            shiftDragOriginRef={shiftDragOriginRef}
            tempLineEnd={tempLineEnd}
            canvasData={canvasData}
          />
        </Layer>

        {/* Layer 4: Cards & Transformer */}
        <Layer>
          {canvasData.nodes
            .filter((node) => node.type !== 'frame')
            .map((node) => (
              <CanvasNode
                key={node.id}
                node={node}
                selectedNodeId={selectedNodeId}
                spaceHeld={spaceHeld}
                shiftHeld={shiftHeld}
                canvasData={canvasData}
                setCanvasData={setCanvasData}
                mutateWithUndo={mutateWithUndo}
                setSelectedNodeId={setSelectedNodeId}
                setSelectedEdgeId={setSelectedEdgeId}
                setEditingNodeId={setEditingNodeId}
                setEditText={setEditText}
                setInitialEditingHeight={setInitialEditingHeight}
                fileContents={fileContents}
                urlMetadata={urlMetadata}
                openFile={openFile}
                handleNodeDragStart={handleNodeDragStart}
                handleNodeDragEnd={handleNodeDragEnd}
                handleNodeDragMove={handleNodeDragMove}
                handleNodeMouseDown={handleNodeMouseDown}
                nodeMinHeights={nodeMinHeights}
                nodeRefs={nodeRefs}
              />
            ))}
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

                const targetH = Math.max(intrinsicH, initialEditingHeight)
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

                const finalH = Math.max(trimmedH, initialEditingHeight)

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

                  const finalH = Math.max(trimmedH, initialEditingHeight)

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
      {selectedNodeId && (
        <CanvasNodeToolbar
          selectedNodeId={selectedNodeId}
          canvasData={canvasData}
          stageScale={stageScale}
          stagePos={stagePos}
          spaceHeld={spaceHeld}
          shiftHeld={shiftHeld}
          vault={vault}
          refreshFiles={refreshFiles}
          mutate={mutate}
          setSelectedNodeId={setSelectedNodeId}
          editingNodeId={editingNodeId}
        />
      )}
    </>
  )
}
