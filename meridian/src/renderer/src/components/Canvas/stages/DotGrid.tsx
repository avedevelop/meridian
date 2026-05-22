import { useMemo } from 'react'
import { Circle } from 'react-konva'
import { DOT_COLOR, DOT_SPACING, DOT_RADIUS } from '../canvasTools'

interface DotGridProps {
  stageX: number
  stageY: number
  stageScale: number
  width: number
  height: number
}

export function DotGrid({ stageX, stageY, stageScale, width, height }: DotGridProps) {
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
