import { useTranslation } from 'react-i18next'
import { useSketchpadState } from './useSketchpadState'
import { SketchpadToolbar } from './SketchpadToolbar'
import { ERASER_RADIUS } from './sketchpadUtils'

export type { DrawingElement } from './sketchpadUtils'

interface SketchpadViewProps {
  filePath: string
  content: string
  onSave: (path: string, content: string) => void
}

export function SketchpadView({ filePath, content, onSave }: SketchpadViewProps) {
  const { t } = useTranslation()
  const {
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
  } = useSketchpadState({ filePath, content, onSave })

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
      <SketchpadToolbar
        tool={tool}
        setTool={setTool}
        strokeColor={strokeColor}
        setStrokeColor={setStrokeColor}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
        undoStack={undoStack}
        redoStack={redoStack}
        handleUndo={handleUndo}
        handleRedo={handleRedo}
        clearCanvas={clearCanvas}
        setTextPos={setTextPos}
      />

      {/* SVG Canvas Area */}
      <svg
        ref={svgRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseUp()
          setMousePos(null)
        }}
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          cursor: tool === 'eraser' ? 'none' : tool === 'text' ? 'text' : 'crosshair',
          backgroundImage: 'radial-gradient(var(--border-color) 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }}
      >
        {elements.map((el) => {
          if (el.type === 'pencil' && el.points && el.points.length > 0) {
            const d =
              `M ${el.points[0][0]} ${el.points[0][1]} ` +
              el.points
                .slice(1)
                .map((p) => `L ${p[0]} ${p[1]}`)
                .join(' ')
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

          if (
            el.type === 'rectangle' &&
            el.x !== undefined &&
            el.y !== undefined &&
            el.w !== undefined &&
            el.h !== undefined
          ) {
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

          if (
            el.type === 'circle' &&
            el.x !== undefined &&
            el.y !== undefined &&
            el.w !== undefined
          ) {
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

          if (
            el.type === 'line' &&
            el.x !== undefined &&
            el.y !== undefined &&
            el.w !== undefined &&
            el.h !== undefined
          ) {
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

        {/* Eraser brush circle — shows where eraser will hit */}
        {tool === 'eraser' && mousePos && (
          <circle
            cx={mousePos.x}
            cy={mousePos.y}
            r={ERASER_RADIUS}
            fill="rgba(255,255,255,0.08)"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth={1}
            style={{ pointerEvents: 'none' }}
          />
        )}
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
            placeholder={t('sketchpad.textPlaceholder')}
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
