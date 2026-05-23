import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { DrawingElement, applyEraserAt } from './sketchpadUtils'

interface UseSketchpadStateProps {
  filePath: string
  content: string
  onSave: (path: string, content: string) => void
}

export function useSketchpadState({ filePath, content, onSave }: UseSketchpadStateProps) {
  const { t } = useTranslation()
  const [elements, setElements] = useState<DrawingElement[]>([])
  const [tool, setTool] = useState<'pencil' | 'rectangle' | 'circle' | 'line' | 'text' | 'eraser'>(
    'pencil'
  )
  const [strokeColor, setStrokeColor] = useState('#7c6af7') // Default purple accent
  const [fillColor] = useState('transparent')
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [textInput, setTextInput] = useState('')
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)

  // Undo/Redo stacks
  const [undoStack, setUndoStack] = useState<DrawingElement[][]>([])
  const [redoStack, setRedoStack] = useState<DrawingElement[][]>([])

  const svgRef = useRef<SVGSVGElement>(null)
  const isDrawing = useRef(false)
  const currentElementId = useRef<string | null>(null)
  const eraserActiveRef = useRef(false) // separate flag for eraser drag

  // Refs always holding the latest values — used in stable callbacks below
  const undoStackRef = useRef(undoStack)
  undoStackRef.current = undoStack
  const redoStackRef = useRef(redoStack)
  redoStackRef.current = redoStack
  const elementsRef = useRef(elements)
  elementsRef.current = elements
  const filePathRef = useRef(filePath)
  filePathRef.current = filePath
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  const loadedPathsRef = useRef<Record<string, string>>({})

  // Load drawing only when the FILE changes or on initial asynchronous load
  useEffect(() => {
    const lastLoadedContent = loadedPathsRef.current[filePath]
    const isNewFile = lastLoadedContent === undefined
    const isInitialLoad = !lastLoadedContent && content.trim() !== ''

    if (isNewFile || isInitialLoad) {
      try {
        if (content.trim()) {
          const parsed = JSON.parse(content)
          if (parsed.type === 'meridian-drawing' && Array.isArray(parsed.elements)) {
            setElements(parsed.elements)
            setUndoStack([])
            setRedoStack([])
            loadedPathsRef.current[filePath] = content
            return
          }
        }
      } catch {
        // not valid drawing
      }
      setElements([])
      setUndoStack([])
      setRedoStack([])
      loadedPathsRef.current[filePath] = content
    }
  }, [filePath, content])

  // Stable save function via ref — never goes stale in callbacks
  const saveDrawing = useCallback((newElements: DrawingElement[]) => {
    onSaveRef.current(
      filePathRef.current,
      JSON.stringify(
        {
          type: 'meridian-drawing',
          elements: newElements
        },
        null,
        2
      )
    )
  }, [])

  const pushState = useCallback((oldElements: DrawingElement[]) => {
    setUndoStack((prev) => [...prev, oldElements])
    setRedoStack([])
  }, [])

  // Stable undo/redo handlers using refs — safe to use in keydown with [] deps
  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return
    const prev = undoStackRef.current[undoStackRef.current.length - 1]
    setUndoStack((s) => s.slice(0, -1))
    setRedoStack((s) => [...s, elementsRef.current])
    setElements(prev)
    saveDrawing(prev)
  }, [saveDrawing])

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return
    const next = redoStackRef.current[redoStackRef.current.length - 1]
    setRedoStack((s) => s.slice(0, -1))
    setUndoStack((s) => [...s, elementsRef.current])
    setElements(next)
    saveDrawing(next)
  }, [saveDrawing])

  // Keep latest undo/redo in refs so keydown always calls current version
  const handleUndoRef = useRef(handleUndo)
  handleUndoRef.current = handleUndo
  const handleRedoRef = useRef(handleRedo)
  handleRedoRef.current = handleRedo

  // ⌘Z / ⌘⇧Z — stable handler, accesses latest via refs
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== 'z') return
      e.preventDefault()
      if (e.shiftKey) handleRedoRef.current()
      else handleUndoRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (textPos) {
      // Commit text
      handleTextCommit()
      return
    }

    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (tool === 'eraser') {
      // Push undo once at stroke start; actual erasing happens in mousemove
      pushState(elements)
      eraserActiveRef.current = true
      return
    }

    if (tool === 'text') {
      setTextPos({ x, y })
      setTextInput('')
      return
    }

    isDrawing.current = true
    pushState(elements)
    const id = `el-${Date.now()}`
    currentElementId.current = id

    const newElement: DrawingElement = {
      id,
      type: tool,
      stroke: strokeColor,
      fill: fillColor,
      strokeWidth,
      // line uses w/h as x2/y2 — init at same point to avoid diagonal flash
      ...(tool === 'pencil'
        ? { points: [[x, y]] }
        : { x, y, w: tool === 'line' ? x : 0, h: tool === 'line' ? y : 0 })
    }

    setElements((prev) => [...prev, newElement])
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (tool === 'eraser') {
      setMousePos({ x, y })
      if (e.buttons === 1) {
        setElements((prev) => {
          const next = applyEraserAt(prev, x, y)
          if (next.length !== prev.length || next.some((el, i) => el !== prev[i])) saveDrawing(next)
          return next
        })
      }
      return
    }

    if (!isDrawing.current || !currentElementId.current) return

    setElements((prev) =>
      prev.map((el) => {
        if (el.id !== currentElementId.current) return el

        if (el.type === 'pencil' && el.points) {
          return { ...el, points: [...el.points, [x, y]] }
        }

        if (el.x !== undefined && el.y !== undefined) {
          if (el.type === 'rectangle' || el.type === 'circle') {
            return {
              ...el,
              w: el.type === 'circle' ? Math.sqrt((x - el.x) ** 2 + (y - el.y) ** 2) : x - el.x,
              h: y - el.y
            }
          }
          if (el.type === 'line') {
            return {
              ...el,
              w: x, // We abuse w and h for end x and y for simple line drawing
              h: y
            }
          }
        }

        return el
      })
    )
  }

  const handleMouseUp = () => {
    eraserActiveRef.current = false
    if (isDrawing.current) {
      isDrawing.current = false
      currentElementId.current = null
      saveDrawing(elementsRef.current)
    }
  }

  const handleTextCommit = () => {
    if (!textPos || !textInput.trim()) {
      setTextPos(null)
      return
    }
    pushState(elements)
    const newElement: DrawingElement = {
      id: `el-${Date.now()}`,
      type: 'text',
      x: textPos.x,
      y: textPos.y,
      text: textInput.trim(),
      stroke: strokeColor,
      fill: 'transparent',
      strokeWidth: 16 // font size
    }
    const updated = [...elements, newElement]
    setElements(updated)
    saveDrawing(updated)
    setTextPos(null)
    setTextInput('')
  }

  const clearCanvas = () => {
    if (window.confirm(t('sketchpad.clearConfirm'))) {
      pushState(elements)
      setElements([])
      saveDrawing([])
    }
  }

  return {
    elements,
    tool,
    setTool,
    strokeColor,
    setStrokeColor,
    strokeWidth,
    setStrokeWidth,
    textInput,
    setTextInput,
    textPos,
    setTextPos,
    mousePos,
    setMousePos,
    undoStack,
    redoStack,
    svgRef,
    handleUndo,
    handleRedo,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTextCommit,
    clearCanvas
  }
}
