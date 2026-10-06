import type { ClipboardSettings } from '../../shared/clipboard'

/**
 * Formats that password managers and the OS set on clipboard content that must not be recorded.
 * Windows: https://learn.microsoft.com/windows/win32/dataxchg/clipboard-formats
 * macOS: http://nspasteboard.org
 */
export const EXCLUDE_FORMATS = {
  win32: ['ExcludeClipboardContentFromMonitorProcessing'],
  darwin: ['org.nspasteboard.ConcealedType', 'org.nspasteboard.TransientType'],
  linux: ['x-kde-passwordManagerHint']
} as const

/**
 * macOS apps whose copies are never recorded. Apple Passwords sets no "concealed" marker, so this is the
 * only protection for it; the third-party managers set the marker too, this is a second line.
 */
const PRIVATE_APP_BUNDLES = [
  'com.apple.passwords',
  'com.apple.keychainaccess',
  'com.1password.1password',
  'com.agilebits.onepassword7',
  'com.agilebits.onepassword-osx',
  'com.bitwarden.desktop',
  'org.keepassxc.keepassxc',
  'com.dashlane.dashlanephonefinal',
  'com.lastpass.lastpass',
  'com.markmcguill.strongbox.mac'
]

export function isPrivateAppBundle(bundleId: string): boolean {
  return PRIVATE_APP_BUNDLES.includes(bundleId.toLowerCase())
}

/** Windows: a DWORD of 0 in CanIncludeInClipboardHistory means "do not record". */
export const WIN_HISTORY_FORMAT = 'CanIncludeInClipboardHistory'

export interface FormatProbe {
  has(format: string): boolean
  readBuffer(format: string): Buffer
}

export function shouldSkipByFormat(platform: NodeJS.Platform, probe: FormatProbe): boolean {
  const names =
    (EXCLUDE_FORMATS as Record<string, readonly string[]>)[platform] ?? EXCLUDE_FORMATS.linux
  for (const name of names) {
    try {
      if (probe.has(name)) return true
    } catch {
      // unsupported format name on this platform: treat as absent
    }
  }
  if (platform === 'win32') {
    try {
      if (probe.has(WIN_HISTORY_FORMAT)) {
        const buf = probe.readBuffer(WIN_HISTORY_FORMAT)
        if (buf.length >= 4 && buf.readUInt32LE(0) === 0) return true
      }
    } catch {
      // ignore
    }
  }
  return false
}

function luhn(digits: string): boolean {
  let sum = 0
  let alt = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48
    if (alt) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alt = !alt
  }
  return sum % 10 === 0
}

/** How many of lower / upper / digit / symbol appear. Real secrets mix classes; slugs and words do not. */
function charClasses(s: string): number {
  return [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(s)).length
}

function entropy(s: string): number {
  const counts = new Map<string, number>()
  for (const c of s) counts.set(c, (counts.get(c) ?? 0) + 1)
  let h = 0
  for (const n of counts.values()) {
    const p = n / s.length
    h -= p * Math.log2(p)
  }
  return h
}

const PATTERNS: RegExp[] = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/
]

/** Heuristic: does this text look like a secret? Favors few false positives on normal prose. */
export function looksSensitive(text: string): boolean {
  if (!text || text.length > 20000) return false
  if (PATTERNS.some((re) => re.test(text))) return true
  const trimmed = text.trim()
  // Best effort only: Apple's default generated password (three groups of six, abcde1-fghijk-lMnopq).
  // Its other styles and user-chosen passwords look like ordinary text; the app blocklist is the real guard.
  if (
    /^[A-Za-z0-9]{6}-[A-Za-z0-9]{6}-[A-Za-z0-9]{6}$/.test(trimmed) &&
    /\d/.test(trimmed) &&
    /[a-z]/.test(trimmed) &&
    /[A-Z]/.test(trimmed)
  ) {
    return true
  }
  const digits = trimmed.replace(/[ -]/g, '')
  if (/^\d{13,19}$/.test(digits) && /^[\d -]+$/.test(trimmed) && luhn(digits)) return true
  // A single long token with no spaces and high entropy (API keys, passwords from generators)
  if (
    /^\S{32,128}$/.test(trimmed) &&
    !/^(https?|file):/i.test(trimmed) &&
    entropy(trimmed) > 4.2 &&
    charClasses(trimmed) >= 3
  ) {
    return true
  }
  return false
}

export function maskPreview(preview: string): string {
  return '•'.repeat(Math.min(preview.length, 12) || 8)
}

export function shouldStore(sensitive: boolean, mode: ClipboardSettings['sensitiveMode']): boolean {
  return !(sensitive && mode === 'skip')
}
