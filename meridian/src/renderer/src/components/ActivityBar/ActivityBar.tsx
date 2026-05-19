import React from 'react'

type SidebarTab = 'files' | 'search' | 'graph'

interface ActivityBarProps {
  activeTab: SidebarTab
  onTabChange: (tab: SidebarTab) => void
  onSettings: () => void
}

const ExplorerIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3" width="8" height="10" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="13" y="3" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="3" y="16" width="18" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
)

const SearchIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

const GraphIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="4" cy="6" r="2" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="20" cy="6" r="2" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="4" cy="18" r="2" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="20" cy="18" r="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M6 7l4.5 3.5M18 7l-4.5 3.5M6 17l4.5-3.5M18 17l-4.5-3.5" stroke="currentColor" strokeWidth="1"/>
  </svg>
)

const SettingsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

const TABS: { id: SidebarTab; label: string; Icon: () => React.JSX.Element }[] = [
  { id: 'files', label: 'Explorer', Icon: ExplorerIcon },
  { id: 'search', label: 'Search', Icon: SearchIcon },
  { id: 'graph', label: 'Graph', Icon: GraphIcon },
]

export function ActivityBar({ activeTab, onTabChange, onSettings }: ActivityBarProps) {
  return (
    <div style={{
      width: 48, flexShrink: 0,
      background: '#111111',
      borderRight: '1px solid #2a2a2a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
    }}>


      {TABS.map(({ id, label, Icon }) => {
        const isActive = activeTab === id
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            title={label}
            style={{
              width: 48, height: 48, border: 'none', cursor: 'pointer',
              background: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isActive ? '#fff' : '#555',
              borderLeft: isActive ? '2px solid #7c6af7' : '2px solid transparent',
              padding: 0,
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#aaa' }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = '#555' }}
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
          width: 48, height: 48, border: 'none', cursor: 'pointer',
          background: 'transparent', marginTop: 'auto',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#555', borderLeft: '2px solid transparent', padding: 0,
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
        onMouseLeave={e => (e.currentTarget.style.color = '#555')}
      >
        <SettingsIcon />
      </button>
    </div>
  )
}
