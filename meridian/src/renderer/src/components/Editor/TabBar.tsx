import React from 'react'
import { useVaultStore } from '../../store/useVaultStore'

export function TabBar() {
  const { openTabs, activeTabPath, setActiveTab, closeTab } = useVaultStore()

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end',
      background: '#161616', borderBottom: '1px solid #2a2a2a',
      height: 36, overflowX: 'auto', flexShrink: 0,
    }}>
      {openTabs.map(tab => {
        const isActive = tab.path === activeTabPath
        return (
          <div
            key={tab.path}
            onClick={() => setActiveTab(tab.path)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '0 12px', height: '100%', cursor: 'pointer',
              borderRight: '1px solid #2a2a2a', flexShrink: 0,
              background: isActive ? '#1a1a1a' : 'transparent',
              color: isActive ? '#fff' : '#666', fontSize: 13,
              borderBottom: isActive ? '1px solid #1a1a1a' : 'none',
              marginBottom: isActive ? -1 : 0,
            }}
          >
            {tab.isDirty && <span style={{ color: '#7c6af7', fontSize: 10 }}>●</span>}
            <span>{tab.name}</span>
            <span
              onClick={e => { e.stopPropagation(); closeTab(tab.path) }}
              style={{ color: '#555', fontSize: 16, lineHeight: 1, marginLeft: 4 }}
            >
              ×
            </span>
          </div>
        )
      })}
    </div>
  )
}
