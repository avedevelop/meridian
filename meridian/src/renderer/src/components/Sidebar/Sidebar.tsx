import { useState, Component, type ReactNode } from 'react'
import { useVaultStore } from '../../store/useVaultStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'
import { FileTree } from './FileTree'
import { SearchPanel } from './SearchPanel'
import { GraphView } from '../Graph/GraphView'

class GraphErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e.message } }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 16, color: '#555', fontSize: 12 }}>
        <div style={{ marginBottom: 8, color: '#f44' }}>Graph error</div>
        <div>{this.state.error}</div>
      </div>
    )
    return this.props.children
  }
}

type SidebarTab = 'files' | 'search' | 'graph'

export function Sidebar() {
  const { vault, files } = useVaultStore()
  const { openFile, createFile, createFolder, openVault, renameFile, moveFile, deleteFile } = useVaultBridge()
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
              padding: '6px 8px 6px 12px', borderBottom: '1px solid #2a2a2a', color: '#777',
              fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span>📁</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {vault.name}
              </span>
              <button
                onClick={openVault}
                title="Open another vault (⌘O)"
                style={{
                  background: 'transparent', border: 'none', color: '#555',
                  cursor: 'pointer', fontSize: 14, padding: '2px 4px', borderRadius: 4,
                  flexShrink: 0, lineHeight: 1,
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
                onMouseLeave={e => (e.currentTarget.style.color = '#555')}
              >
                ⎆
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
              <FileTree files={files} onFileClick={openFile} onRename={renameFile} onDelete={deleteFile} onNewFolder={createFolder} onMove={moveFile} collapseKey={0} vaultPath={vault.path} />
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
          <GraphErrorBoundary>
            {/* Full-screen overlay — note: setActiveTab is in scope */}
            <div style={{
              position: 'fixed', inset: 0, zIndex: 900,
              background: '#161616', display: 'flex', flexDirection: 'column',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 16px', paddingTop: 38, borderBottom: '1px solid #2a2a2a', flexShrink: 0,
                // @ts-ignore -- Electron drag region style is not part of React CSSProperties.
                WebkitAppRegion: 'no-drag',
              }}>
                <button
                  onClick={() => setActiveTab('files')}
                  style={{
                    background: 'transparent', border: 'none', color: '#888',
                    cursor: 'pointer', fontSize: 13, padding: '4px 8px',
                    borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  ← Back
                </button>
                <span style={{ color: '#555', fontSize: 13 }}>Graph View</span>
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <GraphView onFileOpen={() => setActiveTab('files')} />
              </div>
            </div>
          </GraphErrorBoundary>
        )}
      </div>
    </div>
  )
}
