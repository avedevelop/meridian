import { useState, useRef, useLayoutEffect } from 'react'
import { useVaultStore } from '../../store/useVaultStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'
import { ContextMenu } from '../Sidebar/ContextMenu'

export function TabBar() {
  const { openTabs, activeTabPath, setActiveTab, closeTab, reorderTabs, vault } = useVaultStore()
  const { renameFile, deleteFile, revealFile } = useVaultBridge()

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    path: string
    name: string
  } | null>(null)

  // Drag state
  const [activeDragIndex, setActiveDragIndex] = useState<number | null>(null)
  const [hoveredDragIndex, setHoveredDragIndex] = useState<number | null>(null)
  const [draggedWidth, setDraggedWidth] = useState<number>(0)
  const [isDraggingActive, setIsDraggingActive] = useState<boolean>(false)

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
            // 1. Invert: translate back to the old position instantly
            el.style.transform = `translate3d(${dx}px, 0, 0)`
            el.style.transition = 'none'

            // Force reflow
            el.getBoundingClientRect()

            // 2. Play: animate back to original position (translate3d(0,0,0))
            requestAnimationFrame(() => {
              el.style.transition = 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
              el.style.transform = 'translate3d(0, 0, 0)'
            })
          }
        }
      }
    })
    // Clear old recorded positions
    oldLeftsRef.current = {}
  }, [openTabs])

  const handleDragStart = (e: React.DragEvent, index: number, tabPath: string, tabName: string) => {
    setActiveDragIndex(index)
    setHoveredDragIndex(index)

    // Calculate item width + gap (4px)
    const rect = e.currentTarget.getBoundingClientRect()
    setDraggedWidth(rect.width + 4)

    // Set dragging state in a timeout to allow browser to capture drag ghost image first
    setTimeout(() => {
      setIsDraggingActive(true)
    }, 0)
    ;(window as any).__meridianDragPath = tabPath
    e.dataTransfer.effectAllowed = 'copyMove'
    e.dataTransfer.setData('text/plain', tabPath)

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
    setDraggedWidth(0)
    setIsDraggingActive(false)
    ;(window as any).__meridianDragPath = null
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (activeDragIndex === null) return
    if (hoveredDragIndex !== index) {
      setHoveredDragIndex(index)
    }
  }

  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (activeDragIndex === null) return

    // Find the closest tab based on clientX to update the gap position dynamically
    let closestIndex = hoveredDragIndex ?? activeDragIndex
    let minDistance = Infinity

    openTabs.forEach((tab, i) => {
      const el = tabRefs.current[tab.path]
      if (el) {
        const rect = el.getBoundingClientRect()
        const midX = rect.left + rect.width / 2
        const dist = Math.abs(e.clientX - midX)
        if (dist < minDistance) {
          minDistance = dist
          closestIndex = i
        }
      }
    })

    if (hoveredDragIndex !== closestIndex) {
      setHoveredDragIndex(closestIndex)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (
      activeDragIndex !== null &&
      hoveredDragIndex !== null &&
      activeDragIndex !== hoveredDragIndex
    ) {
      recordPositions()
      const nextTabs = [...openTabs]
      const [movedTab] = nextTabs.splice(activeDragIndex, 1)
      nextTabs.splice(hoveredDragIndex, 0, movedTab)
      reorderTabs(nextTabs)
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
      className="custom-tab-bar"
      onDragOver={handleContainerDragOver}
      onDrop={handleDrop}
      style={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'nowrap',
        alignItems: 'center',
        background: '#161616',
        borderBottom: '1px solid #2a2a2a',
        height: 36,
        overflowX: 'auto',
        overflowY: 'hidden',
        flexShrink: 0,
        padding: '0 8px',
        gap: '4px'
      }}
    >
      {openTabs.map((tab, i) => {
        const isActive = tab.path === activeTabPath
        const isDragged = activeDragIndex === i

        // Calculate visual slide transition offset for reordering animation
        let offset = 0
        if (activeDragIndex !== null && hoveredDragIndex !== null) {
          if (activeDragIndex < hoveredDragIndex) {
            // Dragging right: intermediate tabs slide to the left
            if (i > activeDragIndex && i <= hoveredDragIndex) {
              offset = -draggedWidth
            }
          } else if (activeDragIndex > hoveredDragIndex) {
            // Dragging left: intermediate tabs slide to the right
            if (i >= hoveredDragIndex && i < activeDragIndex) {
              offset = draggedWidth
            }
          }
        }

        return (
          <div
            key={tab.path}
            ref={(el) => {
              tabRefs.current[tab.path] = el
            }}
            onClick={() => setActiveTab(tab.path)}
            onContextMenu={(e) => handleContextMenu(e, tab.path, tab.name)}
            draggable={true}
            onDragStart={(e) => handleDragStart(e, i, tab.path, tab.name)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, i)}
            onDrop={handleDrop}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 10px',
              height: 26,
              cursor: 'grab',
              border: '1px solid #2a2a2a',
              borderRadius: 4,
              background: isActive ? '#22222a' : '#141414',
              color: isActive ? '#fff' : '#888',
              fontSize: 12,
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
              userSelect: 'none',
              flexShrink: 0,
              opacity: isDragged ? (isDraggingActive ? 0.3 : 1) : 1,
              transform: `translate3d(${offset}px, 0, 0)`,
              transition:
                activeDragIndex !== null ? 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none',
              zIndex: isDragged ? 10 : 1,
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              if (!isActive && activeDragIndex === null) {
                e.currentTarget.style.background = '#1a1a22'
                e.currentTarget.style.borderColor = '#3a3a4a'
                e.currentTarget.style.color = '#ccc'
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive && activeDragIndex === null) {
                e.currentTarget.style.background = '#141414'
                e.currentTarget.style.borderColor = '#2a2a2a'
                e.currentTarget.style.color = '#888'
              }
            }}
          >
            {tab.isDirty && <span style={{ color: '#7c6af7', fontSize: 10 }}>●</span>}
            <span style={{ pointerEvents: 'none' }}>{tab.name}</span>
            <span
              onClick={(e) => {
                e.stopPropagation()
                closeTab(tab.path)
              }}
              style={{
                color: '#555',
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
                e.currentTarget.style.background = '#333'
                e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#555'
              }}
            >
              ×
            </span>
          </div>
        )
      })}

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
