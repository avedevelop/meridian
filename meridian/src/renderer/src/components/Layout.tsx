import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useVaultBridge, uniqueFileName } from '../hooks/useVaultBridge'
import { useVaultStore } from '../store/useVaultStore'
import { LayoutHeader } from './LayoutHeader'
import { LayoutResizer } from './LayoutResizer'

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

const SIDEBAR_MIN_WIDTH = 180
const RIGHT_PANEL_MIN_WIDTH = 220
const COLLAPSE_THRESHOLD = 120
const PANEL_MAX_WIDTH = 600

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

  const filename = activeTabPath ? activeTabPath.split(/[/\\]/).pop()?.replace(/\.md$/, '') ?? null : null
  const folderPath =
    activeTabPath && activeTabPath.split(/[/\\]/).length > 1
      ? activeTabPath.split(/[/\\]/).slice(0, -1).filter(Boolean).pop() ?? null
      : null

  // When graph tab is active, expand sidebar to full width and hide editor
  const isGraphFullscreen = activeSidebarTab === 'graph' && !sidebarCollapsed

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('layout-sidebar-width')
    return saved ? Math.max(SIDEBAR_MIN_WIDTH, parseInt(saved, 10)) : 220
  })

  const [rightPanelWidth, setRightPanelWidth] = useState(() => {
    const saved = localStorage.getItem('layout-right-width')
    return saved ? Math.max(RIGHT_PANEL_MIN_WIDTH, parseInt(saved, 10)) : 220
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
      if (newWidth < COLLAPSE_THRESHOLD) {
        setSidebarCollapsed(true)
        localStorage.setItem('layout-sidebar-collapsed', 'true')
      } else {
        setSidebarCollapsed(false)
        localStorage.setItem('layout-sidebar-collapsed', 'false')
        const clamped = Math.max(SIDEBAR_MIN_WIDTH, Math.min(PANEL_MAX_WIDTH, newWidth))
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
      if (newWidth < COLLAPSE_THRESHOLD) {
        setRightPanelCollapsed(true)
        localStorage.setItem('layout-right-collapsed', 'true')
      } else {
        setRightPanelCollapsed(false)
        localStorage.setItem('layout-right-collapsed', 'false')
        const clamped = Math.max(RIGHT_PANEL_MIN_WIDTH, Math.min(PANEL_MAX_WIDTH, newWidth))
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

  const handleResetLayout = useCallback(() => {
    window.dispatchEvent(new Event('layout:reset'))
  }, [])

  const handleToggleSidebar = useCallback(() => {
    const next = !sidebarCollapsed
    setSidebarCollapsed(next)
    localStorage.setItem('layout-sidebar-collapsed', String(next))
  }, [sidebarCollapsed, setSidebarCollapsed])

  const handleToggleRightPanel = useCallback(() => {
    const next = !rightPanelCollapsed
    setRightPanelCollapsed(next)
    localStorage.setItem('layout-right-collapsed', String(next))
  }, [rightPanelCollapsed, setRightPanelCollapsed])

  const handleCreateNote = useCallback(() => {
    if (vault) createFile(vault.path, uniqueFileName(vault.path, 'Untitled', 'md', vaultFiles))
  }, [vault, createFile, vaultFiles])

  const handleCreateCanvas = useCallback(() => {
    if (vault)
      createCanvas(vault.path, uniqueFileName(vault.path, 'Untitled', 'canvas', vaultFiles))
  }, [vault, createCanvas, vaultFiles])

  const handleOpenDailyNote = useCallback(() => {
    openDailyNote()
  }, [openDailyNote])

  const handleQuickGraph = useCallback(() => {
    if (onSidebarTabChange) {
      onSidebarTabChange('graph')
      setSidebarCollapsed(false)
      localStorage.setItem('layout-sidebar-collapsed', 'false')
    }
  }, [onSidebarTabChange, setSidebarCollapsed])

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
      <LayoutHeader
        vaultName={vaultName}
        filename={filename}
        folderPath={folderPath}
        isGraphFullscreen={isGraphFullscreen}
        sidebarCollapsed={sidebarCollapsed}
        rightPanelCollapsed={rightPanelCollapsed}
        onToggleSidebar={handleToggleSidebar}
        onToggleRightPanel={handleToggleRightPanel}
        onResetLayout={handleResetLayout}
        onCreateNote={handleCreateNote}
        onCreateCanvas={handleCreateCanvas}
        onOpenDailyNote={handleOpenDailyNote}
        onQuickGraph={handleQuickGraph}
      />

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

        {!sidebarCollapsed && !isGraphFullscreen && (
          <LayoutResizer
            onMouseDown={handleSidebarMouseDown}
            onDoubleClick={handleToggleSidebar}
          />
        )}

        {!isGraphFullscreen && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {editor}
          </div>
        )}

        {!rightPanelCollapsed && !isGraphFullscreen && (
          <LayoutResizer
            onMouseDown={handleRightMouseDown}
            onDoubleClick={handleToggleRightPanel}
          />
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
