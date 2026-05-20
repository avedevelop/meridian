import { useState, useEffect, useRef } from 'react'

export interface DrawingElement {
  id: string
  type: 'pencil' | 'rectangle' | 'circle' | 'line' | 'text'
  points?: [number, number][]
  x?: number
  y?: number
  w?: number
  h?: number
  text?: string
  stroke: string
  fill: string
  strokeWidth: number
}

interface SketchpadViewProps {
  filePath: string
  content: string
  onSave: (path: string, content: string) => void
}

export function SketchpadView({ filePath, content, onSave }: SketchpadViewProps) {
  const [elements, setElements] = useState<DrawingElement[]>([])
  const [tool, setTool] = useState<'pencil' | 'rectangle' | 'circle' | 'line' | 'text' | 'eraser'>('pencil')
  const [strokeColor, setStrokeColor] = useState('#7c6af7') // Default purple accent
  const [fillColor] = useState('transparent')
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [textInput, setTextInput] = useState('')
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null)

  // Undo/Redo stacks
  const [undoStack, setUndoStack] = useState<DrawingElement[][]>([])
  const [redoStack, setRedoStack] = useState<DrawingElement[][]>([])

  const svgRef = useRef<SVGSVGElement>(null)
  const isDrawing = useRef(false)
  const currentElementId = useRef<string | null>(null)

  // Load drawing on mount or path change
  useEffect(() => {
    try {
      if (content.trim()) {
        const parsed = JSON.parse(content)
        if (parsed.type === 'meridian-drawing' && Array.isArray(parsed.elements)) {
          setElements(parsed.elements)
          setUndoStack([])
          setRedoStack([])
          return
        }
      }
    } catch (e) {
      // Not a valid drawing or empty
    }
    // Initialize empty
    setElements([])
    setUndoStack([])
    setRedoStack([])
  }, [filePath, content])

  // Save drawing content
  const saveDrawing = (newElements: DrawingElement[]) => {
    const data = {
      type: 'meridian-drawing',
      elements: newElements
    }
    onSave(filePath, JSON.stringify(data, null, 2))
  }

  const pushState = (oldElements: DrawingElement[]) => {
    setUndoStack((prev) => [...prev, oldElements])
    setRedoStack([]) // Clear redo
  }

  // Use refs so keydown handler always sees latest stacks without stale closure
  const undoStackRef = useRef(undoStack)
  undoStackRef.current = undoStack
  const redoStackRef = useRef(redoStack)
  redoStackRef.current = redoStack
  const elementsRef = useRef(elements)
  elementsRef.current = elements

  const handleUndo = () => {
    if (undoStackRef.current.length === 0) return
    const prev = undoStackRef.current[undoStackRef.current.length - 1]
    setUndoStack(stack => stack.slice(0, -1))
    setRedoStack(stack => [...stack, elementsRef.current])
    setElements(prev)
    saveDrawing(prev)
  }

  const handleRedo = () => {
    if (redoStackRef.current.length === 0) return
    const next = redoStackRef.current[redoStackRef.current.length - 1]
    setRedoStack(stack => stack.slice(0, -1))
    setUndoStack(stack => [...stack, elementsRef.current])
    setElements(next)
    saveDrawing(next)
  }

  // ⌘Z / ⌘⇧Z keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== 'z') return
      e.preventDefault()
      if (e.shiftKey) {
        handleRedo()
      } else {
        handleUndo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, []) // empty deps — handleUndo/Redo use refs, always fresh

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
      // Find element under cursor and delete
      const clickedElement = elements.find((el) => {
        if (el.type === 'rectangle' && el.x !== undefined && el.y !== undefined && el.w !== undefined && el.h !== undefined) {
          return x >= el.x && x <= el.x + el.w && y >= el.y && y <= el.y + el.h
        }
        if (el.type === 'circle' && el.x !== undefined && el.y !== undefined && el.w !== undefined) {
          const dist = Math.sqrt((x - el.x) ** 2 + (y - el.y) ** 2)
          return dist <= el.w
        }
        return false // Simple check for eraser
      })

      if (clickedElement) {
        pushState(elements)
        const updated = elements.filter((el) => el.id !== clickedElement.id)
        setElements(updated)
        saveDrawing(updated)
      }
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
      ...(tool === 'pencil' ? { points: [[x, y]] } : { x, y, w: 0, h: 0 })
    }

    setElements((prev) => [...prev, newElement])
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing.current || !currentElementId.current || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

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
    if (isDrawing.current) {
      isDrawing.current = false
      currentElementId.current = null
      saveDrawing(elements)
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
    if (window.confirm('Are you sure you want to clear the sketchpad?')) {
      pushState(elements)
      setElements([])
      saveDrawing([])
    }
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        background: 'var(--bg-tertiary)',
        overflow: 'hidden'
      }}
    >
      {/* Floating Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 16px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          zIndex: 10
        }}
      >
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-primary)', padding: 2, borderRadius: 6, border: '1px solid var(--border-color)' }}>
          {(['pencil', 'rectangle', 'circle', 'line', 'text', 'eraser'] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTool(t)
                setTextPos(null)
              }}
              style={{
                background: tool === t ? 'var(--accent-color)' : 'transparent',
                color: tool === t ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                padding: '6px 10px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
                textTransform: 'capitalize',
                transition: 'all 0.15s ease'
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Color pickers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Stroke:</label>
          {['#7c6af7', '#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#f3f4f6', '#9ca3af'].map((color) => (
            <button
              key={color}
              onClick={() => setStrokeColor(color)}
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: color,
                border: strokeColor === color ? '2px solid #fff' : '1px solid var(--border-color)',
                cursor: 'pointer',
                padding: 0
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Width:</label>
          <select
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            style={{
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 4,
              padding: '2px 4px',
              fontSize: 11,
              cursor: 'pointer'
            }}
          >
            <option value="1">Thin</option>
            <option value="3">Medium</option>
            <option value="6">Thick</option>
          </select>
        </div>

        {/* Undo/Redo & Clear */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            style={{
              background: 'var(--bg-primary)',
              color: undoStack.length === 0 ? 'var(--border-color)' : 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              padding: '4px 8px',
              borderRadius: 4,
              cursor: undoStack.length === 0 ? 'default' : 'pointer',
              fontSize: 11
            }}
          >
            Undo
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            style={{
              background: 'var(--bg-primary)',
              color: redoStack.length === 0 ? 'var(--border-color)' : 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              padding: '4px 8px',
              borderRadius: 4,
              cursor: redoStack.length === 0 ? 'default' : 'pointer',
              fontSize: 11
            }}
          >
            Redo
          </button>
          <button
            onClick={clearCanvas}
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              padding: '4px 8px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 11
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <svg
        ref={svgRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          cursor: tool === 'eraser' ? 'cell' : tool === 'text' ? 'text' : 'crosshair',
          backgroundImage: 'radial-gradient(var(--border-color) 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }}
      >
        {elements.map((el) => {
          if (el.type === 'pencil' && el.points && el.points.length > 0) {
            const d = `M ${el.points[0][0]} ${el.points[0][1]} ` + el.points.slice(1).map((p) => `L ${p[0]} ${p[1]}`).join(' ')
            return (
              <path
                key={el.id}
                d={d}
                stroke={el.stroke}
                strokeWidth={el.strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )
          }

          if (el.type === 'rectangle' && el.x !== undefined && el.y !== undefined && el.w !== undefined && el.h !== undefined) {
            return (
              <rect
                key={el.id}
                x={el.w < 0 ? el.x + el.w : el.x}
                y={el.h < 0 ? el.y + el.h : el.y}
                width={Math.abs(el.w)}
                height={Math.abs(el.h)}
                stroke={el.stroke}
                strokeWidth={el.strokeWidth}
                fill={el.fill}
              />
            )
          }

          if (el.type === 'circle' && el.x !== undefined && el.y !== undefined && el.w !== undefined) {
            return (
              <circle
                key={el.id}
                cx={el.x}
                cy={el.y}
                r={el.w}
                stroke={el.stroke}
                strokeWidth={el.strokeWidth}
                fill={el.fill}
              />
            )
          }

          if (el.type === 'line' && el.x !== undefined && el.y !== undefined && el.w !== undefined && el.h !== undefined) {
            return (
              <line
                key={el.id}
                x1={el.x}
                y1={el.y}
                x2={el.w}
                y2={el.h}
                stroke={el.stroke}
                strokeWidth={el.strokeWidth}
              />
            )
          }

          if (el.type === 'text' && el.x !== undefined && el.y !== undefined && el.text) {
            return (
              <text
                key={el.id}
                x={el.x}
                y={el.y}
                fill={el.stroke}
                fontSize={el.strokeWidth}
                fontFamily="sans-serif"
              >
                {el.text}
              </text>
            )
          }

          return null
        })}
      </svg>

      {/* Floating Text Input Box */}
      {textPos && (
        <div
          style={{
            position: 'absolute',
            left: textPos.x,
            top: textPos.y - 12,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 4,
            padding: '4px 8px',
            zIndex: 100
          }}
        >
          <input
            autoFocus
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTextCommit()
              if (e.key === 'Escape') setTextPos(null)
            }}
            placeholder="Type text, Enter..."
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 12
            }}
          />
        </div>
      )}
    </div>
  )
}
