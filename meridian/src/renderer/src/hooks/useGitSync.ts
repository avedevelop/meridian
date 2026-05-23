import { useEffect, useRef, useCallback } from 'react'
import { useSettingsStore } from '../store/useSettingsStore'
import { useVaultStore } from '../store/useVaultStore'

const COMMIT_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

export function useGitSync() {
  const gitBackup = useSettingsStore((s) => s.pluginsEnabled.gitBackup)
  const gitDefaultBranch = useSettingsStore((s) => s.gitDefaultBranch)
  const vault = useVaultStore((s) => s.vault)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isSyncingRef = useRef(false)

  const runCommit = useCallback(async () => {
    if (!vault || isSyncingRef.current || !window.vault?.gitStatus) return
    try {
      isSyncingRef.current = true
      const status = await window.vault.gitStatus()
      if (!status.isRepo || status.clean) return
      const result = await window.vault.gitCommit()
      if (result.success) await window.vault.gitSync(gitDefaultBranch)
    } catch {
      // silent — StatusBar shows errors from its own polling
    } finally {
      isSyncingRef.current = false
    }
  }, [vault, gitDefaultBranch])

  // Periodic autocommit every 5 minutes
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (!gitBackup || !vault) return

    runCommit()
    timerRef.current = setInterval(runCommit, COMMIT_INTERVAL_MS)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [gitBackup, vault, runCommit])

  // Commit on window blur (when user switches apps)
  useEffect(() => {
    if (!gitBackup || !vault) return
    window.addEventListener('blur', runCommit)
    return () => window.removeEventListener('blur', runCommit)
  }, [gitBackup, vault, runCommit])

  return { runCommit }
}
