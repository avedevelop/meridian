import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FolderOpenBtnIcon, WebIcon, SettingsIcon, GitIcon } from '../Icons'
import { formatShortcut } from '../../utils/platformShortcuts'

type SidebarTab = 'files' | 'search' | 'graph' | 'calendar' | 'tasks' | 'git'

interface ActivityBarProps {
  activeTab: SidebarTab
  onTabChange: (tab: SidebarTab) => void
  onSettings: () => void
  sidebarCollapsed?: boolean
}

const CalendarIcon = (props: { size?: number; color?: string }) => (
  <svg
    width={props.size ?? 20}
    height={props.size ?? 20}
    viewBox="0 0 24 24"
    fill="none"
    stroke={props.color ?? 'currentColor'}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const TasksIcon = (props: { size?: number; color?: string }) => (
  <svg
    width={props.size ?? 20}
    height={props.size ?? 20}
    viewBox="0 0 24 24"
    fill="none"
    stroke={props.color ?? 'currentColor'}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="m9 12 2 2 4-4" />
  </svg>
)

const ExpandIcon = (props: { size?: number; color?: string }) => (
  <svg
    width={props.size ?? 18}
    height={props.size ?? 18}
    viewBox="0 0 24 24"
    fill="none"
    stroke={props.color ?? 'currentColor'}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="13 17 18 12 13 7" />
    <polyline points="6 17 11 12 6 7" />
  </svg>
)

const CollapseIcon = (props: { size?: number; color?: string }) => (
  <svg
    width={props.size ?? 18}
    height={props.size ?? 18}
    viewBox="0 0 24 24"
    fill="none"
    stroke={props.color ?? 'currentColor'}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="11 17 6 12 11 7" />
    <polyline points="18 17 13 12 18 7" />
  </svg>
)

const TABS: {
  id: SidebarTab
  labelKey: string
  Icon: React.ComponentType<{ size?: number; color?: string }>
}[] = [
  {
    id: 'files',
    labelKey: 'activityBar.files',
    Icon: (props) => <FolderOpenBtnIcon size={20} {...props} />
  },
  { id: 'git', labelKey: 'activityBar.git', Icon: (props) => <GitIcon size={20} {...props} /> },
  { id: 'graph', labelKey: 'activityBar.graph', Icon: (props) => <WebIcon size={20} {...props} /> },
  {
    id: 'calendar',
    labelKey: 'activityBar.calendar',
    Icon: (props) => <CalendarIcon size={20} {...props} />
  },
  {
    id: 'tasks',
    labelKey: 'activityBar.tasks',
    Icon: (props) => <TasksIcon size={20} {...props} />
  }
]

export function ActivityBar({
  activeTab,
  onTabChange,
  onSettings,
  sidebarCollapsed
}: ActivityBarProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(() => {
    return localStorage.getItem('layout-activitybar-expanded') === 'true'
  })

  const [gitChangesCount, setGitChangesCount] = useState<number>(0)

  useEffect(() => {
    let active = true
    const updateStatus = async () => {
      try {
        const res = await window.vault.gitStatus()
        if (active) {
          setGitChangesCount(res.isRepo ? (res.changesCount ?? 0) : 0)
        }
      } catch {
        if (active) setGitChangesCount(0)
      }
    }

    updateStatus()

    // Poll every 5 seconds
    const interval = setInterval(updateStatus, 5000)

    // Update on file change events!
    const unsubscribe = window.vault.onFileChanged(() => {
      updateStatus()
    })

    return () => {
      active = false
      clearInterval(interval)
      unsubscribe()
    }
  }, [])

  return (
    <div
      style={{
        width: expanded ? 160 : 48,
        flexShrink: 0,
        background: 'var(--bg-tertiary)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: expanded ? 'stretch' : 'center',
        transition: 'width 0.15s ease-in-out',
        overflow: 'hidden',
        userSelect: 'none'
      }}
    >
      {TABS.map(({ id, labelKey, Icon }) => {
        const isActive = activeTab === id && !sidebarCollapsed
        const hasGitBadge = id === 'git' && gitChangesCount > 0
        const label = t(labelKey)

        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            title={expanded ? undefined : label}
            style={{
              width: '100%',
              height: 48,
              border: 'none',
              cursor: 'pointer',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: expanded ? 'flex-start' : 'center',
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderLeft: isActive ? '3px solid var(--accent-color)' : '3px solid transparent',
              paddingLeft: expanded ? 16 : 0,
              paddingRight: expanded ? 16 : 0,
              transition: 'background 0.15s, color 0.15s',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-surface)'
              if (!isActive) e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 20,
                position: 'relative'
              }}
            >
              <Icon />
              {hasGitBadge && !expanded && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: -4,
                    right: -4,
                    background: 'var(--accent-color)',
                    color: '#ffffff',
                    fontSize: 8,
                    minWidth: 12,
                    height: 12,
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    padding: '0 2px',
                    boxShadow: '0 0 0 1px var(--bg-tertiary)'
                  }}
                >
                  {gitChangesCount}
                </span>
              )}
            </div>
            {expanded && (
              <span
                style={{
                  marginLeft: 12,
                  fontSize: 13,
                  fontWeight: 500,
                  whiteSpace: 'nowrap'
                }}
              >
                {label}
              </span>
            )}
            {hasGitBadge && expanded && (
              <span
                style={{
                  marginLeft: 'auto',
                  background: 'var(--accent-color)',
                  color: '#ffffff',
                  fontSize: 9,
                  fontWeight: 'bold',
                  padding: '2px 6px',
                  borderRadius: 10
                }}
              >
                {gitChangesCount}
              </span>
            )}
          </button>
        )
      })}

      {/* Settings icon pinned to bottom */}
      <button
        onClick={onSettings}
        title={
          expanded ? undefined : t('activityBar.settingsTooltip', { shortcut: formatShortcut(['mod', ',']) })
        }
        style={{
          width: '100%',
          height: 48,
          border: 'none',
          cursor: 'pointer',
          background: 'transparent',
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: expanded ? 'flex-start' : 'center',
          color: 'var(--text-secondary)',
          borderLeft: '3px solid transparent',
          paddingLeft: expanded ? 16 : 0,
          paddingRight: expanded ? 16 : 0,
          transition: 'background 0.15s, color 0.15s'
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20 }}>
          <SettingsIcon size={20} />
        </div>
        {expanded && (
          <span
            style={{
              marginLeft: 12,
              fontSize: 13,
              fontWeight: 500,
              whiteSpace: 'nowrap'
            }}
          >
            {t('activityBar.settings')}
          </span>
        )}
      </button>

      {/* Expand/Collapse Menu Toggle Button */}
      <button
        onClick={() => {
          const next = !expanded
          setExpanded(next)
          localStorage.setItem('layout-activitybar-expanded', String(next))
        }}
        title={expanded ? t('activityBar.collapseMenu') : t('activityBar.expandMenu')}
        style={{
          width: '100%',
          height: 48,
          border: 'none',
          cursor: 'pointer',
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: expanded ? 'flex-start' : 'center',
          color: 'var(--text-secondary)',
          borderLeft: '3px solid transparent',
          paddingLeft: expanded ? 16 : 0,
          paddingRight: expanded ? 16 : 0,
          transition: 'background 0.15s, color 0.15s'
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20 }}>
          {expanded ? <CollapseIcon size={18} /> : <ExpandIcon size={18} />}
        </div>
        {expanded && (
          <span
            style={{
              marginLeft: 12,
              fontSize: 13,
              fontWeight: 500,
              whiteSpace: 'nowrap'
            }}
          >
            {t('activityBar.collapse')}
          </span>
        )}
      </button>
    </div>
  )
}
