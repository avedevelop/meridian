import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useVaultStore } from '../../store/useVaultStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'
import { ContextMenu } from '../Sidebar/ContextMenu'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useTabDrag } from './useTabDrag'
import { TabItem } from './TabItem'

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
  const { t } = useTranslation()

  const alwaysShowTabBar = useSettingsStore((s) => s.alwaysShowTabBar)
  const openTabsForPane = useVaultStore((s) => s.panes.find((p) => p.id === paneId)?.openTabs ?? [])

  const pane = panes.find((p) => p.id === paneId) || panes[0]
  const { openTabs, activeTabPath } = pane
  const isActivePane = activePaneId === paneId

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    path: string
    name: string
  } | null>(null)

  // Scrollable tabs container ref (for wheel-based horizontal scroll)
  const scrollRef = useRef<HTMLDivElement>(null)

  const {
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
  } = useTabDrag({
    paneId,
    openTabs,
    vault,
    moveTab,
    reorderTabs
  })

  if (!alwaysShowTabBar && openTabsForPane.length <= 1) return null

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
      onClick={() => {
        if (!isActivePane) setActivePane(paneId)
      }}
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
          onWheel={(e) => {
            if (scrollRef.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
              e.preventDefault()
              scrollRef.current.scrollLeft += e.deltaY
            }
          }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 56,
            display: 'flex',
            flexWrap: 'nowrap',
            alignItems: 'flex-start',
            overflowX: 'scroll',
            overflowY: 'hidden',
            padding: '5px 4px 0 8px',
            gap: '4px',
            boxSizing: 'border-box'
          }}
        >
          {openTabs.map((tab, i) => (
            <TabItem
              key={tab.path}
              tab={tab}
              index={i}
              paneId={paneId}
              isActive={tab.path === activeTabPath}
              isActivePane={isActivePane}
              activeDragIndex={activeDragIndex}
              hoveredDragIndex={hoveredDragIndex}
              isDraggingActive={isDraggingActive}
              openTabsLength={openTabs.length}
              tabRefs={tabRefs}
              setActivePane={setActivePane}
              setActiveTab={setActiveTab}
              closeTab={closeTab}
              handleDragStart={handleDragStart}
              handleDragEnd={handleDragEnd}
              handleDragOver={handleDragOver}
              handleDrop={handleDrop}
              handleContextMenu={handleContextMenu}
            />
          ))}
        </div>
      </div>

      {/* Pane management actions — fixed, never scrolls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          padding: '0 6px',
          flexShrink: 0,
          borderLeft: '1px solid var(--border-color)'
        }}
      >
        <button
          onClick={() => splitPane(paneId, 'vertical')}
          title={t('editor.splitVertically')}
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
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="2" y="2" width="12" height="12" rx="1.5" />
            <line x1="8" y1="2" x2="8" y2="14" />
          </svg>
        </button>

        <button
          onClick={() => splitPane(paneId, 'horizontal')}
          title={t('editor.splitHorizontally')}
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
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="2" y="2" width="12" height="12" rx="1.5" />
            <line x1="2" y1="8" x2="14" y2="8" />
          </svg>
        </button>

        {panes.length > 1 && (
          <button
            onClick={() => closePane(paneId)}
            title={t('editor.closePane')}
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
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
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
              label: t('common.rename'),
              onClick: () => {
                const newName = window.prompt(t('editor.renameFilePrompt'), contextMenu.name)
                if (newName && newName.trim() !== '') {
                  renameFile(contextMenu.path, newName.trim())
                }
              }
            },
            {
              label: t('common.delete'),
              danger: true,
              onClick: () => {
                if (window.confirm(t('fileTree.deleteFileConfirm', { name: contextMenu.name }))) {
                  deleteFile(contextMenu.path)
                }
              }
            },
            { separator: true },
            {
              label: t('common.reveal'),
              onClick: () => revealFile(contextMenu.path)
            },
            {
              label: t('common.copyPath'),
              onClick: () => {
                navigator.clipboard.writeText(contextMenu.path).catch(console.error)
              }
            },
            {
              label: t('common.copyRelativePath'),
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
