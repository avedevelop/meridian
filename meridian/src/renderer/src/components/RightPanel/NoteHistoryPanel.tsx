import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { canRestoreFile, classifyGitError } from '@shared/gitTrust'
import type { GitCommitSummary } from '@shared/types'
import { useLinkStore } from '../../store/useLinkStore'
import { useVaultStore } from '../../store/useVaultStore'

function shortName(path: string): string {
  return (path.split(/[\\/]/).pop() ?? path).replace(/\.md$/i, '')
}

export function NoteHistoryPanel() {
  const { t } = useTranslation()
  const activeTabPath = useVaultStore((state) => state.activeTabPath)
  const openTabs = useVaultStore((state) => state.openTabs)
  const setTabContent = useVaultStore((state) => state.setTabContent)
  const markTabDirty = useVaultStore((state) => state.markTabDirty)
  const vault = useVaultStore((state) => state.vault)
  const [commits, setCommits] = useState<GitCommitSummary[]>([])
  const [selectedHash, setSelectedHash] = useState('')
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const activeTab = openTabs.find((tab) => tab.path === activeTabPath)

  const isMarkdownNote = Boolean(activeTabPath?.toLowerCase().endsWith('.md'))
  const selectedCommit = useMemo(
    () => commits.find((commit) => commit.hash === selectedHash),
    [commits, selectedHash]
  )

  useEffect(() => {
    if (!activeTabPath || !isMarkdownNote) {
      setCommits([])
      setSelectedHash('')
      setPreview('')
      return
    }

    let active = true
    setLoading(true)
    setError('')
    window.vault
      .gitFileLog(activeTabPath)
      .then((result) => {
        if (!active) return
        if (!result.success) {
          const info = classifyGitError(result.error ?? '')
          setError(t(`gitTrust.error.${info.kind}`))
          setCommits([])
          return
        }
        const nextCommits = result.commits ?? []
        setCommits(nextCommits)
        setSelectedHash(nextCommits[0]?.hash ?? '')
      })
      .catch((err) => {
        if (active) setError(String(err))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [activeTabPath, isMarkdownNote, t])

  useEffect(() => {
    if (!activeTabPath || !selectedHash) {
      setPreview('')
      return
    }

    let active = true
    window.vault.gitShowFileAtCommit(activeTabPath, selectedHash).then((result) => {
      if (!active) return
      setPreview(result.success ? (result.content ?? '') : '')
      if (!result.success && result.error) {
        const info = classifyGitError(result.error)
        setError(t(`gitTrust.error.${info.kind}`))
      }
    })

    return () => {
      active = false
    }
  }, [activeTabPath, selectedHash, t])

  const handleRestore = async () => {
    if (!activeTabPath || !selectedHash || !activeTab) return
    const guard = canRestoreFile({ isDirty: activeTab.isDirty, confirmed: false })
    if (!guard.ok) {
      const confirmed = window.confirm(t('gitTrust.restoreDirtyConfirm'))
      if (!canRestoreFile({ isDirty: activeTab.isDirty, confirmed }).ok) return
    }

    const result = await window.vault.gitRestoreFile(activeTabPath, selectedHash)
    if (!result.success) {
      const info = classifyGitError(result.error ?? '')
      setError(t(`gitTrust.error.${info.kind}`))
      return
    }

    const content = result.content ?? ''
    setTabContent(activeTabPath, content)
    markTabDirty(activeTabPath, false)
    if (vault) {
      useLinkStore
        .getState()
        .indexFile(activeTabPath, activeTab.name, content, vault.path)
    }
  }

  if (!activeTabPath || !isMarkdownNote) {
    return <div className="properties-workspace--empty">{t('gitTrust.noNoteOpen')}</div>
  }

  return (
    <section className="properties-workspace" role="region" aria-labelledby="note-history-title">
      <h2 id="note-history-title" className="properties-heading">
        {t('gitTrust.title')}
      </h2>

      {loading && <div className="properties-message">{t('common.loading')}</div>}
      {error && <div className="properties-alert properties-hint">{error}</div>}
      {!loading && commits.length === 0 && !error && (
        <div className="properties-message">{t('gitTrust.empty')}</div>
      )}

      {commits.length > 0 && (
        <>
          <div className="properties-list">
            {commits.map((commit) => (
              <button
                key={commit.hash}
                type="button"
                className="relationship-link"
                style={{
                  color: selectedHash === commit.hash ? 'var(--text-primary)' : undefined,
                  background: selectedHash === commit.hash ? 'var(--utility-surface-raised)' : undefined
                }}
                onClick={() => setSelectedHash(commit.hash)}
              >
                <span style={{ display: 'block', fontWeight: 600 }}>{commit.subject}</span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)' }}>
                  {commit.shortHash} · {commit.date} · {commit.author}
                </span>
              </button>
            ))}
          </div>

          {selectedCommit && (
            <div className="properties-list">
              <div className="properties-section-heading">
                {t('gitTrust.preview', { name: shortName(activeTabPath) })}
              </div>
              <pre
                style={{
                  maxHeight: 220,
                  overflow: 'auto',
                  margin: 0,
                  padding: 10,
                  borderRadius: 8,
                  border: '1px solid var(--utility-divider)',
                  background: 'var(--utility-surface)',
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  lineHeight: 1.45,
                  whiteSpace: 'pre-wrap'
                }}
              >
                {preview || t('gitTrust.emptyPreview')}
              </pre>
              <button
                type="button"
                className="properties-button properties-button--primary"
                onClick={handleRestore}
              >
                {t('gitTrust.restoreVersion')}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
