import { describe, expect, it } from 'vitest'
import { shouldBlockWindowClose } from '../../src/renderer/src/hooks/useAutoSave'

describe('shouldBlockWindowClose', () => {
  it('blocks close when ask mode has dirty tabs', () => {
    expect(shouldBlockWindowClose('ask', 1)).toBe(true)
  })

  it('does not block close when no tabs are dirty', () => {
    expect(shouldBlockWindowClose('ask', 0)).toBe(false)
  })

  it('does not block close in save or discard mode', () => {
    expect(shouldBlockWindowClose('save', 2)).toBe(false)
    expect(shouldBlockWindowClose('discard', 2)).toBe(false)
  })
})
