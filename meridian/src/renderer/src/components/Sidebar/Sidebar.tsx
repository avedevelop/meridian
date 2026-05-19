import { useState, useMemo, Component, type ReactNode } from 'react'
import { useVaultStore } from '../../store/useVaultStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'
import { FileTree } from './FileTree'
import { SearchPanel } from './SearchPanel'
import { FolderOpenBtnIcon, CollapseAllIcon } from '../Icons'
import { GraphView } from '../Graph/GraphView'
import { FileIcon } from './FileIcon'
import type { VaultFile } from '@shared/types'

interface SidebarProps {
  activeTab: 'files' | 'search' | 'graph'
  onTabChange: (tab: 'files' | 'search' | 'graph') => void
}

class GraphErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) {
    return { error: e.message }
  }
  render() {
    if (this.state.error)
      return (
        <div style={{ padding: 16, color: '#555', fontSize: 12 }}>
          <div style={{ marginBottom: 8, color: '#f44' }}>Graph error</div>
          <div>{this.state.error}</div>
        </div>
      )
    return this.props.children
  }
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { vault, files, activeTabPath } = useVaultStore()
  const {
    openFile,
    createFile,
    createCanvas,
    createFolder,
    openVault,
    renameFile,
    moveFile,
    deleteFile,
    revealFile
  } = useVaultBridge()
  const [filterQuery, setFilterQuery] = useState('')
  const [collapseKey, setCollapseKey] = useState(0)

  const filteredFiles = useMemo(() => {
    if (!filterQuery.trim()) return null
    const q = filterQuery.toLowerCase()
    const result: VaultFile[] = []
    function walk(items: VaultFile[]) {
      for (const f of items) {
        if (!f.isDirectory && f.name.toLowerCase().includes(q)) result.push(f)
        if (f.isDirectory && f.children) walk(f.children)
      }
    }
    walk(files)
    return result.slice(0, 100)
  }, [files, filterQuery])

  if (!vault) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'files' && (
          <>
            <div
              style={{
                padding: '6px 8px 6px 12px',
                borderBottom: '1px solid #2a2a2a',
                color: '#777',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <FolderOpenBtnIcon size={12} color="#7c6af7" />
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1
                }}
              >
                {vault.name}
              </span>
              <button
                onClick={openVault}
                title="Open another vault (⌘O)"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#555',
                  cursor: 'pointer',
                  fontSize: 14,
                  padding: '2px 4px',
                  borderRadius: 4,
                  flexShrink: 0,
                  lineHeight: 1
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#aaa')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#555')}
              >
                ⎆
              </button>
            </div>
            <div
              style={{
                padding: '4px 8px',
                borderBottom: '1px solid #2a2a2a',
                display: 'flex',
                gap: 4
              }}
            >
              <input
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter files..."
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  borderRadius: 4,
                  background: '#2a2a2a',
                  border: 'none',
                  outline: 'none',
                  color: '#ccc',
                  fontSize: 12
                }}
              />
              {filterQuery && (
                <button
                  onClick={() => setFilterQuery('')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#555',
                    cursor: 'pointer',
                    padding: '0 4px'
                  }}
                >
                  ×
                </button>
              )}
              <button
                onClick={() => setCollapseKey((k) => k + 1)}
                title="Collapse all folders"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#555',
                  cursor: 'pointer',
                  padding: '0 4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#aaa')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#555')}
              >
                <CollapseAllIcon size={12} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
              {filteredFiles ? (
                filteredFiles.length === 0 ? (
                  <div style={{ padding: '8px 12px', color: '#444', fontSize: 12 }}>
                    No files match.
                  </div>
                ) : (
                  filteredFiles.map((f) => (
                    <div
                      key={f.path}
                      onClick={() => openFile(f.path, f.name)}
                      style={{
                        padding: '3px 12px',
                        cursor: 'pointer',
                        color: activeTabPath === f.path ? '#fff' : '#ccc',
                        background: activeTabPath === f.path ? '#2d235c' : 'transparent',
                        fontWeight: activeTabPath === f.path ? '500' : 'normal',
                        borderLeft: activeTabPath === f.path ? '3px solid #7c6af7' : 'none',
                        fontSize: 13,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                      onMouseEnter={(e) => {
                        if (activeTabPath !== f.path) {
                          e.currentTarget.style.background = '#2a2a2a'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (activeTabPath !== f.path) {
                          e.currentTarget.style.background = 'transparent'
                        }
                      }}
                    >
                      <FileIcon name={f.name} isDirectory={false} />
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1
                        }}
                      >
                        {f.name}
                      </span>
                      <span style={{ color: '#444', fontSize: 11, flexShrink: 0 }}>
                        {f.relativePath.split('/').slice(0, -1).join('/')}
                      </span>
                    </div>
                  ))
                )
              ) : (
                <FileTree
                  files={files}
                  onFileClick={openFile}
                  onRename={renameFile}
                  onDelete={deleteFile}
                  onNewFolder={createFolder}
                  onCreateFile={createFile}
                  onMove={moveFile}
                  onReveal={revealFile}
                  collapseKey={collapseKey}
                  vaultPath={vault.path}
                  activePath={activeTabPath}
                />
              )}
            </div>
            <div
              style={{
                padding: 8,
                borderTop: '1px solid #2a2a2a',
                flexShrink: 0,
                display: 'flex',
                gap: 6
              }}
            >
              <button
                onClick={() => createFile(vault.path, `Untitled ${Date.now()}.md`)}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  borderRadius: 6,
                  background: '#2a2050',
                  color: '#aaa',
                  border: 'none',
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                + New note
              </button>
              <button
                onClick={() => createCanvas(vault.path, `Canvas ${Date.now()}`)}
                title="Create a new spatial canvas"
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  background: '#1e2040',
                  color: '#7c6af7',
                  border: '1px solid #3a3a5a',
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                ⊞
              </button>
            </div>
          </>
        )}
        {activeTab === 'search' && <SearchPanel />}
        {activeTab === 'graph' && (
          <GraphErrorBoundary>
            {/* Full-screen overlay — note: setActiveTab is in scope */}
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 900,
                background: '#161616',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 16px',
                  paddingTop: 38,
                  borderBottom: '1px solid #2a2a2a',
                  flexShrink: 0,
                  // @ts-ignore -- Electron drag region style is not part of React CSSProperties.
                  WebkitAppRegion: 'no-drag'
                }}
              >
                <button
                  onClick={() => onTabChange('files')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#888',
                    cursor: 'pointer',
                    fontSize: 13,
                    padding: '4px 8px',
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  ← Back
                </button>
                <span style={{ color: '#555', fontSize: 13 }}>Graph View</span>
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <GraphView onFileOpen={() => onTabChange('files')} />
              </div>
            </div>
          </GraphErrorBoundary>
        )}
      </div>
    </div>
  )
}
