import React from 'react'

export interface LayoutResizerProps {
  onMouseDown: (e: React.MouseEvent) => void
  onDoubleClick: () => void
}

/**
 * Vertical column resizer used between sidebar / editor / right panel.
 * Hover state highlights an inner 1px line (accent color, 2px).
 */
export function LayoutResizer({ onMouseDown, onDoubleClick }: LayoutResizerProps) {
  return (
    <div
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      style={{
        width: 6,
        margin: '0 -3px',
        cursor: 'col-resize',
        zIndex: 10,
        position: 'relative',
        flexShrink: 0,
        display: 'flex',
        justifyContent: 'center'
      }}
      onMouseEnter={(e) => {
        const inner = e.currentTarget.firstElementChild as HTMLDivElement | null
        if (inner) {
          inner.style.background = 'var(--accent-color)'
          inner.style.width = '2px'
        }
      }}
      onMouseLeave={(e) => {
        const inner = e.currentTarget.firstElementChild as HTMLDivElement | null
        if (inner) {
          inner.style.background = 'var(--border-color)'
          inner.style.width = '1px'
        }
      }}
    >
      <div
        style={{
          width: 1,
          height: '100%',
          background: 'var(--border-color)',
          transition: 'background 0.15s, width 0.15s'
        }}
      />
    </div>
  )
}
