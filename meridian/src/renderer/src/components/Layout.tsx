import React, { useState, useEffect } from 'react'

const SidebarLeftIcon = ({ active }: { active: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="2" width="12" height="12" rx="1.5" />
    <path d="M6 2v12" strokeWidth="1.2" />
    {active && <rect x="2.5" y="2.5" width="3" height="11" fill="currentColor" opacity="0.15" stroke="none" />}
  </svg>
)

const SidebarRightIcon = ({ active }: { active: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="2" width="12" height="12" rx="1.5" />
    <path d="M10 2v12" strokeWidth="1.2" />
    {active && <rect x="10.5" y="2.5" width="3" height="11" fill="currentColor" opacity="0.15" stroke="none" />}
  </svg>
)

interface LayoutProps {
  activityBar: React.ReactNode
  sidebar: React.ReactNode
  editor: React.ReactNode
  rightPanel: React.ReactNode
  sidebarCollapsed: boolean
  setSidebarCollapsed: (c: boolean) => void
  rightPanelCollapsed: boolean
  setRightPanelCollapsed: (c: boolean) => void
}

export function Layout({
  activityBar,
  sidebar,
  editor,
  rightPanel,
  sidebarCollapsed,
  setSidebarCollapsed,
  rightPanelCollapsed,
  setRightPanelCollapsed
}: LayoutProps) {
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
      setSidebarCollapsed(false)
      setRightPanelCollapsed(false)
      localStorage.setItem('layout-sidebar-collapsed', 'false')
      localStorage.setItem('layout-right-collapsed', 'false')
    }
    window.addEventListener('layout:reset', handleReset)
    return () => window.removeEventListener('layout:reset', handleReset)
  }, [setSidebarCollapsed, setRightPanelCollapsed])

  const handleSidebarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = sidebarWidth

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const newWidth = startWidth + deltaX
      if (newWidth < 80) {
        setSidebarCollapsed(true)
        localStorage.setItem('layout-sidebar-collapsed', 'true')
      } else {
        setSidebarCollapsed(false)
        localStorage.setItem('layout-sidebar-collapsed', 'false')
        const clamped = Math.max(150, Math.min(600, newWidth))
        setSidebarWidth(clamped)
        localStorage.setItem('layout-sidebar-width', clamped.toString())
      }
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
      const newWidth = startWidth + deltaX
      if (newWidth < 80) {
        setRightPanelCollapsed(true)
        localStorage.setItem('layout-right-collapsed', 'true')
      } else {
        setRightPanelCollapsed(false)
        localStorage.setItem('layout-right-collapsed', 'false')
        const clamped = Math.max(150, Math.min(600, newWidth))
        setRightPanelWidth(clamped)
        localStorage.setItem('layout-right-width', clamped.toString())
      }
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
          gap: 12,
          // @ts-ignore
          WebkitAppRegion: 'drag'
        }}
      >
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', WebkitAppRegion: 'no-drag' } as any}>
          {/* Left Sidebar Toggle Button */}
          <button
            onClick={() => {
              const next = !sidebarCollapsed
              setSidebarCollapsed(next)
              localStorage.setItem('layout-sidebar-collapsed', String(next))
            }}
            title="Toggle Primary Side Bar (⌘B)"
            style={{
              background: 'transparent',
              border: 'none',
              color: sidebarCollapsed ? 'var(--text-secondary)' : 'var(--accent-color)',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-surface)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <SidebarLeftIcon active={!sidebarCollapsed} />
          </button>

          {/* Right Sidebar Toggle Button */}
          <button
            onClick={() => {
              const next = !rightPanelCollapsed
              setRightPanelCollapsed(next)
              localStorage.setItem('layout-right-collapsed', String(next))
            }}
            title="Toggle Secondary Side Bar (⌘⌥B)"
            style={{
              background: 'transparent',
              border: 'none',
              color: rightPanelCollapsed ? 'var(--text-secondary)' : 'var(--accent-color)',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-surface)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <SidebarRightIcon active={!rightPanelCollapsed} />
          </button>
        </div>

        <div style={{ width: 1, height: 14, background: 'var(--border-color)', WebkitAppRegion: 'no-drag' } as any} />

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
            width: sidebarCollapsed ? 0 : sidebarWidth,
            flexShrink: 0,
            background: 'var(--bg-secondary)',
            display: sidebarCollapsed ? 'none' : 'flex',
            flexDirection: 'column'
          }}
        >
          {sidebar}
        </div>

        {/* Sidebar Resizer */}
        {!sidebarCollapsed && (
          <div
            onMouseDown={handleSidebarMouseDown}
            onDoubleClick={() => {
              const next = !sidebarCollapsed
              setSidebarCollapsed(next)
              localStorage.setItem('layout-sidebar-collapsed', String(next))
            }}
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
        )}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {editor}
        </div>

        {/* Right Panel Resizer */}
        {!rightPanelCollapsed && (
          <div
            onMouseDown={handleRightMouseDown}
            onDoubleClick={() => {
              const next = !rightPanelCollapsed
              setRightPanelCollapsed(next)
              localStorage.setItem('layout-right-collapsed', String(next))
            }}
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
        )}

        <div
          style={{
            width: rightPanelCollapsed ? 0 : rightPanelWidth,
            flexShrink: 0,
            background: 'var(--bg-secondary)',
            display: rightPanelCollapsed ? 'none' : 'block',
            overflow: 'auto'
          }}
        >
          {rightPanel}
        </div>
      </div>
    </div>
  )
}
