import { useState, useMemo, Component, type ReactNode } from 'react'
import { useVaultStore } from '../../store/useVaultStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'
import { FileTree } from './FileTree'
import { SearchPanel } from './SearchPanel'
import { FolderOpenBtnIcon, CollapseAllIcon } from '../Icons'
import { GraphView } from '../Graph/GraphView'
import { FileIcon } from './FileIcon'
import type { VaultFile } from '@shared/types'

type SortOrder = 'name-asc' | 'name-desc' | 'modified'

const SORT_LABELS: Record<SortOrder, string> = {
  'name-asc': 'A↑',
  'name-desc': 'A↓',
  'modified': '🕐'
}

const SORT_CYCLE: SortOrder[] = ['name-asc', 'name-desc', 'modified']

function sortFiles(files: import('@shared/types').VaultFile[], order: SortOrder): import('@shared/types').VaultFile[] {
  const sorted = [...files].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
    if (order === 'name-asc') return a.name.localeCompare(b.name)
    if (order === 'name-desc') return b.name.localeCompare(a.name)
    if (order === 'modified') return b.mtime - a.mtime
    return 0
  })
  return sorted.map((f) =>
    f.isDirectory && f.children ? { ...f, children: sortFiles(f.children, order) } : f
  )
}

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
    createDrawing,
    createFolder,
    openVault,
    renameFile,
    moveFile,
    deleteFile,
    revealFile
  } = useVaultBridge()
  const [filterQuery, setFilterQuery] = useState('')
  const [collapseKey, setCollapseKey] = useState(0)
  const [sortOrder, setSortOrder] = useState<SortOrder>('name-asc')
  const sortedFiles = useMemo(() => sortFiles(files, sortOrder), [files, sortOrder])

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
                borderBottom: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <FolderOpenBtnIcon size={12} color="var(--accent-color)" />
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
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: 14,
                  padding: '2px 4px',
                  borderRadius: 4,
                  flexShrink: 0,
                  lineHeight: 1
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
              >
                ⎆
              </button>
            </div>
            <div
              style={{
                padding: '4px 8px',
                borderBottom: '1px solid var(--border-color)',
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
                  background: 'var(--bg-surface)',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: 12
                }}
              />
              {filterQuery && (
                <button
                  onClick={() => setFilterQuery('')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
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
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '0 4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
              >
                <CollapseAllIcon size={12} />
              </button>
              <button
                onClick={() =>
                  setSortOrder((o) => {
                    const idx = SORT_CYCLE.indexOf(o)
                    return SORT_CYCLE[(idx + 1) % SORT_CYCLE.length]
                  })
                }
                title={`Sort: ${SORT_LABELS[sortOrder]} — click to change`}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: sortOrder !== 'name-asc' ? 'var(--accent-color)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '0 4px',
                  fontSize: 11,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  minWidth: 24,
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color =
                    sortOrder !== 'name-asc' ? 'var(--accent-color)' : 'var(--text-secondary)')
                }
              >
                {SORT_LABELS[sortOrder]}
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
              {filteredFiles ? (
                filteredFiles.length === 0 ? (
                  <div style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: 12 }}>
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
                        color: activeTabPath === f.path ? 'var(--text-primary)' : 'var(--text-secondary)',
                        background: activeTabPath === f.path ? 'var(--accent-glow)' : 'transparent',
                        fontWeight: activeTabPath === f.path ? '500' : 'normal',
                        borderLeft: activeTabPath === f.path ? '3px solid var(--accent-color)' : 'none',
                        fontSize: 13,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                      onMouseEnter={(e) => {
                        if (activeTabPath !== f.path) {
                          e.currentTarget.style.background = 'var(--bg-surface)'
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
                      <span style={{ color: 'var(--text-secondary)', fontSize: 11, flexShrink: 0 }}>
                        {f.relativePath.split('/').slice(0, -1).join('/')}
                      </span>
                    </div>
                  ))
                )
              ) : (
                <FileTree
                  files={sortedFiles}
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
                borderTop: '1px solid var(--border-color)',
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
                  background: 'var(--accent-glow)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                + New note
              </button>
              <button
                onClick={() => createDrawing(vault.path, `Drawing ${Date.now()}`)}
                title="Create a new drawing sketchpad"
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  background: 'var(--bg-surface)',
                  color: 'var(--accent-color)',
                  border: '1px solid var(--border-color)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M8 2a6 6 0 1 0 6 6c0-.8-.6-1.5-1.5-1.5h-1c-.8 0-1.5-.7-1.5-1.5v-1C10 3 9 2 8 2z" />
                  <circle cx="5.5" cy="6.5" r="1" fill="currentColor" />
                  <circle cx="8" cy="5" r="1" fill="currentColor" />
                  <circle cx="10.5" cy="8.5" r="1" fill="currentColor" />
                </svg>
              </button>
              <button
                onClick={() => createCanvas(vault.path, `Canvas ${Date.now()}`)}
                title="Create a new spatial canvas"
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  background: 'var(--bg-surface)',
                  color: 'var(--accent-color)',
                  border: '1px solid var(--border-color)',
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
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
                background: 'var(--bg-secondary)',
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
                  borderBottom: '1px solid var(--border-color)',
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
                    color: 'var(--text-secondary)',
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
                <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Graph View</span>
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
