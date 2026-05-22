import React from 'react'
import { Line } from 'react-konva'
import { EDGE_COLOR, nodeCenter } from '../canvasTools'
import { CanvasData } from '../canvasTypes'

interface CanvasEdgesProps {
  edgeLines: { id: string; points: number[]; bezier: boolean }[]
  selectedEdgeId: string | null
  setSelectedEdgeId: React.Dispatch<React.SetStateAction<string | null>>
  setSelectedNodeId: React.Dispatch<React.SetStateAction<string | null>>
  shiftDragOriginRef: React.RefObject<string | null>
  tempLineEnd: { x: number; y: number } | null
  canvasData: CanvasData
}

export function CanvasEdges({
  edgeLines,
  selectedEdgeId,
  setSelectedEdgeId,
  setSelectedNodeId,
  shiftDragOriginRef,
  tempLineEnd,
  canvasData
}: CanvasEdgesProps) {
  return (
    <>
      {edgeLines.map((edge) => {
        const isEdgeSelected = edge.id === selectedEdgeId
        return (
          <Line
            key={edge.id}
            points={edge.points}
            bezier={edge.bezier}
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
    </>
  )
}
