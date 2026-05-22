import { useState, useEffect, useCallback, KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '../../store/useSettingsStore'
import { applyCommitTemplate } from './gitUtils'

export interface GitCommit {
  hash: string
  shortHash: string
  author: string
  date: string
  subject: string
}

export interface GitState {
  isRepo: boolean
  clean?: boolean
  changesCount?: number
  hasRemote?: boolean
  changes?: { path: string; status: 'modified' | 'added' | 'deleted' | 'untracked' | 'unknown' }[]
}

export function useGit() {
  const { t } = useTranslation()
  const gitCommitTemplate = useSettingsStore((s) => s.gitCommitTemplate)
  const gitDefaultBranch = useSettingsStore((s) => s.gitDefaultBranch)

  const [loading, setLoading] = useState(true)
  const [gitState, setGitState] = useState<GitState | null>(null)
  const [commits, setCommits] = useState<GitCommit[]>([])

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
    window.vault
      .githubStatus()
      .then((s) => {
        setGhConnected(s.connected)
        setGhUsername(s.username)
      })
      .catch(() => {})
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
      if (
        prev.trim() === '' ||
        prev.startsWith('Updated:') ||
        prev.startsWith('Added:') ||
        prev.startsWith('Deleted:')
      ) {
        return applyCommitTemplate(gitCommitTemplate, gitState.changes ?? [])
      }
      return prev
    })
  }, [gitState?.changes, gitCommitTemplate])

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
        setInfoMessage(t('gitPanel.connectRepoFirst'))
        setTimeout(() => setInfoMessage(null), 4000)
        return
      }
      if (statusRes.clean) {
        setInfoMessage(t('gitPanel.upToDate'))
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
        setError(commitRes.error ?? t('gitPanel.commitFailed'))
        return
      }
      const syncRes = await window.vault.gitSync(gitDefaultBranch)
      if (!syncRes.success) {
        setError(syncRes.error ?? t('gitPanel.syncFailed'))
      } else {
        setInfoMessage(t('gitPanel.backupComplete'))
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

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
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

  const handleSetRemote = async (url: string) => {
    setError(null)
    const res = await window.vault.gitSetRemote(url)
    if (res.success) {
      await fetchStatus()
    } else {
      setError(res.error ?? t('gitPanel.connectRepoFailed'))
    }
  }

  return {
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
    setError,
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
  }
}
