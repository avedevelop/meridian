import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FolderIcon } from './Icons'
import { useVaultBridge, uniqueFileName } from '../hooks/useVaultBridge'
import { useVaultStore } from '../store/useVaultStore'
import { HeaderSearch } from './HeaderSearch'
import { QuickActionButton } from './QuickActionButton'

import {
  PlusIcon,
  CalendarIcon,
  CanvasIcon,
  GraphIcon,
  SidebarLeftIcon,
  SidebarRightIcon
} from './LayoutIcons'

interface LayoutProps {
  activityBar: React.ReactNode
  sidebar: React.ReactNode
  editor: React.ReactNode
  rightPanel: React.ReactNode
  sidebarCollapsed: boolean
  setSidebarCollapsed: (c: boolean) => void
  rightPanelCollapsed: boolean
  setRightPanelCollapsed: (c: boolean) => void
  activeSidebarTab?: 'files' | 'search' | 'graph' | 'calendar' | 'tasks' | 'git'
  onSidebarTabChange?: (tab: 'files' | 'search' | 'graph' | 'calendar' | 'tasks' | 'git') => void
}

export function Layout({
  activityBar,
  sidebar,
  editor,
  rightPanel,
  sidebarCollapsed,
  setSidebarCollapsed,
  rightPanelCollapsed,
  setRightPanelCollapsed,
  onSidebarTabChange,
  activeSidebarTab
}: LayoutProps) {
  const { t } = useTranslation()
  const { createFile, createCanvas, openDailyNote } = useVaultBridge()
  const vault = useVaultStore((s) => s.vault)
  const vaultFiles = useVaultStore((s) => s.files)
  const activeTabPath = useVaultStore((s) => s.activeTabPath)
  const vaultName = vault?.name ?? t('settings.about.noVault')

  // Get filename and relative folder path
  const filename = activeTabPath ? activeTabPath.split(/[/\\]/).pop()?.replace(/\.md$/, '') : null
  const folderPath =
    activeTabPath && activeTabPath.split(/[/\\]/).length > 1
      ? activeTabPath.split(/[/\\]/).slice(0, -1).filter(Boolean).pop()
      : null

  // When graph tab is active, expand sidebar to full width and hide editor
  const isGraphFullscreen = activeSidebarTab === 'graph' && !sidebarCollapsed

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('layout-sidebar-width')
    return saved ? Math.max(180, parseInt(saved, 10)) : 220
  })

  const [rightPanelWidth, setRightPanelWidth] = useState(() => {
    const saved = localStorage.getItem('layout-right-width')
    return saved ? Math.max(220, parseInt(saved, 10)) : 220
  })

  useEffect(() => {
    const handleReset = () => {
      setSidebarWidth(220)
      setRightPanelWidth(220)
      localStorage.setItem('layout-sidebar-width', '220')
      localStorage.setItem('layout-right-width', '220')
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
      if (newWidth < 120) {
        setRightPanelCollapsed(true)
        localStorage.setItem('layout-right-collapsed', 'true')
      } else {
        setRightPanelCollapsed(false)
        localStorage.setItem('layout-right-collapsed', 'false')
        const clamped = Math.max(220, Math.min(600, newWidth))
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
          justifyContent: 'space-between',
          paddingLeft: 76,
          paddingRight: 12,
          boxSizing: 'border-box',
          position: 'relative',
          // @ts-ignore
          WebkitAppRegion: 'drag'
        }}
      >
        <HeaderSearch />

        {/* Left Section: Vault Name / Breadcrumbs */}
        <div
          style={
            {
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: 'var(--text-secondary)',
              WebkitAppRegion: 'no-drag',
              userSelect: 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '30%'
            } as any
          }
        >
          <FolderIcon size={13} color="var(--accent-color)" />
          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{vaultName}</span>
          {filename && (
            <>
              <span style={{ opacity: 0.4 }}>/</span>
              {folderPath && (
                <>
                  <span style={{ opacity: 0.7 }}>{folderPath}</span>
                  <span style={{ opacity: 0.4 }}>/</span>
                </>
              )}
              <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>{filename}</span>
            </>
          )}
        </div>

        {/* Right Section: Actions & Window Controls */}
        <div
          style={
            {
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              WebkitAppRegion: 'no-drag'
            } as any
          }
        >
          {/* Quick Actions Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <QuickActionButton
              icon={<PlusIcon size={14} />}
              title={t('layout.createNote')}
              onClick={() => {
                if (vault)
                  createFile(vault.path, uniqueFileName(vault.path, 'Untitled', 'md', vaultFiles))
              }}
            />
            <QuickActionButton
              icon={<CanvasIcon size={13} />}
              title={t('layout.createCanvas')}
              onClick={() => {
                if (vault)
                  createCanvas(
                    vault.path,
                    uniqueFileName(vault.path, 'Untitled', 'canvas', vaultFiles)
                  )
              }}
            />
            <QuickActionButton
              icon={<CalendarIcon size={13} />}
              title={t('layout.openDaily')}
              onClick={() => {
                openDailyNote()
              }}
            />
            <QuickActionButton
              icon={<GraphIcon size={13} />}
              title={t('layout.quickGraph')}
              onClick={() => {
                if (onSidebarTabChange) {
                  onSidebarTabChange('graph')
                  setSidebarCollapsed(false)
                  localStorage.setItem('layout-sidebar-collapsed', 'false')
                }
              }}
            />
          </div>

          <div style={{ width: 1, height: 14, background: 'var(--border-color)' }} />

          {!isGraphFullscreen && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {/* Left Sidebar Toggle Button */}
              <button
                onClick={() => {
                  const next = !sidebarCollapsed
                  setSidebarCollapsed(next)
                  localStorage.setItem('layout-sidebar-collapsed', String(next))
                }}
                title={t('layout.toggleLeftSidebar')}
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
                title={t('layout.toggleRightSidebar')}
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
          )}

          {!isGraphFullscreen && (
            <div style={{ width: 1, height: 14, background: 'var(--border-color)' }} />
          )}

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
              transition: 'all 0.15s'
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
            {t('layout.resetLayout')}
          </button>
        </div>
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
            width: isGraphFullscreen ? '100%' : sidebarCollapsed ? 0 : sidebarWidth,
            flex: isGraphFullscreen ? 1 : undefined,
            flexShrink: isGraphFullscreen ? undefined : 0,
            background: 'var(--bg-secondary)',
            display: sidebarCollapsed && !isGraphFullscreen ? 'none' : 'flex',
            flexDirection: 'column'
          }}
        >
          {sidebar}
        </div>

        {/* Sidebar Resizer */}
        {!sidebarCollapsed && !isGraphFullscreen && (
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

        {!isGraphFullscreen && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {editor}
          </div>
        )}

        {/* Right Panel Resizer */}
        {!rightPanelCollapsed && !isGraphFullscreen && (
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
            width: rightPanelCollapsed || isGraphFullscreen ? 0 : rightPanelWidth,
            flexShrink: 0,
            background: 'var(--bg-secondary)',
            display: rightPanelCollapsed || isGraphFullscreen ? 'none' : 'block',
            overflow: 'auto'
          }}
        >
          {rightPanel}
        </div>
      </div>
    </div>
  )
}
