import React from 'react'
import { FolderOpenBtnIcon, SearchIcon, WebIcon, SettingsIcon } from '../Icons'

type SidebarTab = 'files' | 'search' | 'graph'

interface ActivityBarProps {
  activeTab: SidebarTab
  onTabChange: (tab: SidebarTab) => void
  onSettings: () => void
}

const TABS: {
  id: SidebarTab
  label: string
  Icon: React.ComponentType<{ size?: number; color?: string }>
}[] = [
  { id: 'files', label: 'Explorer', Icon: (props) => <FolderOpenBtnIcon size={20} {...props} /> },
  { id: 'search', label: 'Search', Icon: (props) => <SearchIcon size={20} {...props} /> },
  { id: 'graph', label: 'Graph', Icon: (props) => <WebIcon size={20} {...props} /> }
]

export function ActivityBar({ activeTab, onTabChange, onSettings }: ActivityBarProps) {
  return (
    <div
      style={{
        width: 48,
        flexShrink: 0,
        background: '#111111',
        borderRight: '1px solid #2a2a2a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      {TABS.map(({ id, label, Icon }) => {
        const isActive = activeTab === id
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            title={label}
            style={{
              width: 48,
              height: 48,
              border: 'none',
              cursor: 'pointer',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isActive ? '#fff' : '#555',
              borderLeft: isActive ? '2px solid #7c6af7' : '2px solid transparent',
              padding: 0
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.color = '#aaa'
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.color = '#555'
            }}
          >
            <Icon />
          </button>
        )
      })}

      {/* Settings icon pinned to bottom */}
      <button
        onClick={onSettings}
        title="Settings (⌘,)"
        style={{
          width: 48,
          height: 48,
          border: 'none',
          cursor: 'pointer',
          background: 'transparent',
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#555',
          borderLeft: '2px solid transparent',
          padding: 0
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#aaa')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#555')}
      >
        <SettingsIcon size={20} />
      </button>
    </div>
  )
}
