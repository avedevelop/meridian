import { useTranslation } from 'react-i18next'
import { DrawingElement } from './sketchpadUtils'

interface SketchpadToolbarProps {
  tool: 'pencil' | 'rectangle' | 'circle' | 'line' | 'text' | 'eraser'
  setTool: (tool: 'pencil' | 'rectangle' | 'circle' | 'line' | 'text' | 'eraser') => void
  strokeColor: string
  setStrokeColor: (color: string) => void
  strokeWidth: number
  setStrokeWidth: (width: number) => void
  undoStack: DrawingElement[][]
  redoStack: DrawingElement[][]
  handleUndo: () => void
  handleRedo: () => void
  clearCanvas: () => void
  setTextPos: (pos: { x: number; y: number } | null) => void
}

export function SketchpadToolbar({
  tool,
  setTool,
  strokeColor,
  setStrokeColor,
  strokeWidth,
  setStrokeWidth,
  undoStack,
  redoStack,
  handleUndo,
  handleRedo,
  clearCanvas,
  setTextPos
}: SketchpadToolbarProps) {
  const { t } = useTranslation()

  return (
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
      <div
        style={{
          display: 'flex',
          gap: 4,
          background: 'var(--bg-primary)',
          padding: 2,
          borderRadius: 6,
          border: '1px solid var(--border-color)'
        }}
      >
        {(['pencil', 'rectangle', 'circle', 'line', 'text', 'eraser'] as const).map((toolId) => (
          <button
            key={toolId}
            onClick={() => {
              setTool(toolId)
              setTextPos(null)
            }}
            style={{
              background: tool === toolId ? 'var(--accent-color)' : 'transparent',
              color: tool === toolId ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              padding: '6px 10px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
              transition: 'all 0.15s ease'
            }}
          >
            {t(`sketchpad.tools.${toolId}`)}
          </button>
        ))}
      </div>

      {/* Color pickers */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('sketchpad.stroke')}</label>
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
        <label style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('sketchpad.width')}</label>
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
          <option value="1">{t('sketchpad.widthThin')}</option>
          <option value="3">{t('sketchpad.widthMedium')}</option>
          <option value="6">{t('sketchpad.widthThick')}</option>
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
          {t('common.undo')}
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
          {t('common.redo')}
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
          {t('common.clear')}
        </button>
      </div>
    </div>
  )
}
