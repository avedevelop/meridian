import React, { useState, useEffect, useCallback } from 'react'
import { useVaultStore } from '../../store/useVaultStore'
import { FileIcon } from '../Icons'
import { useSettingsStore } from '../../store/useSettingsStore'

function timeAgo(dateStr: string): string {
  const now = new Date()
  const then = new Date(dateStr)
  if (isNaN(then.getTime())) return dateStr
  const diffDays = Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) === 1 ? '' : 's'} ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) === 1 ? '' : 's'} ago`
  return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) === 1 ? '' : 's'} ago`
}

function autoCommitMessage(changes: { path: string; status: string }[]): string {
  if (changes.length === 0) return ''
  const names = changes
    .slice(0, 3)
    .map((c) => c.path.split('/').pop() ?? c.path)
  const suffix = changes.length > 3 ? ` +${changes.length - 3} more` : ''
  const action =
    changes.every((c) => c.status === 'added' || c.status === 'untracked')
      ? 'Added'
      : changes.every((c) => c.status === 'deleted')
      ? 'Deleted'
      : 'Updated'
  return `${action}: ${names.join(', ')}${suffix}`
}

interface SetupWizardProps {
  isRepo: boolean
  ghConnected: boolean
  ghUsername: string
  hasRemote: boolean
  onInit: () => void
  onSetRemote: (url: string) => void
  loading: boolean
  error: string | null
}

