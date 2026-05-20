import React, { useState, useEffect, useRef } from 'react'
import { SearchIcon, FileIcon } from './Icons'
import { useLinkStore } from '../store/useLinkStore'
import { useVaultBridge } from '../hooks/useVaultBridge'

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

function HeaderSearch() {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const { search, searchResults } = useLinkStore()
  const { openFile } = useVaultBridge()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Listen to Cmd/Ctrl + K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    search(e.target.value)
    setSelectedIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
        const item = searchResults[selectedIndex]
        openFile(item.path, item.name)
        setFocused(false)
        inputRef.current?.blur()
      } else if (searchResults.length > 0) {
        openFile(searchResults[0].path, searchResults[0].name)
        setFocused(false)
        inputRef.current?.blur()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setFocused(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: '50%',
        top: 5,
        transform: 'translateX(-50%)',
        width: 420,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        // @ts-ignore
        WebkitAppRegion: 'no-drag'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-surface)',
          border: focused ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
          borderRadius: 6,
          height: 28,
          padding: '0 10px',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          boxShadow: focused ? '0 0 0 2px var(--accent-glow)' : 'none',
          cursor: 'text'
        }}
        onClick={() => inputRef.current?.focus()}
      >
        <SearchIcon size={14} color="var(--text-secondary)" style={{ marginRight: 8, flexShrink: 0 }} />
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          placeholder="Search notes... (⌘K)"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: 13,
            height: '100%',
            padding: 0
          }}
        />
        {query && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setQuery('')
              search('')
              setSelectedIndex(-1)
              inputRef.current?.focus()
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 11,
              padding: '0 4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            ✕
          </button>
        )}
      </div>

      {focused && query && (
        <div
          style={{
            marginTop: 8,
            background: 'var(--bg-secondary)',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--border-color)',
            borderRadius: 6,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            maxHeight: 280,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            padding: '4px 0'
          }}
        >
          {searchResults.map((result, idx) => {
            const isSelected = idx === selectedIndex
            return (
              <div
                key={result.path}
                onClick={() => {
                  openFile(result.path, result.name)
                  setFocused(false)
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isSelected ? 'var(--accent-glow)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  borderLeft: isSelected ? '3px solid var(--accent-color)' : '3px solid transparent',
                  transition: 'background 0.15s, color 0.15s'
                }}
              >
                <FileIcon size={12} color={isSelected ? 'var(--accent-color)' : 'var(--text-secondary)'} />
                <span style={{ fontWeight: isSelected ? 500 : 'normal' }}>
                  {result.name.replace(/\.md$/, '')}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.5, maxWidth: '45%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {result.path.split('/').slice(0, -1).join('/')}
                </span>
              </div>
            )
          })}
          {searchResults.length === 0 && (
            <div style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: 11, textAlign: 'center' }}>
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  )
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
    return saved ? Math.max(180, parseInt(saved, 10)) : 220
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
      if (newWidth < 120) {
        setSidebarCollapsed(true)
        localStorage.setItem('layout-sidebar-collapsed', 'true')
      } else {
        setSidebarCollapsed(false)
        localStorage.setItem('layout-sidebar-collapsed', 'false')
        const clamped = Math.max(180, Math.min(600, newWidth))
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
          height: 38,
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: 12,
          boxSizing: 'border-box',
          gap: 12,
          position: 'relative',
          // @ts-ignore
          WebkitAppRegion: 'drag'
        }}
      >
        <HeaderSearch />

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
