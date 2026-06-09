import { describe, expect, it } from 'vitest'
import { canRestoreFile, classifyGitError } from '../../src/shared/gitTrust'

describe('git trust helpers', () => {
  it('classifies common git failures', () => {
    expect(classifyGitError('git: command not found').kind).toBe('missing-git')
    expect(classifyGitError('fatal: not a git repository').kind).toBe('not-repo')
    expect(classifyGitError('Authentication failed for https://github.com/x/y')).toMatchObject({
      kind: 'auth'
    })
    expect(classifyGitError('CONFLICT (content): Merge conflict in A.md').kind).toBe('conflict')
  })

  it('allows clean restores and blocks dirty unconfirmed restores', () => {
    expect(canRestoreFile({ isDirty: false, confirmed: false })).toEqual({ ok: true })
    expect(canRestoreFile({ isDirty: true, confirmed: false })).toEqual({
      ok: false,
      reason: 'dirty-tab'
    })
    expect(canRestoreFile({ isDirty: true, confirmed: true })).toEqual({ ok: true })
  })
})