function SetupWizard({ isRepo, ghConnected, ghUsername, hasRemote, onInit, onSetRemote, loading, error }: SetupWizardProps) {
  const [remoteUrl, setRemoteUrl] = React.useState('')

  const steps = [
    { done: isRepo, label: 'Enable backup', desc: 'Set up version history for this vault' },
    { done: ghConnected, label: 'Connect GitHub', desc: 'Sign in to upload notes online' },
    { done: hasRemote, label: 'Set repository', desc: 'Choose where to store your backup' },
  ]
  const currentStep = steps.findIndex((s) => !s.done)

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflowY: 'auto' }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
          ☁️ Set up Cloud Backup
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Complete these steps to back up your notes automatically.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map((step, i) => {
          const isActive = i === currentStep
          const isDone = step.done
          return (
            <div
              key={step.label}
              style={{
                display: 'flex',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 8,
                background: isActive ? 'var(--bg-surface)' : 'transparent',
                border: isActive ? '1px solid var(--border-color)' : '1px solid transparent',
                opacity: !isDone && !isActive ? 0.4 : 1
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                background: isDone ? '#4ade80' : isActive ? 'var(--accent-color)' : 'var(--bg-surface)',
                color: isDone || isActive ? '#fff' : 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700
              }}>
                {isDone ? '✓' : i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{step.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>{step.desc}</div>

                {isActive && i === 0 && (
                  <button
                    onClick={onInit}
                    disabled={loading}
                    style={{
                      marginTop: 8, padding: '6px 14px', borderRadius: 6,
                      background: 'var(--accent-color)', color: '#fff',
                      border: 'none', fontSize: 12, fontWeight: 600,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    {loading ? 'Setting up…' : 'Enable Backup'}
                  </button>
                )}

                {isActive && i === 1 && (
                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('meridian:open-settings', { detail: 'sync' }))
                    }}
                    style={{
                      marginTop: 8, padding: '6px 14px', borderRadius: 6,
                      background: '#24292e', color: '#fff',
                      border: '1px solid #444', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                    </svg>
                    Connect GitHub Account
                  </button>
                )}

                {isActive && i === 2 && (
                  <div style={{ marginTop: 8 }}>
                    {ghUsername && (
                      <div style={{ fontSize: 11, color: '#4ade80', marginBottom: 6 }}>
                        ✓ Signed in as @{ghUsername}
                      </div>
                    )}
                    <input
                      value={remoteUrl}
                      onChange={(e) => setRemoteUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && remoteUrl.trim()) onSetRemote(remoteUrl.trim()) }}
                      placeholder="https://github.com/you/my-notes.git"
                      style={{
                        width: '100%', padding: '6px 8px', borderRadius: 5,
                        background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                        outline: 'none', color: 'var(--text-primary)', fontSize: 11,
                        boxSizing: 'border-box' as const, marginBottom: 6
                      }}
                    />
                    <button
                      onClick={() => onSetRemote(remoteUrl.trim())}
                      disabled={!remoteUrl.trim()}
                      style={{
                        width: '100%', padding: '6px 0', borderRadius: 5,
                        background: 'var(--accent-color)', color: '#fff',
                        border: 'none', fontSize: 12, fontWeight: 600,
                        cursor: remoteUrl.trim() ? 'pointer' : 'not-allowed',
                        opacity: remoteUrl.trim() ? 1 : 0.5
                      }}
                    >
                      Connect Repository
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <div style={{ fontSize: 11, color: '#f87171', padding: '6px 10px', background: 'rgba(248,113,113,0.08)', borderRadius: 6 }}>
          ⚠ {error}
        </div>
      )}
    </div>
  )
}

export function GitPanel() {
  const openTab = useVaultStore((s) => s.openTab)
  const { autoBackupInterval, updateSetting } = useSettingsStore()
  
  const [loading, setLoading] = useState(true)
  const [gitState, setGitState] = useState<{
    isRepo: boolean
    clean?: boolean
    changesCount?: number
    hasRemote?: boolean
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
  const [syncConfirm, setSyncConfirm] = useState<{ isEmpty: boolean; localCommits: number } | null>(null)
  const [checkingSync, setCheckingSync] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [copiedHash, setCopiedHash] = useState<string | null>(null)

  const [ghConnected, setGhConnected] = useState(false)
  const [ghUsername, setGhUsername] = useState('')

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
    window.vault.githubStatus().then((s) => {
      setGhConnected(s.connected)
      setGhUsername(s.username)
    }).catch(() => {})
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

  useEffect(() => {
    if (!gitState?.changes || gitState.changes.length === 0) return
    setCommitMessage((prev) => {
      if (prev.trim() === '' || prev.startsWith('Updated:') || prev.startsWith('Added:') || prev.startsWith('Deleted:')) {
        return autoCommitMessage(gitState.changes ?? [])
      }
      return prev
    })
  }, [gitState?.changes])

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

  const handleSyncCheck = async () => {
    setCheckingSync(true)
    setError(null)
    try {
      const statusRes = await window.vault.gitStatus()
      if (!statusRes.hasRemote) {
        setInfoMessage('Connect a GitHub repo first to back up online.')
        setTimeout(() => setInfoMessage(null), 4000)
        return
      }
      if (statusRes.clean) {
        setInfoMessage('Everything is already backed up.')
        setTimeout(() => setInfoMessage(null), 3000)
        return
      }
      setSyncConfirm({ isEmpty: commits.length === 0, localCommits: statusRes.changesCount ?? 0 })
    } catch (e: any) {
      setError(e.message || String(e))
    } finally {
      setCheckingSync(false)
    }
  }

  const handleSyncConfirmed = async () => {
    setSyncConfirm(null)
    setSyncing(true)
    setError(null)
    setInfoMessage(null)
    try {
      const commitRes = await window.vault.gitCommit()
      if (!commitRes.success && commitRes.message !== 'Nothing to commit') {
        setError(commitRes.error ?? 'Commit failed')
        return
      }
      const syncRes = await window.vault.gitSync()
      if (!syncRes.success) {
        setError(syncRes.error ?? 'Sync failed')
      } else {
        setInfoMessage('Backup complete!')
        setTimeout(() => setInfoMessage(null), 4000)
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

  // Show setup wizard when backup is not fully configured
  if (!gitState?.isRepo || !ghConnected || !gitState.hasRemote) {
    return (
      <SetupWizard
        isRepo={gitState?.isRepo ?? false}
        ghConnected={ghConnected}
        ghUsername={ghUsername}
        hasRemote={gitState?.hasRemote ?? false}
        onInit={handleInit}
        onSetRemote={async (url) => {
          setError(null)
          const res = await window.vault.gitSetRemote(url)
          if (res.success) {
            await fetchStatus()
          } else {
            setError(res.error ?? 'Failed to connect repository')
          }
        }}
        loading={loading}
        error={error}
      />
    )
  }

  const changes = gitState.changes || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', userSelect: 'none' }}>
      {/* Panel Title */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', margin: 0, letterSpacing: '0.05em' }}>
            Cloud Backup
          </h3>
          {ghConnected && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', flexShrink: 0, display: 'inline-block' }} />
              <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.7 }}>@{ghUsername}</span>
            </div>
          )}
        </div>
        <button
          onClick={() => { fetchStatus(); fetchCommits() }}
          title="Refresh"
          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', borderRadius: 4, flexShrink: 0 }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>

      {/* Commit Input Field / Sync */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid var(--border-color)' }}>
        <textarea
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What changed? (optional — auto-filled)"
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
            {committing ? 'Saving…' : 'Save Snapshot'}
          </button>
          <button
            onClick={handleSyncCheck}
            disabled={syncing || checkingSync}
            title="Commit and sync with remote"
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
              opacity: syncing || checkingSync ? 0.6 : 1
            }}
            onMouseEnter={(e) => { if (!syncing && !checkingSync) e.currentTarget.style.background = 'var(--bg-secondary)' }}
            onMouseLeave={(e) => { if (!syncing && !checkingSync) e.currentTarget.style.background = 'var(--bg-surface)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ animation: syncing ? 'spin 1.5s linear infinite' : 'none' }}>
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>{syncing ? 'Backing up…' : checkingSync ? 'Checking…' : 'Backup Now'}</span>
          </button>
        </div>
      </div>

      {/* Sync confirmation dialog */}
      {syncConfirm && (
        <div style={{
          margin: '8px 12px',
          padding: '12px 14px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 4 }}>
            {syncConfirm.isEmpty
              ? '📭 Remote repo is empty'
              : `📝 ${syncConfirm.localCommits} file${syncConfirm.localCommits === 1 ? '' : 's'} changed`}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12 }}>
            {syncConfirm.isEmpty
              ? 'Your notes will be uploaded to GitHub for the first time.'
              : 'Your changes will be saved and uploaded to GitHub.'}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={handleSyncConfirmed}
              style={{
                flex: 1, padding: '6px 0', borderRadius: 6,
                background: 'var(--accent-color)', color: '#fff',
                border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer'
              }}
            >
              Save &amp; Upload
            </button>
            <button
              onClick={() => setSyncConfirm(null)}
              style={{
                padding: '6px 12px', borderRadius: 6,
                background: 'transparent', color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)', fontSize: 12, cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Notifications and errors */}
      {error && (
        <div style={{
          margin: '8px 12px',
          padding: '8px 12px',
          background: 'rgba(248,113,113,0.08)',
          border: '1px solid rgba(248,113,113,0.2)',
          borderRadius: 6,
          fontSize: 12,
          color: '#f87171',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8
        }}>
          <span style={{ flexShrink: 0 }}>⚠</span>
          <span>{error}</span>
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
            <span>UNSAVED CHANGES</span>
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
                Everything is saved
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
            <span>SNAPSHOT HISTORY</span>
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
                    <span>{timeAgo(commit.date)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Auto-backup toggle */}
      <div style={{
        padding: '10px 14px',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        flexShrink: 0
      }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 500 }}>Auto-backup</div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
            {autoBackupInterval === 0 ? 'Off' : `Every ${autoBackupInterval} min`}
          </div>
        </div>
        <select
          value={autoBackupInterval}
          onChange={(e) => updateSetting('autoBackupInterval', Number(e.target.value) as 0 | 15 | 30 | 60)}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 5,
            color: 'var(--text-primary)',
            fontSize: 11,
            padding: '3px 6px',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          <option value={0}>Off</option>
          <option value={15}>15 min</option>
          <option value={30}>30 min</option>
          <option value={60}>1 hour</option>
        </select>
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
