import React, { useState } from 'react'
import { useVaultStore } from '../../store/useVaultStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'
import { FileTree } from './FileTree'
import { SearchPanel } from './SearchPanel'

type SidebarTab = 'files' | 'search' | 'graph'

export function Sidebar() {
  const { vault, files } = useVaultStore()
  const { openFile, createFile } = useVaultBridge()
  const [activeTab, setActiveTab] = useState<SidebarTab>('files')

  if (!vault) return null

  const tabs: { id: SidebarTab; icon: string; label: string }[] = [
    { id: 'files', icon: '📄', label: 'Files' },
    { id: 'search', icon: '🔍', label: 'Search' },
    { id: 'graph', icon: '🕸️', label: 'Graph' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #2a2a2a', flexShrink: 0 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            title={tab.label}
            style={{
              flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer', fontSize: 14,
              background: activeTab === tab.id ? '#1a1a1a' : 'transparent',
              color: activeTab === tab.id ? '#fff' : '#555',
              borderBottom: activeTab === tab.id ? '2px solid #7c6af7' : '2px solid transparent',
            }}
          >
            {tab.icon}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'files' && (
          <>
            <div style={{
              padding: '8px 12px', borderBottom: '1px solid #2a2a2a', color: '#777',
              fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span>📁</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {vault.name}
              </span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
              <FileTree files={files} onFileClick={openFile} vaultPath={vault.path} />
            </div>
            <div style={{ padding: 8, borderTop: '1px solid #2a2a2a', flexShrink: 0 }}>
              <button
                onClick={() => createFile(vault.path, `Untitled ${Date.now()}.md`)}
                style={{
                  width: '100%', padding: '6px 0', borderRadius: 6,
                  background: '#2a2050', color: '#aaa', border: 'none',
                  fontSize: 12, cursor: 'pointer',
                }}
              >
                + New note
              </button>
            </div>
          </>
        )}
        {activeTab === 'search' && <SearchPanel />}
        {activeTab === 'graph' && (
          <GraphViewLazy />
        )}
      </div>
    </div>
  )
}

// Lazy wrapper to avoid importing D3 until needed
function GraphViewLazy() {
  const { GraphView } = require('../Graph/GraphView')
  return <GraphView />
}
