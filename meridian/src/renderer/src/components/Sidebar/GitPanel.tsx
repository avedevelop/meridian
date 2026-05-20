import React, { useState, useEffect, useCallback } from 'react'
import { useVaultStore } from '../../store/useVaultStore'
import { FileIcon } from '../Icons'

export function GitPanel() {
  const openTab = useVaultStore((s) => s.openTab)
  
  const [loading, setLoading] = useState(true)
  const [gitState, setGitState] = useState<{
    isRepo: boolean
    clean?: boolean
    changesCount?: number
    changes?: { path: string; status: 'modified' | 'added' | 'deleted' | 'untracked' | 'unknown' }[]
  } | null>(null)
  
  const [commits, setCommits] = useState<{
    hash: string
    shortHash: string
    author: string
    date: string
    subject: string
  }[]>([])

  const [commitMessage, setCommitMessage] = useState('')
  const [committing, setCommitting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [copiedHash, setCopiedHash] = useState<string | null>(null)

  const [changesExpanded, setChangesExpanded] = useState(true)
  const [historyExpanded, setHistoryExpanded] = useState(true)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await window.vault.gitStatus()
      setGitState(res)
    } catch (e: any) {
      setGitState({ isRepo: false })
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchCommits = useCallback(async () => {
    try {
      const res = await window.vault.gitLog()
      if (res.success && res.commits) {
        setCommits(res.commits)
      }
    } catch (e) {
      console.error('Failed to fetch git commits log', e)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    fetchCommits()
    const interval = setInterval(() => {
      fetchStatus()
      fetchCommits()
    }, 5000)
    const unsubscribe = window.vault.onFileChanged(() => {
      fetchStatus()
      fetchCommits()
    })
    return () => {
      clearInterval(interval)
      unsubscribe()
    }
  }, [fetchStatus, fetchCommits])

  const handleInit = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await window.vault.gitInit()
      if (!res.success) {
        setError(res.error ?? 'Failed to initialize Git repository')
      }
      await fetchStatus()
      await fetchCommits()
    } catch (e: any) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  const handleCommit = async () => {
    if (!commitMessage.trim()) return
    setCommitting(true)
    setError(null)
    try {
      const res = await window.vault.gitCommit(commitMessage)
      if (res.success) {
        setCommitMessage('')
        await fetchStatus()
        await fetchCommits()
      } else {
        setError(res.error ?? 'Commit failed')
      }
    } catch (e: any) {
      setError(e.message || String(e))
    } finally {
      setCommitting(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setError(null)
    setInfoMessage(null)
    try {
      const commitRes = await window.vault.gitCommit()
      if (!commitRes.success) {
        setError(commitRes.error ?? 'Auto-commit failed')
        return
      }
      const syncRes = await window.vault.gitSync()
      if (!syncRes.success) {
        setError(syncRes.error ?? 'Sync failed')
      } else {
        if (syncRes.noRemote) {
          setInfoMessage('Committed locally! Configure a remote to sync with a host.')
          setTimeout(() => setInfoMessage(null), 6000)
        }
        await fetchStatus()
        await fetchCommits()
      }
    } catch (e: any) {
      setError(e.message || String(e))
    } finally {
      setSyncing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleCommit()
    }
  }

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash)
    setCopiedHash(hash)
    setTimeout(() => setCopiedHash(null), 2000)
  }

  if (loading && !gitState) {
    return (
      <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 12 }}>
        Loading Git status...
      </div>
    )
  }

  if (!gitState?.isRepo) {
    return (
      <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', margin: 0, letterSpacing: '0.05em' }}>
          Source Control
        </h3>
        <div style={{
          padding: 12,
          background: 'var(--bg-secondary)',
          border: '1px dashed var(--border-color)',
          borderRadius: 8,
          fontSize: 12,
          color: 'var(--text-secondary)',
          lineHeight: '1.5',
          textAlign: 'center'
        }}>
          This folder is not a Git repository.
        </div>
        <button
          onClick={handleInit}
          style={{
            background: 'var(--accent-color)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 6,
            padding: '8px 12px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'opacity 0.2s',
            width: '100%'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          Initialize Repository
        </button>
        {error && (
          <div style={{ fontSize: 11, color: '#f87171', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            Error: {error}
          </div>
        )}
      </div>
    )
  }

  const changes = gitState.changes || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', userSelect: 'none' }}>
      {/* Panel Title */}
      <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', margin: 0, letterSpacing: '0.05em' }}>
          Source Control
        </h3>
        <button
          onClick={() => {
            fetchStatus()
            fetchCommits()
          }}
          title="Refresh Git Status"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>

      {/* Commit Input Field / Sync */}
      <div style={{ padding: '0 16px 12px 16px', display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid var(--border-color)' }}>
        <textarea
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Commit message (Cmd+Enter to commit)"
          style={{
            width: '100%',
            minHeight: 64,
            maxHeight: 120,
            padding: '8px 10px',
            borderRadius: 6,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: 12,
            resize: 'vertical',
            fontFamily: 'inherit',
            lineHeight: 1.4
          }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={handleCommit}
            disabled={committing || !commitMessage.trim()}
            style={{
              flex: 1,
              background: 'var(--accent-color)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: commitMessage.trim() ? 'pointer' : 'default',
              opacity: committing || !commitMessage.trim() ? 0.5 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            {committing ? 'Committing...' : 'Commit'}
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            title="Commit all files and push/pull to backup origin"
            style={{
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              opacity: syncing ? 0.6 : 1
            }}
            onMouseEnter={(e) => { if(!syncing) e.currentTarget.style.background = 'var(--bg-secondary)' }}
            onMouseLeave={(e) => { if(!syncing) e.currentTarget.style.background = 'var(--bg-surface)' }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{ animation: syncing ? 'spin 1.5s linear infinite' : 'none' }}
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>{syncing ? 'Syncing...' : 'Sync'}</span>
          </button>
        </div>
      </div>

      {/* Notifications and errors */}
      {error && (
        <div style={{ padding: '8px 16px', fontSize: 11, color: '#f87171', whiteSpace: 'pre-wrap', wordBreak: 'break-all', borderBottom: '1px solid var(--border-color)' }}>
          Error: {error}
        </div>
      )}

      {infoMessage && (
        <div style={{ padding: '8px 16px', fontSize: 11, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', borderBottom: '1px solid var(--border-color)', background: 'var(--accent-glow)' }}>
          {infoMessage}
        </div>
      )}

      {copiedHash && (
        <div style={{ padding: '6px 16px', fontSize: 11, color: 'var(--accent-color)', fontWeight: 500, background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)', textAlign: 'center' }}>
          ✓ Copied commit hash to clipboard!
        </div>
      )}

      {/* Scrollable Accordions */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        
        {/* Changes Accordion */}
        <div
          onClick={() => setChangesExpanded(!changesExpanded)}
          style={{
            padding: '8px 16px',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              transform: changesExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease',
              display: 'inline-block',
              fontSize: 8
            }}>▶</span>
            <span>CHANGES</span>
          </div>
          <span style={{
            background: 'var(--bg-surface)',
            padding: '2px 6px',
            borderRadius: 10,
            fontSize: 9,
            color: 'var(--text-secondary)'
          }}>{changes.length}</span>
        </div>

        {changesExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--border-color)' }}>
            {changes.length === 0 ? (
              <div style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontSize: 12, textAlign: 'center', fontStyle: 'italic' }}>
                No changes detected
              </div>
            ) : (
              changes.map((change) => {
                const name = change.path.split(/[/\\]/).pop() || change.path
                const relativeDir = change.path.includes('/') || change.path.includes('\\')
                  ? change.path.slice(0, change.path.lastIndexOf(change.path.includes('/') ? '/' : '\\'))
                  : ''

                let badgeText = 'M'
                let badgeColor = '#dcb67a'
                let badgeBg = 'rgba(220, 182, 122, 0.15)'
                if (change.status === 'added') {
                  badgeText = 'A'
                  badgeColor = '#2ea44f'
                  badgeBg = 'rgba(46, 164, 79, 0.15)'
                } else if (change.status === 'untracked') {
                  badgeText = 'U'
                  badgeColor = '#2ea44f'
                  badgeBg = 'rgba(46, 164, 79, 0.15)'
                } else if (change.status === 'deleted') {
                  badgeText = 'D'
                  badgeColor = '#cf222e'
                  badgeBg = 'rgba(207, 34, 46, 0.15)'
                }

                const isDeleted = change.status === 'deleted'

                return (
                  <div
                    key={change.path}
                    onClick={() => {
                      if (!isDeleted) {
                        openTab('git-diff://' + change.path, 'Diff: ' + name)
                      }
                    }}
                    style={{
                      padding: '8px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: isDeleted ? 'default' : 'pointer',
                      gap: 12
                    }}
                    onMouseEnter={(e) => {
                      if (!isDeleted) e.currentTarget.style.background = 'var(--bg-surface)'
                    }}
                    onMouseLeave={(e) => {
                      if (!isDeleted) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', flex: 1 }}>
                      <FileIcon size={14} color={isDeleted ? 'var(--text-secondary)' : 'var(--accent-color)'} style={{ flexShrink: 0 }} />
                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <span style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: isDeleted ? 'var(--text-secondary)' : 'var(--text-primary)',
                          textDecoration: isDeleted ? 'line-through' : 'none',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap'
                        }}>
                          {name}
                        </span>
                        {relativeDir && (
                          <span style={{
                            fontSize: 10,
                            color: 'var(--text-secondary)',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap'
                          }}>
                            {relativeDir}
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 'bold',
                      width: 16,
                      height: 16,
                      borderRadius: 3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: badgeColor,
                      backgroundColor: badgeBg,
                      flexShrink: 0
                    }}>
                      {badgeText}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Commit History Accordion */}
        <div
          onClick={() => setHistoryExpanded(!historyExpanded)}
          style={{
            padding: '8px 16px',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              transform: historyExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease',
              display: 'inline-block',
              fontSize: 8
            }}>▶</span>
            <span>COMMIT HISTORY</span>
          </div>
          <span style={{
            background: 'var(--bg-surface)',
            padding: '2px 6px',
            borderRadius: 10,
            fontSize: 9,
            color: 'var(--text-secondary)'
          }}>{commits.length}</span>
        </div>

        {historyExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {commits.length === 0 ? (
              <div style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontSize: 12, textAlign: 'center', fontStyle: 'italic' }}>
                No commits yet
              </div>
            ) : (
              commits.map((commit) => (
                <div
                  key={commit.hash}
                  onClick={() => handleCopyHash(commit.hash)}
                  title="Click to copy full commit hash"
                  style={{
                    padding: '8px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    gap: 3,
                    borderBottom: '1px solid var(--border-color-light, rgba(255,255,255,0.03))'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1
                    }}>
                      {commit.subject}
                    </span>
                    <span style={{
                      fontSize: 10,
                      fontFamily: 'monospace',
                      color: 'var(--accent-color)',
                      background: 'var(--accent-glow)',
                      padding: '1px 4px',
                      borderRadius: 4,
                      flexShrink: 0
                    }}>
                      {commit.shortHash}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-secondary)' }}>
                    <span>{commit.author}</span>
                    <span>{commit.date}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />
    </div>
  )
}
