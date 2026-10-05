import { describe, expect, it } from 'vitest'
import { acceleratorFromEvent, formatAccelerator, keyFromCode } from '../../src/shared/accelerator'

const ev = (
  code: string,
  mods: Partial<Record<'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey', boolean>> = {}
) => ({
  code,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...mods
})

describe('keyFromCode', () => {
  it('maps letters, digits, F-keys and named keys independent of the layout', () => {
    expect(keyFromCode('KeyH')).toBe('H')
    expect(keyFromCode('Digit7')).toBe('7')
    expect(keyFromCode('F1')).toBe('F1')
    expect(keyFromCode('F24')).toBe('F24')
    expect(keyFromCode('ArrowUp')).toBe('Up')
    expect(keyFromCode('Enter')).toBe('Return')
  })

  it('rejects modifiers, punctuation and out-of-range F-keys', () => {
    for (const code of [
      'ShiftLeft',
      'ControlRight',
      'MetaLeft',
      'Minus',
      'Backquote',
      'F25',
      'F0',
      'Numpad1',
      ''
    ]) {
      expect(keyFromCode(code)).toBeNull()
    }
  })
})

describe('acceleratorFromEvent', () => {
  it('uses Ctrl as CommandOrControl on Windows/Linux', () => {
    expect(acceleratorFromEvent(ev('KeyH', { ctrlKey: true, shiftKey: true }), false)).toBe(
      'CommandOrControl+Shift+H'
    )
    expect(acceleratorFromEvent(ev('KeyV', { ctrlKey: true, altKey: true }), false)).toBe(
      'CommandOrControl+Alt+V'
    )
  })

  it('uses Cmd as CommandOrControl on macOS and keeps Control separate', () => {
    expect(acceleratorFromEvent(ev('KeyH', { metaKey: true, shiftKey: true }), true)).toBe(
      'CommandOrControl+Shift+H'
    )
    expect(acceleratorFromEvent(ev('KeyH', { metaKey: true, ctrlKey: true }), true)).toBe(
      'CommandOrControl+Control+H'
    )
  })

  it('treats the Windows key as Super on non-mac platforms', () => {
    expect(acceleratorFromEvent(ev('KeyH', { metaKey: true }), false)).toBe('Super+H')
  })

  it('requires a real modifier and a non-modifier key', () => {
    expect(acceleratorFromEvent(ev('KeyH'), false)).toBeNull()
    expect(acceleratorFromEvent(ev('KeyH', { shiftKey: true }), false)).toBeNull()
    expect(
      acceleratorFromEvent(ev('ShiftLeft', { shiftKey: true, ctrlKey: true }), false)
    ).toBeNull()
    expect(acceleratorFromEvent(ev('Minus', { ctrlKey: true }), false)).toBeNull()
  })

  it('only produces strings the main process accepts', () => {
    const accepted = /^[A-Za-z0-9+]{1,60}$/
    for (const code of ['KeyA', 'Digit0', 'F12', 'Space', 'Enter', 'ArrowLeft', 'PageDown']) {
      expect(
        acceleratorFromEvent(ev(code, { ctrlKey: true, shiftKey: true, altKey: true }), false)
      ).toMatch(accepted)
    }
  })
})

describe('formatAccelerator', () => {
  it('formats for each platform', () => {
    expect(formatAccelerator('CommandOrControl+Shift+H', true)).toBe('⌘⇧H')
    expect(formatAccelerator('CommandOrControl+Shift+H', false)).toBe('Ctrl+Shift+H')
    expect(formatAccelerator('CommandOrControl+Control+Alt+F5', true)).toBe('⌘⌃⌥F5')
    expect(formatAccelerator('Super+H', false)).toBe('Win+H')
  })
})
