import { useState, useEffect } from 'react'
import { CanvasData } from './canvasTypes'

interface UseCanvasKeysProps {
  selectedNodeId: string | null
  setSelectedNodeId: React.Dispatch<React.SetStateAction<string | null>>
  selectedEdgeId: string | null
  setSelectedEdgeId: React.Dispatch<React.SetStateAction<string | null>>
  editingNodeId: string | null
  mutateWithUndo: (updater: (prev: CanvasData) => CanvasData) => void
}

export function useCanvasKeys({
  selectedNodeId,
  setSelectedNodeId,
  selectedEdgeId,
  setSelectedEdgeId,
  editingNodeId,
  mutateWithUndo
}: UseCanvasKeysProps) {
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
  }, [selectedNodeId, selectedEdgeId, editingNodeId, mutateWithUndo])

  return { spaceHeld, shiftHeld }
}
