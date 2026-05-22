import { useState, useRef, useLayoutEffect } from 'react'
import { Tab } from '../../store/useVaultStore'

interface VaultInfo {
  path: string
}

interface UseTabDragProps {
  paneId: string
  openTabs: Tab[]
  vault: VaultInfo | null
  moveTab: (sourcePaneId: string, targetPaneId: string, tabPath: string, targetIndex: number) => void
  reorderTabs: (tabs: Tab[], paneId: string) => void
}

export function useTabDrag({
  paneId,
  openTabs,
  vault,
  moveTab,
  reorderTabs
}: UseTabDragProps) {
  const [activeDragIndex, setActiveDragIndex] = useState<number | null>(null)
  const [hoveredDragIndex, setHoveredDragIndex] = useState<number | null>(null)
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
    const isExternalDrag =
      (window as any).__meridianDragPath &&
      (window as any).__meridianDragSourcePaneId !== paneId
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
    const sourcePaneId =
      e.dataTransfer.getData('text/meridian-pane-id') ||
      (window as any).__meridianDragSourcePaneId
    const tabPath =
      e.dataTransfer.getData('text/meridian-tab-path') || (window as any).__meridianDragPath

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

  return {
    activeDragIndex,
    hoveredDragIndex,
    isDraggingActive,
    tabRefs,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleContainerDragOver,
    handleDrop,
    getRelativePath
  }
}
