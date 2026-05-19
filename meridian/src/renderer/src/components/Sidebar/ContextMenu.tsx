import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface ContextMenuItem {
  label: string
  onClick: () => void
  danger?: boolean
}

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler, true)
    return () => document.removeEventListener('mousedown', handler, true)
  }, [onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [onClose])

  const menuWidth = 160
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 8)
  const menuHeight = items.length * 30 + 8
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 8)

  return createPortal(
    <div
      ref={ref}
      style={{
        position: 'fixed', top: adjustedY, left: adjustedX,
        background: '#252525', border: '1px solid #3a3a3a',
        borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        zIndex: 2000, minWidth: menuWidth, overflow: 'hidden',
        padding: '4px 0',
      }}
    >
      {items.map(item => (
        <div
          key={item.label}
          onClick={() => { item.onClick(); onClose() }}
          style={{
            padding: '7px 14px', cursor: 'pointer', fontSize: 13,
            color: item.danger ? '#f66' : '#ccc',
            userSelect: 'none',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#333')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          {item.label}
        </div>
      ))}
    </div>,
    document.body
  )
}
