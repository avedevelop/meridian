import { useMemo, useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useVaultStore } from '../store/useVaultStore'
import { useEditorStore } from '../store/useEditorStore'
import { useSettingsStore } from '../store/useSettingsStore'

export function StatusBar() {
  const { t } = useTranslation()
  const { openTabs, activeTabPath } = useVaultStore()
  const activeTab = openTabs.find((t) => t.path === activeTabPath)
  const cursorPos = useEditorStore((s) => s.cursorPos)
  const showWordCounter = useSettingsStore((s) => s.pluginsEnabled.wordCounter)
  const gitBackupEnabled = useSettingsStore((s) => s.pluginsEnabled.gitBackup)
  const autoBackupInterval = useSettingsStore((s) => s.autoBackupInterval)
  const gitDefaultBranch = useSettingsStore((s) => s.gitDefaultBranch)

  const [gitState, setGitState] = useState<{ isRepo: boolean; clean?: boolean; changesCount?: number } | null>(null)
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')
  const [syncError, setSyncError] = useState<string | null>(null)

  const wordCount = useMemo(() => {
    if (!activeTab?.content) return 0
    return activeTab.content.trim().split(/\s+/).filter(Boolean).length
  }, [activeTab?.content])

  const fetchGitStatus = useCallback(async () => {
    if (!gitBackupEnabled) return
    try {
      const status = await window.vault.gitStatus()
      setGitState(status)
    } catch {
      setGitState({ isRepo: false })
    }
  }, [gitBackupEnabled])

  const handleGitSync = useCallback(async () => {
    setSyncState('syncing')
    setSyncError(null)
    try {
      const commitRes = await window.vault.gitCommit()
      if (!commitRes.success) {
        setSyncState('error')
        setSyncError(commitRes.error ?? 'Commit failed')
        return
      }
      const syncRes = await window.vault.gitSync(gitDefaultBranch)
      if (!syncRes.success) {
        setSyncState('error')
        setSyncError(syncRes.error ?? 'Sync failed')
        return
      }
      setSyncState('success')
      setTimeout(() => setSyncState('idle'), 3000)
      await fetchGitStatus()
    } catch (e: any) {
      setSyncState('error')
      setSyncError(e.message || String(e))
    }
  }, [fetchGitStatus])

  // Periodic Git check & autocommit
  useEffect(() => {
    if (!gitBackupEnabled) {
      setGitState(null)
      return
    }
    fetchGitStatus()
    if (autoBackupInterval === 0) return
    const timer = setInterval(() => {
      fetchGitStatus().then(() => {
        if (gitState && gitState.isRepo && !gitState.clean && syncState === 'idle') {
          handleGitSync()
        }
      })
    }, autoBackupInterval * 60 * 1000)
    return () => clearInterval(timer)
  }, [gitBackupEnabled, autoBackupInterval, fetchGitStatus, gitState, syncState, handleGitSync])

  // Also fetch git status on file tab activity/dirty states changes
  useEffect(() => {
    fetchGitStatus()
  }, [activeTabPath, activeTab?.isDirty, fetchGitStatus])

  return (
    <div
      style={{
        height: 24,
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        color: 'var(--text-secondary)',
        fontSize: 11,
        gap: 16,
        flexShrink: 0,
        userSelect: 'none'
      }}
    >
      {showWordCounter && <span>{t('statusBar.words', { count: wordCount })}</span>}
      {cursorPos && (
        <span>
          {t('statusBar.line', { line: cursorPos.line, col: cursorPos.col })}
        </span>
      )}
      <span>{t('statusBar.markdown')}</span>
      {activeTab?.isDirty && <span style={{ color: 'var(--accent-color)' }}>{t('statusBar.unsavedChanges')}</span>}

      {/* Git Backups Status bar Widget */}
      {gitBackupEnabled && gitState && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 12 }}>
          <span style={{ color: 'var(--border-color)' }}>|</span>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="5" cy="12" r="2.5" />
            <circle cx="11" cy="4" r="2.5" />
            <path d="M5 9.5V4a2 2 0 0 1 2-2h2" />
          </svg>
          
          {!gitState.isRepo ? (
            <span style={{ opacity: 0.6 }}>{t('statusBar.notRepo')}</span>
          ) : (
            <>
              {syncState === 'syncing' && <span style={{ color: 'var(--accent-color)' }}>{t('statusBar.syncing')}</span>}
              {syncState === 'success' && <span style={{ color: '#10b981' }}>{t('statusBar.synced')}</span>}
              {syncState === 'error' && (
                <span
                  title={syncError ?? t('common.error')}
                  style={{ color: '#ef4444', cursor: 'help', textDecoration: 'underline' }}
                >
                  {t('statusBar.syncError')}
                </span>
              )}
              {syncState === 'idle' && (
                <span style={{ opacity: gitState.clean ? 0.5 : 0.9, color: gitState.clean ? 'inherit' : 'var(--accent-color)' }}>
                  {gitState.clean ? t('statusBar.upToDate') : t('statusBar.unsaved', { count: gitState.changesCount })}
                </span>
              )}

              {syncState === 'idle' && !gitState.clean && (
                <button
                  onClick={handleGitSync}
                  disabled={false}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--accent-color)',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    borderRadius: 3,
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  {t('gitPanel.sync')}
                </button>
              )}
            </>
          )}
        </div>
      )}

      <span style={{ marginLeft: 'auto' }}>Meridian</span>
    </div>
  )
}
