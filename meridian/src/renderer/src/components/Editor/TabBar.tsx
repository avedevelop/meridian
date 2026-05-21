import { useState, useRef, useLayoutEffect } from 'react'
import { useVaultStore } from '../../store/useVaultStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'
import { ContextMenu } from '../Sidebar/ContextMenu'

interface TabBarProps {
  paneId: string
}

export function TabBar({ paneId }: TabBarProps) {
  const {
    panes,
    activePaneId,
    setActivePane,
    setActiveTab,
    closeTab,
    reorderTabs,
    splitPane,
    closePane,
    moveTab,
    vault
  } = useVaultStore()
  const { renameFile, deleteFile, revealFile } = useVaultBridge()

  const pane = panes.find((p) => p.id === paneId) || panes[0]
  const { openTabs, activeTabPath } = pane
  const isActivePane = activePaneId === paneId

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    path: string
    name: string
  } | null>(null)

  // Drag state
  const [activeDragIndex, setActiveDragIndex] = useState<number | null>(null)
  const [hoveredDragIndex, setHoveredDragIndex] = useState<number | null>(null)
  const [isDraggingActive, setIsDraggingActive] = useState<boolean>(false)

  // Scrollable tabs container ref (for wheel-based horizontal scroll)
  const scrollRef = useRef<HTMLDivElement>(null)

  // FLIP animation refs
  const tabRefs = useRef<{ [path: string]: HTMLDivElement | null }>({})
  const oldLeftsRef = useRef<{ [path: string]: number }>({})

  const getRelativePath = (absPath: string, vaultPath: string) => {
    if (absPath.startsWith(vaultPath)) {
      return absPath.slice(vaultPath.length).replace(/^\/+/, '')
    }
    return absPath
  }

  // Record left positions of all tabs before reordering (runs on drop)
  const recordPositions = () => {
    const lefts: { [path: string]: number } = {}
    openTabs.forEach((t) => {
      const el = tabRefs.current[t.path]
      if (el) {
        lefts[t.path] = el.getBoundingClientRect().left
      }
    })
    oldLeftsRef.current = lefts
  }

  // FLIP transition effect (runs on drop when openTabs order changes)
  useLayoutEffect(() => {
    openTabs.forEach((t) => {
      const el = tabRefs.current[t.path]
      if (el) {
        const oldLeft = oldLeftsRef.current[t.path]
        if (oldLeft !== undefined) {
          const newLeft = el.getBoundingClientRect().left
          const dx = oldLeft - newLeft
          if (dx !== 0) {
            el.style.transform = `translate3d(${dx}px, 0, 0)`
            el.style.transition = 'none'
            el.getBoundingClientRect() // Force reflow
            requestAnimationFrame(() => {
              el.style.transition = 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
              el.style.transform = 'translate3d(0, 0, 0)'
            })
          }
        }
      }
    })
    oldLeftsRef.current = {}
  }, [openTabs])

  const handleDragStart = (e: React.DragEvent, index: number, tabPath: string, tabName: string) => {
    setActiveDragIndex(index)
    setHoveredDragIndex(index)

    setTimeout(() => {
      setIsDraggingActive(true)
    }, 0)
    
    ;(window as any).__meridianDragPath = tabPath
    ;(window as any).__meridianDragSourcePaneId = paneId

    e.dataTransfer.effectAllowed = 'copyMove'
    e.dataTransfer.setData('text/plain', tabPath)
    e.dataTransfer.setData('text/meridian-pane-id', paneId)
    e.dataTransfer.setData('text/meridian-tab-path', tabPath)

    if (vault) {
      const relPath = getRelativePath(tabPath, vault.path)
      e.dataTransfer.setData(
        'application/meridian-file',
        JSON.stringify({
          path: tabPath,
          name: tabName,
          relativePath: relPath
        })
      )
    }
  }

  const handleDragEnd = () => {
    setActiveDragIndex(null)
    setHoveredDragIndex(null)
    setIsDraggingActive(false)
    ;(window as any).__meridianDragPath = null
    ;(window as any).__meridianDragSourcePaneId = null
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    // Handle tab drag within the same pane or from outside
    const isExternalDrag = (window as any).__meridianDragPath && (window as any).__meridianDragSourcePaneId !== paneId
    const isInternalDrag = activeDragIndex !== null

    if (!isInternalDrag && !isExternalDrag) return

    let closestIndex = isInternalDrag ? activeDragIndex : openTabs.length
    let minDistance = Infinity

    openTabs.forEach((tab, i) => {
      const el = tabRefs.current[tab.path]
      if (el) {
        const rect = el.getBoundingClientRect()
        const distLeft = Math.abs(e.clientX - rect.left)
        if (distLeft < minDistance) {
          minDistance = distLeft
          closestIndex = i
        }
        const distRight = Math.abs(e.clientX - rect.right)
        if (distRight < minDistance) {
          minDistance = distRight
          closestIndex = i + 1
        }
      }
    })

    if (hoveredDragIndex !== closestIndex) {
      setHoveredDragIndex(closestIndex)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const sourcePaneId = e.dataTransfer.getData('text/meridian-pane-id') || (window as any).__meridianDragSourcePaneId
    const tabPath = e.dataTransfer.getData('text/meridian-tab-path') || (window as any).__meridianDragPath

    if (sourcePaneId && tabPath && sourcePaneId !== paneId) {
      // Dragged from another pane
      const targetIndex = hoveredDragIndex !== null ? hoveredDragIndex : openTabs.length
      moveTab(sourcePaneId, paneId, tabPath, targetIndex)
    } else if (activeDragIndex !== null && hoveredDragIndex !== null) {
      // Reordered within same pane
      let targetIndex = hoveredDragIndex
      if (activeDragIndex < hoveredDragIndex) {
        targetIndex = hoveredDragIndex - 1
      }
      if (activeDragIndex !== targetIndex) {
        recordPositions()
        const nextTabs = [...openTabs]
        const [movedTab] = nextTabs.splice(activeDragIndex, 1)
        nextTabs.splice(targetIndex, 0, movedTab)
        reorderTabs(nextTabs, paneId)
      }
    }
    handleDragEnd()
  }

  const handleContextMenu = (e: React.MouseEvent, tabPath: string, tabName: string) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      path: tabPath,
      name: tabName
    })
  }

  return (
    <div
      className={`custom-tab-bar ${isActivePane ? 'active' : ''}`}
      onClick={() => { if (!isActivePane) setActivePane(paneId) }}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        background: 'var(--bg-secondary)',
        borderBottom: `1px solid ${isActivePane ? 'var(--accent-color)' : 'var(--border-color)'}`,
        height: 36,
        flexShrink: 0,
        width: '100%',
        cursor: 'default',
        transition: 'border-bottom-color 0.2s ease',
        userSelect: 'none'
      }}
    >
      {/* Clip container: 36px tall, overflow hidden — cuts off scrollbar below */}
      <div style={{ flex: 1, minWidth: 0, height: 36, overflow: 'hidden', position: 'relative' }}>
      {/* Inner: 56px tall so scrollbar sits below the 36px clip boundary */}
      <div
        ref={scrollRef}
        onDragOver={handleContainerDragOver}
        onDrop={handleDrop}
        onWheel={e => {
          if (scrollRef.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            e.preventDefault()
            scrollRef.current.scrollLeft += e.deltaY
          }
        }}
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 56,
          display: 'flex',
          flexWrap: 'nowrap',
          alignItems: 'flex-start',
          overflowX: 'scroll',
          overflowY: 'hidden',
          padding: '5px 4px 0 8px',
          gap: '4px',
          boxSizing: 'border-box',
        }}
      >
      {openTabs.map((tab, i) => {
        const isActive = tab.path === activeTabPath
        const isDragged = activeDragIndex === i
        const isDropTargetLeft = activeDragIndex !== null && hoveredDragIndex === i
        const isDropTargetRight =
          activeDragIndex !== null &&
          hoveredDragIndex === openTabs.length &&
          i === openTabs.length - 1

        return (
          <div
            key={tab.path}
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
            onDragStart={(e) => handleDragStart(e, i, tab.path, tab.name)}
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
      })}
      </div>{/* end inner scroll */}
      </div>{/* end clip container */}

      {/* Pane management actions — fixed, never scrolls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 6px', flexShrink: 0, borderLeft: '1px solid var(--border-color)' }}>
        <button
          onClick={() => splitPane(paneId, 'vertical')}
          title="Split Vertically"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
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
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="2" width="12" height="12" rx="1.5" />
            <line x1="8" y1="2" x2="8" y2="14" />
          </svg>
        </button>

        <button
          onClick={() => splitPane(paneId, 'horizontal')}
          title="Split Horizontally"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
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
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="2" width="12" height="12" rx="1.5" />
            <line x1="2" y1="8" x2="14" y2="8" />
          </svg>
        </button>

        {panes.length > 1 && (
          <button
            onClick={() => closePane(paneId)}
            title="Close Pane"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
              e.currentTarget.style.color = 'var(--accent-color)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="4" y1="4" x2="12" y2="12" />
              <line x1="12" y1="4" x2="4" y2="12" />
            </svg>
          </button>
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            {
              label: 'Rename',
              onClick: () => {
                const newName = window.prompt('Rename file:', contextMenu.name)
                if (newName && newName.trim() !== '') {
                  renameFile(contextMenu.path, newName.trim())
                }
              }
            },
            {
              label: 'Delete',
              danger: true,
              onClick: () => {
                if (window.confirm(`Delete "${contextMenu.name}"? This cannot be undone.`)) {
                  deleteFile(contextMenu.path)
                }
              }
            },
            { separator: true },
            {
              label: 'Reveal in Finder',
              onClick: () => revealFile(contextMenu.path)
            },
            {
              label: 'Copy Path',
              onClick: () => {
                navigator.clipboard.writeText(contextMenu.path).catch(console.error)
              }
            },
            {
              label: 'Copy Relative Path',
              onClick: () => {
                if (vault) {
                  const rel = getRelativePath(contextMenu.path, vault.path)
                  navigator.clipboard.writeText(rel).catch(console.error)
                }
              }
            }
          ]}
        />
      )}
    </div>
  )
}
