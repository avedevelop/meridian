import { useTranslation } from 'react-i18next'
import { useVaultStore } from '../../store/useVaultStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { SetupWizard } from './SetupWizard'
import { ChangesAccordion } from './ChangesAccordion'
import { HistoryAccordion } from './HistoryAccordion'
import { useGit } from './useGit'

export function GitPanel() {
  const { t } = useTranslation()
  const openTab = useVaultStore((s) => s.openTab)
  const { autoBackupInterval, updateSetting } = useSettingsStore()

  const {
    loading,
    gitState,
    commits,
    commitMessage,
    setCommitMessage,
    committing,
    syncing,
    syncConfirm,
    setSyncConfirm,
    checkingSync,
    error,
    infoMessage,
    copiedHash,
    ghConnected,
    ghUsername,
    changesExpanded,
    setChangesExpanded,
    historyExpanded,
    setHistoryExpanded,
    fetchStatus,
    fetchCommits,
    handleInit,
    handleCommit,
    handleSyncCheck,
    handleSyncConfirmed,
    handleKeyDown,
    handleCopyHash,
    handleSetRemote
  } = useGit()

  if (loading && !gitState) {
    return (
      <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 12 }}>
        {t('gitPanel.loadingGit')}
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
        onSetRemote={handleSetRemote}
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
            {t('gitPanel.title')}
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
          title={t('gitPanel.refresh')}
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
          placeholder={t('gitPanel.commitPlaceholderDesc')}
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
            {committing ? t('gitPanel.saving') : t('gitPanel.saveSnapshot')}
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
            <span>{syncing ? t('gitPanel.backingUp') : checkingSync ? t('gitPanel.checking') : t('gitPanel.backupNow')}</span>
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
              ? t('gitPanel.remoteEmpty')
              : t(syncConfirm.localCommits === 1 ? 'gitPanel.filesChanged' : 'gitPanel.filesChanged_plural', { count: syncConfirm.localCommits })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12 }}>
            {syncConfirm.isEmpty
              ? t('gitPanel.firstUpload')
              : t('gitPanel.uploadConfirm')}
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
              {t('gitPanel.saveAndUpload')}
            </button>
            <button
              onClick={() => setSyncConfirm(null)}
              style={{
                padding: '6px 12px', borderRadius: 6,
                background: 'transparent', color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)', fontSize: 12, cursor: 'pointer'
              }}
            >
              {t('common.cancel')}
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
          {t('gitPanel.copiedHash')}
        </div>
      )}

      {/* Scrollable Accordions */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <ChangesAccordion
          expanded={changesExpanded}
          onToggle={() => setChangesExpanded(!changesExpanded)}
          changes={changes}
          onOpenDiff={(path, name) => openTab('git-diff://' + path, 'Diff: ' + name)}
        />
        <HistoryAccordion
          expanded={historyExpanded}
          onToggle={() => setHistoryExpanded(!historyExpanded)}
          commits={commits}
          onCopyHash={handleCopyHash}
        />
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
          <div style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 500 }}>{t('gitPanel.autoBackup')}</div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
            {autoBackupInterval === 0 ? t('gitPanel.autoBackupOff') :
             autoBackupInterval === 15 ? t('gitPanel.backup15Min') :
             autoBackupInterval === 30 ? t('gitPanel.backup30Min') :
             t('gitPanel.backup1Hour')}
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
          <option value={0}>{t('gitPanel.autoBackupOff')}</option>
          <option value={15}>{t('gitPanel.backup15Min')}</option>
          <option value={30}>{t('gitPanel.backup30Min')}</option>
          <option value={60}>{t('gitPanel.backup1Hour')}</option>
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
