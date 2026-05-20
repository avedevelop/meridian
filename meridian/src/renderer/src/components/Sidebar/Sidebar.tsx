import { useState, useMemo, Component, type ReactNode, useRef, useEffect } from 'react'
import { useVaultStore } from '../../store/useVaultStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'
import { FileTree } from './FileTree'
import { SearchPanel } from './SearchPanel'
import { FolderOpenBtnIcon, CollapseAllIcon } from '../Icons'
import { GraphView } from '../Graph/GraphView'
import { FileIcon } from './FileIcon'
import type { VaultFile } from '@shared/types'
import { CalendarPanel } from './CalendarPanel'
import { TasksPanel } from './TasksPanel'
import { GitPanel } from './GitPanel'

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
  activeTab: 'files' | 'search' | 'graph' | 'calendar' | 'tasks' | 'git'
  onTabChange: (tab: 'files' | 'search' | 'graph' | 'calendar' | 'tasks' | 'git') => void
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

interface VaultSwitcherDropdownProps {
  activeVaultPath: string
  activeVaultName: string
  onClose: () => void
  onOpenVault: () => void
  onOpenVaultByPath: (path: string) => void
  onCreateNewVault: () => void
}

function VaultSwitcherDropdown({
  activeVaultPath,
  activeVaultName,
  onClose,
  onOpenVault,
  onOpenVaultByPath,
  onCreateNewVault
}: VaultSwitcherDropdownProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [recentVaults, setRecentVaults] = useState<import('@shared/types').VaultConfig[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    window.settings
      .get()
      .then((config) => {
        setRecentVaults(config.recentVaults ?? [])
      })
      .catch((e) => console.error('Failed to get recents:', e))
  }, [])

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('mousedown', handleOutsideClick)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const handleCopyPath = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(activeVaultPath)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy path:', err)
    }
  }

  const otherVaults = recentVaults.filter((v) => v.path !== activeVaultPath)

  return (
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        top: 28,
        left: 8,
        right: 8,
        zIndex: 1000,
        background: 'rgba(22, 22, 22, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--border-color)',
        borderRadius: 8,
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
        padding: '8px 0',
        display: 'flex',
        flexDirection: 'column',
        animation: 'menuFadeIn 0.12s ease-out'
      }}
    >
      <style>{`
        @keyframes menuFadeIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .vs-menu-section {
          padding: 4px 12px;
          font-size: 10px;
          color: var(--text-secondary);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .vs-menu-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          color: var(--text-primary);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.12s ease;
          background: transparent;
          border: none;
          text-align: left;
          width: 100%;
          text-decoration: none;
        }
        .vs-menu-item:hover {
          background: var(--accent-color);
          color: #ffffff;
        }
        .vs-menu-item:hover .vs-subtext {
          color: rgba(255, 255, 255, 0.7);
        }
        .vs-subtext {
          color: var(--text-secondary);
          font-size: 10px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .vs-divider {
          height: 1px;
          background: var(--border-color);
          margin: 6px 0;
        }
      `}</style>

      <div style={{ padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '75%' }}>
            {activeVaultName}
          </span>
          <span
            style={{
              fontSize: 9,
              background: 'var(--accent-glow)',
              color: 'var(--accent-color)',
              padding: '1px 5px',
              borderRadius: 3,
              fontWeight: 600
            }}
          >
            Active
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
          <span
            style={{
              fontSize: 9,
              color: 'var(--text-secondary)',
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1
            }}
            title={activeVaultPath}
          >
            {activeVaultPath}
          </span>
          <button
            onClick={handleCopyPath}
            title="Copy path"
            style={{
              background: 'transparent',
              border: 'none',
              color: copied ? 'var(--accent-color)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 10,
              padding: 0,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {copied ? '✓' : '📋'}
          </button>
        </div>
      </div>

      <div className="vs-divider" />

      <div className="vs-menu-section">Recent Projects</div>
      {otherVaults.length === 0 ? (
        <div style={{ padding: '6px 12px', fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          No other recent vaults
        </div>
      ) : (
        <div style={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {otherVaults.map((v) => (
            <button
              key={v.path}
              className="vs-menu-item"
              onClick={() => {
                onClose()
                onOpenVaultByPath(v.path)
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
                <span>{v.name}</span>
                <span className="vs-subtext" title={v.path}>{v.path}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="vs-divider" />

      <div className="vs-menu-section">Actions</div>
      <button
        className="vs-menu-item"
        onClick={() => {
          onClose()
          onOpenVault()
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><path d="M12 11v6"></path><path d="M9 14h6"></path></svg>
        <span>Open Folder...</span>
      </button>
      <button
        className="vs-menu-item"
        onClick={() => {
          onClose()
          onCreateNewVault()
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
        <span>Create New Vault...</span>
      </button>
    </div>
  )
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
    openVaultByPath,
    createNewVault,
    renameFile,
    moveFile,
    deleteFile,
    revealFile
  } = useVaultBridge()
  const [filterQuery, setFilterQuery] = useState('')
  const [collapseKey, setCollapseKey] = useState(0)
  const [sortOrder, setSortOrder] = useState<SortOrder>('name-asc')
  const [vaultMenuOpen, setVaultMenuOpen] = useState(false)
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
                position: 'relative',
                padding: '6px 8px 6px 12px',
                borderBottom: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'background 0.12s ease'
              }}
              onClick={() => setVaultMenuOpen((o) => !o)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-surface)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <FolderOpenBtnIcon size={12} color="var(--accent-color)" />
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                {vault.name}
                <span style={{ fontSize: 8, color: 'var(--text-secondary)', opacity: 0.7 }}>▼</span>
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  openVault()
                }}
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
              {vaultMenuOpen && (
                <VaultSwitcherDropdown
                  activeVaultPath={vault.path}
                  activeVaultName={vault.name}
                  onClose={() => setVaultMenuOpen(false)}
                  onOpenVault={openVault}
                  onOpenVaultByPath={openVaultByPath}
                  onCreateNewVault={createNewVault}
                />
              )}
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
        {activeTab === 'git' && <GitPanel />}
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
        {activeTab === 'calendar' && <CalendarPanel />}
        {activeTab === 'tasks' && <TasksPanel />}
      </div>
    </div>
  )
}
