import React from 'react'
import { Tab } from '../../store/useVaultStore'

interface TabItemProps {
  tab: Tab
  index: number
  paneId: string
  isActive: boolean
  isActivePane: boolean
  activeDragIndex: number | null
  hoveredDragIndex: number | null
  isDraggingActive: boolean
  openTabsLength: number
  tabRefs: React.MutableRefObject<{ [path: string]: HTMLDivElement | null }>
  setActivePane: (paneId: string) => void
  setActiveTab: (tabPath: string, paneId: string) => void
  closeTab: (tabPath: string, paneId: string) => void
  handleDragStart: (e: React.DragEvent, index: number, tabPath: string, tabName: string) => void
  handleDragEnd: () => void
  handleDragOver: (e: React.DragEvent) => void
  handleDrop: (e: React.DragEvent) => void
  handleContextMenu: (e: React.MouseEvent, tabPath: string, tabName: string) => void
}

export function TabItem({
  tab,
  index,
  paneId,
  isActive,
  isActivePane,
  activeDragIndex,
  hoveredDragIndex,
  isDraggingActive,
  openTabsLength,
  tabRefs,
  setActivePane,
  setActiveTab,
  closeTab,
  handleDragStart,
  handleDragEnd,
  handleDragOver,
  handleDrop,
  handleContextMenu
}: TabItemProps) {
  const isDragged = activeDragIndex === index
  const isDropTargetLeft = activeDragIndex !== null && hoveredDragIndex === index
  const isDropTargetRight =
    activeDragIndex !== null && hoveredDragIndex === openTabsLength && index === openTabsLength - 1

  return (
    <div
      ref={(el) => {
        tabRefs.current[tab.path] = el
      }}
      onClick={(e) => {
        e.stopPropagation()
        if (!isActivePane) setActivePane(paneId)
        setActiveTab(tab.path, paneId)
      }}
      onContextMenu={(e) => handleContextMenu(e, tab.path, tab.name)}
      draggable={true}
      onDragStart={(e) => handleDragStart(e, index, tab.path, tab.name)}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 10px',
        height: 26,
        cursor: 'grab',
        border: '1px solid var(--border-color)',
        borderRadius: 4,
        background: isActive ? 'var(--bg-primary)' : 'var(--bg-tertiary)',
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontSize: 12,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        userSelect: 'none',
        flexShrink: 0,
        opacity: isDragged ? (isDraggingActive ? 0.3 : 1) : 1,
        zIndex: isDragged ? 10 : 1,
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        if (!isActive && activeDragIndex === null) {
          e.currentTarget.style.background = 'var(--bg-surface)'
          e.currentTarget.style.borderColor = 'var(--border-color)'
          e.currentTarget.style.color = 'var(--text-primary)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive && activeDragIndex === null) {
          e.currentTarget.style.background = 'var(--bg-tertiary)'
          e.currentTarget.style.borderColor = 'var(--border-color)'
          e.currentTarget.style.color = 'var(--text-secondary)'
        }
      }}
    >
      {isDropTargetLeft && (
        <div
          style={{
            position: 'absolute',
            left: -3,
            top: 0,
            bottom: 0,
            width: 3,
            background: 'var(--accent-color)',
            borderRadius: 1.5,
            zIndex: 100
          }}
        />
      )}
      {isDropTargetRight && (
        <div
          style={{
            position: 'absolute',
            right: -3,
            top: 0,
            bottom: 0,
            width: 3,
            background: 'var(--accent-color)',
            borderRadius: 1.5,
            zIndex: 100
          }}
        />
      )}
      {tab.isDirty && <span style={{ color: 'var(--accent-color)', fontSize: 10 }}>●</span>}
      <span style={{ pointerEvents: 'none' }}>{tab.name}</span>
      <span
        onClick={(e) => {
          e.stopPropagation()
          closeTab(tab.path, paneId)
        }}
        style={{
          color: 'var(--text-secondary)',
          fontSize: 14,
          lineHeight: 1,
          marginLeft: 4,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 14,
          height: 14,
          borderRadius: '50%'
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
        ×
      </span>
    </div>
  )
}
