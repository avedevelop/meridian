/**
 * Build Electron accelerator strings (global shortcuts) from keyboard events.
 * Only letters, digits, F-keys and a few named keys are produced, which keeps the string inside
 * the pattern the main process accepts (`^[A-Za-z0-9+]+$`).
 */

export interface KeyEventLike {
  code: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  shiftKey: boolean
}

const NAMED_KEYS: Record<string, string> = {
  Space: 'Space',
  Enter: 'Return',
  Tab: 'Tab',
  Backspace: 'Backspace',
  Delete: 'Delete',
  Insert: 'Insert',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right'
}

/** Layout-independent key name from `KeyboardEvent.code`, or null if unsupported. */
export function keyFromCode(code: string): string | null {
  let m = /^Key([A-Z])$/.exec(code)
  if (m) return m[1]
  m = /^Digit([0-9])$/.exec(code)
  if (m) return m[1]
  m = /^F([1-9]|1[0-9]|2[0-4])$/.exec(code)
  if (m) return `F${m[1]}`
  return NAMED_KEYS[code] ?? null
}

/**
 * Accelerator for a key press, or null while only modifiers are held, the key is unsupported, or
 * there is no real modifier (Shift alone would swallow normal typing system-wide).
 */
export function acceleratorFromEvent(e: KeyEventLike, isMac: boolean): string | null {
  const key = keyFromCode(e.code)
  if (!key) return null
  const parts: string[] = []
  if (isMac ? e.metaKey : e.ctrlKey) parts.push('CommandOrControl')
  if (isMac && e.ctrlKey) parts.push('Control')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  if (!isMac && e.metaKey) parts.push('Super')
  if (!parts.some((p) => p !== 'Shift')) return null
  return [...parts, key].join('+')
}

/** Human-readable form: `CommandOrControl+Shift+H` -> `⌘⇧H` on macOS, `Ctrl+Shift+H` elsewhere. */
export function formatAccelerator(accelerator: string, isMac: boolean): string {
  const names: Record<string, [string, string]> = {
    CommandOrControl: ['⌘', 'Ctrl'],
    Control: ['⌃', 'Ctrl'],
    Alt: ['⌥', 'Alt'],
    Shift: ['⇧', 'Shift'],
    Super: ['⌘', 'Win']
  }
  const parts = accelerator.split('+').map((p) => (names[p] ? names[p][isMac ? 0 : 1] : p))
  return parts.join(isMac ? '' : '+')
}
