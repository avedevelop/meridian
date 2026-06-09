export type GitErrorKind = 'missing-git' | 'not-repo' | 'auth' | 'conflict' | 'remote' | 'unknown'

export interface GitErrorInfo {
  kind: GitErrorKind
  message: string
}

export function classifyGitError(message: string): GitErrorInfo {
  const lower = message.toLowerCase()
  if (lower.includes('command not found') || lower.includes('enoent')) {
    return { kind: 'missing-git', message }
  }
  if (lower.includes('not a git repository') || lower.includes('is-inside-work-tree')) {
    return { kind: 'not-repo', message }
  }
  if (lower.includes('authentication failed') || lower.includes('permission denied')) {
    return { kind: 'auth', message }
  }
  if (lower.includes('conflict') || lower.includes('merge')) {
    return { kind: 'conflict', message }
  }
  if (lower.includes('remote') || lower.includes('push') || lower.includes('pull')) {
    return { kind: 'remote', message }
  }
  return { kind: 'unknown', message }
}

export function canRestoreFile({
  isDirty,
  confirmed
}: {
  isDirty: boolean
  confirmed: boolean
}): { ok: true } | { ok: false; reason: 'dirty-tab' } {
  if (isDirty && !confirmed) return { ok: false, reason: 'dirty-tab' }
  return { ok: true }
}
