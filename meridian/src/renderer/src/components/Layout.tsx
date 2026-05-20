import React, { useState, useEffect } from 'react'

interface LayoutProps {
  activityBar: React.ReactNode
  sidebar: React.ReactNode
  editor: React.ReactNode
  rightPanel: React.ReactNode
}

export function Layout({ activityBar, sidebar, editor, rightPanel }: LayoutProps) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('layout-sidebar-width')
    return saved ? parseInt(saved, 10) : 220
  })

  const [rightPanelWidth, setRightPanelWidth] = useState(() => {
    const saved = localStorage.getItem('layout-right-width')
    return saved ? parseInt(saved, 10) : 200
  })

  useEffect(() => {
    const handleReset = () => {
      setSidebarWidth(220)
      setRightPanelWidth(200)
      localStorage.setItem('layout-sidebar-width', '220')
      localStorage.setItem('layout-right-width', '200')
    }
    window.addEventListener('layout:reset', handleReset)
    return () => window.removeEventListener('layout:reset', handleReset)
  }, [])

  const handleSidebarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = sidebarWidth

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const newWidth = Math.max(150, Math.min(600, startWidth + deltaX))
      setSidebarWidth(newWidth)
      localStorage.setItem('layout-sidebar-width', newWidth.toString())
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleRightMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = rightPanelWidth

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX
      const newWidth = Math.max(150, Math.min(600, startWidth + deltaX))
      setRightPanelWidth(newWidth)
      localStorage.setItem('layout-right-width', newWidth.toString())
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleResetLayout = () => {
    window.dispatchEvent(new Event('layout:reset'))
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden'
      }}
    >
      {/* Single full-width title bar — no seam */}
      <div
        style={{
          height: 28,
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: 12,
          boxSizing: 'border-box',
          // @ts-ignore
          WebkitAppRegion: 'drag'
        }}
      >
        <button
          onClick={handleResetLayout}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: 11,
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            cursor: 'pointer',
            padding: '2px 8px',
            borderRadius: 4,
            transition: 'all 0.15s',
            // @ts-ignore
            WebkitAppRegion: 'no-drag'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-surface)'
            e.currentTarget.style.color = 'var(--text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }}
        >
          Reset Layout
        </button>
      </div>

      {/* Content row: activity bar + sidebar + resizer + editor + resizer + right panel */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          background: 'var(--bg-primary)'
        }}
      >
        {activityBar}
        <div
          style={{
            width: sidebarWidth,
            flexShrink: 0,
            background: 'var(--bg-secondary)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {sidebar}
        </div>

        {/* Sidebar Resizer */}
        <div
          onMouseDown={handleSidebarMouseDown}
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
            const inner = e.currentTarget.firstElementChild as HTMLDivElement
            if (inner) {
              inner.style.background = 'var(--accent-color)'
              inner.style.width = '2px'
            }
          }}
          onMouseLeave={(e) => {
            const inner = e.currentTarget.firstElementChild as HTMLDivElement
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

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {editor}
        </div>

        {/* Right Panel Resizer */}
        <div
          onMouseDown={handleRightMouseDown}
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
            const inner = e.currentTarget.firstElementChild as HTMLDivElement
            if (inner) {
              inner.style.background = 'var(--accent-color)'
              inner.style.width = '2px'
            }
          }}
          onMouseLeave={(e) => {
            const inner = e.currentTarget.firstElementChild as HTMLDivElement
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

        <div
          style={{
            width: rightPanelWidth,
            flexShrink: 0,
            background: 'var(--bg-secondary)',
            overflow: 'auto'
          }}
        >
          {rightPanel}
        </div>
      </div>
    </div>
  )
}
