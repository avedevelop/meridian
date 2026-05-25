import React, { useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { FileIcon } from '../Icons'
import { useVaultStore } from '../../store/useVaultStore'
import { SinglePaneArea } from './SinglePaneArea'
import { formatShortcut } from '../../utils/platformShortcuts'

export function EditorArea() {
  const { t } = useTranslation()
  const { panes, activePaneId, mergeAllPanes } = useVaultStore()
  const paneRefs = useRef<{ [paneId: string]: HTMLDivElement | null }>({})

  // Reset Layout also merges all split panes into one
  useEffect(() => {
    const handler = () => mergeAllPanes()
    window.addEventListener('layout:reset', handler)
    return () => window.removeEventListener('layout:reset', handler)
  }, [mergeAllPanes])

  const totalOpenTabs = useMemo(() => {
    return panes.reduce((acc, p) => acc + p.openTabs.length, 0)
  }, [panes])

  if (panes.length === 0 || (panes.length === 1 && totalOpenTabs === 0)) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
            <FileIcon size={48} color="var(--border-color)" />
          </div>
          <p>{t('editor.openNoteFromSidebar')}</p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {t('editor.pressCmdKToSearch', { shortcut: formatShortcut(['mod', 'K']) })}
          </p>
        </div>
      </div>
    )
  }

  // Handle panel resizing
  const startResize = (e: React.MouseEvent, index: number) => {
    e.preventDefault()
    const startX = e.clientX
    const leftPaneId = panes[index].id
    const rightPaneId = panes[index + 1].id

    const leftEl = paneRefs.current[leftPaneId]
    const rightEl = paneRefs.current[rightPaneId]
    if (!leftEl || !rightEl) return

    const startLeftWidth = leftEl.getBoundingClientRect().width
    const startRightWidth = rightEl.getBoundingClientRect().width

    const doDrag = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const newLeftWidth = Math.max(150, startLeftWidth + deltaX)
      const newRightWidth = Math.max(150, startRightWidth - deltaX)

      leftEl.style.flex = 'none'
      leftEl.style.width = `${newLeftWidth}px`
      rightEl.style.flex = 'none'
      rightEl.style.width = `${newRightWidth}px`
    }

    const stopDrag = () => {
      window.removeEventListener('mousemove', doDrag)
      window.removeEventListener('mouseup', stopDrag)
    }

    window.addEventListener('mousemove', doDrag)
    window.addEventListener('mouseup', stopDrag)
  }

  // Detect general layout splits direction
  const isVertical = panes.every((p) => p.direction !== 'horizontal')

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isVertical ? 'row' : 'column',
        flex: 1,
        overflow: 'hidden',
        background: 'var(--bg-primary)'
      }}
    >
      {panes.map((pane, index) => {
        const isActive = pane.id === activePaneId
        return (
          <React.Fragment key={pane.id}>
            {index > 0 && (
              <div
                onMouseDown={(e) => startResize(e, index - 1)}
                style={{
                  width: isVertical ? 4 : '100%',
                  height: isVertical ? '100%' : 4,
                  background: 'var(--border-color)',
                  cursor: isVertical ? 'col-resize' : 'row-resize',
                  zIndex: 20,
                  flexShrink: 0,
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--accent-color)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--border-color)'
                }}
              />
            )}
            <div
              ref={(el) => {
                paneRefs.current[pane.id] = el
              }}
              style={{
                flex: 1,
                display: 'flex',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              <SinglePaneArea paneId={pane.id} isActive={isActive} />
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}
