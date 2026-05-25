import { describe, expect, it } from 'vitest'
import { shouldIgnoreGlobalShortcut } from '../../src/renderer/src/utils/keyboardGuards'

function keyEvent(init: KeyboardEventInit, target?: HTMLElement): KeyboardEvent {
  const event = new KeyboardEvent('keydown', init)
  if (target) {
    Object.defineProperty(event, 'target', { value: target })
  }
  return event
}

describe('shouldIgnoreGlobalShortcut', () => {
  it('ignores composing input', () => {
    expect(shouldIgnoreGlobalShortcut(keyEvent({ key: 'a', isComposing: true }))).toBe(true)
  })

  it('ignores dead keys', () => {
    expect(shouldIgnoreGlobalShortcut(keyEvent({ key: 'Dead' }))).toBe(true)
  })

  it('ignores AltGraph-like input used by international layouts', () => {
    expect(shouldIgnoreGlobalShortcut(keyEvent({ key: '@', ctrlKey: true, altKey: true }))).toBe(
      true
    )
  })

  it('ignores editable fields', () => {
    const input = document.createElement('input')
    expect(shouldIgnoreGlobalShortcut(keyEvent({ key: 'k', metaKey: true }, input))).toBe(true)
  })

  it('does not ignore CmdOrCtrl shortcuts outside editable fields', () => {
    expect(shouldIgnoreGlobalShortcut(keyEvent({ key: 'k', metaKey: true }))).toBe(false)
  })
})
