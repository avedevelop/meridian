import React from 'react'
import { useTranslation } from 'react-i18next'
import { FolderIcon } from './Icons'
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

export interface LayoutHeaderProps {
  vaultName: string
  filename: string | null
  folderPath: string | null
  isGraphFullscreen: boolean
  sidebarCollapsed: boolean
  rightPanelCollapsed: boolean
  onToggleSidebar: () => void
  onToggleRightPanel: () => void
  onResetLayout: () => void
  onCreateNote: () => void
  onCreateCanvas: () => void
  onOpenDailyNote: () => void
  onQuickGraph: () => void
}

export function LayoutHeader({
  vaultName,
  filename,
  folderPath,
  isGraphFullscreen,
  sidebarCollapsed,
  rightPanelCollapsed,
  onToggleSidebar,
  onToggleRightPanel,
  onResetLayout,
  onCreateNote,
  onCreateCanvas,
  onOpenDailyNote,
  onQuickGraph
}: LayoutHeaderProps) {
  const { t } = useTranslation()

  return (
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
        // @ts-ignore Electron drag region CSS is not typed in React CSSProperties.
        WebkitAppRegion: 'drag'
      }}
    >
      <HeaderSearch />

      {/* Left section: vault crumbs */}
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

      {/* Right section: actions, toggles, reset */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <QuickActionButton
            icon={<PlusIcon size={14} />}
            title={t('layout.createNote')}
            onClick={onCreateNote}
          />
          <QuickActionButton
            icon={<CanvasIcon size={13} />}
            title={t('layout.createCanvas')}
            onClick={onCreateCanvas}
          />
          <QuickActionButton
            icon={<CalendarIcon size={13} />}
            title={t('layout.openDaily')}
            onClick={onOpenDailyNote}
          />
          <QuickActionButton
            icon={<GraphIcon size={13} />}
            title={t('layout.quickGraph')}
            onClick={onQuickGraph}
          />
        </div>

        <div style={{ width: 1, height: 14, background: 'var(--border-color)' }} />

        {!isGraphFullscreen && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <SidebarToggleButton
              active={!sidebarCollapsed}
              title={t('layout.toggleLeftSidebar')}
              icon={<SidebarLeftIcon active={!sidebarCollapsed} />}
              onClick={onToggleSidebar}
            />
            <SidebarToggleButton
              active={!rightPanelCollapsed}
              title={t('layout.toggleRightSidebar')}
              icon={<SidebarRightIcon active={!rightPanelCollapsed} />}
              onClick={onToggleRightPanel}
            />
          </div>
        )}

        {!isGraphFullscreen && (
          <div style={{ width: 1, height: 14, background: 'var(--border-color)' }} />
        )}

        <button
          onClick={onResetLayout}
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
  )
}

interface SidebarToggleButtonProps {
  active: boolean
  title: string
  icon: React.ReactNode
  onClick: () => void
}

function SidebarToggleButton({ active, title, icon, onClick }: SidebarToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: 'transparent',
        border: 'none',
        color: active ? 'var(--accent-color)' : 'var(--text-secondary)',
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
      {icon}
    </button>
  )
}
