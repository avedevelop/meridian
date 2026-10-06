import { posix, win32 } from 'path'
import { isIP } from 'net'

/**
 * Checks for IPC handlers that take paths or URLs from the renderer. The renderer can run plugin
 * code, so these inputs are untrusted (see docs/plugin-security-audit.md). All functions are pure
 * and take the platform explicitly so they can be tested for Windows and POSIX on any machine.
 */

type Platform = NodeJS.Platform

const pathFor = (platform: Platform): typeof posix => (platform === 'win32' ? win32 : posix)

/** Absolute, normalized form for comparisons (case-insensitive on Windows and macOS). */
export function normalizePath(input: string, platform: Platform): string | null {
  if (typeof input !== 'string' || input.length === 0 || input.includes('\0')) return null
  const p = pathFor(platform)
  if (!p.isAbsolute(input)) return null
  const resolved = p.resolve(input).replace(/[\\/]+$/, '')
  const out = resolved === '' ? p.sep : resolved
  return platform === 'win32' || platform === 'darwin' ? out.toLowerCase() : out
}

/** `target` is `root` itself or a path inside it. */
export function isSameOrInside(root: string, target: string, platform: Platform): boolean {
  const r = normalizePath(root, platform)
  const t = normalizePath(target, platform)
  if (!r || !t) return false
  if (r === t) return true
  const sep = pathFor(platform).sep
  return t.startsWith(r.endsWith(sep) ? r : r + sep)
}

/** A vault may only be opened if the user chose it before (dialog, recent list, welcome vault). */
export function isVaultPathAllowed(
  candidate: string,
  approved: ReadonlyArray<string | null | undefined>,
  platform: Platform
): boolean {
  const c = normalizePath(candidate, platform)
  if (!c) return false
  return approved.some((a) => !!a && normalizePath(a, platform) === c)
}

const EXECUTABLE_EXTENSIONS = new Set([
  // Windows
  'exe',
  'com',
  'bat',
  'cmd',
  'msi',
  'msp',
  'scr',
  'pif',
  'cpl',
  'lnk',
  'url',
  'reg',
  'hta',
  'dll',
  'ps1',
  'psm1',
  'psd1',
  'vbs',
  'vbe',
  'js',
  'jse',
  'wsf',
  'wsh',
  'jar',
  'appx',
  'msix',
  // macOS
  'app',
  'command',
  'pkg',
  'dmg',
  'workflow',
  'action',
  'scpt',
  'scptd',
  'terminal',
  'osx',
  // Linux and scripts that run through a default handler
  'sh',
  'bash',
  'zsh',
  'run',
  'bin',
  'desktop',
  'appimage',
  'deb',
  'rpm',
  'py',
  'rb',
  'pl',
  'php'
])

/** Extension after the last dot, ignoring trailing dots and spaces (Windows strips them). */
export function extensionOf(name: string): string {
  const base =
    name
      .replace(/[. ]+$/, '')
      .split(/[\\/]/)
      .pop() ?? ''
  const dot = base.lastIndexOf('.')
  return dot <= 0 ? '' : base.slice(dot + 1).toLowerCase()
}

/** Could opening this file run it? Files without an extension count as risky. */
export function isRiskyToOpen(name: string): boolean {
  const ext = extensionOf(name)
  return ext === '' || EXECUTABLE_EXTENSIONS.has(ext)
}

export interface OpenPathContext {
  vaultRoot: string | null
  /** Exact paths the app itself offers to open (for example its config folder). */
  exactAllowed: string[]
  isDirectory: boolean
}

/** `shell.openPath` may open the app's own folders, and non-executable files inside the vault. */
export function canOpenPath(target: string, ctx: OpenPathContext, platform: Platform): boolean {
  const t = normalizePath(target, platform)
  if (!t) return false
  if (ctx.exactAllowed.some((a) => normalizePath(a, platform) === t)) return true
  if (!ctx.vaultRoot || !isSameOrInside(ctx.vaultRoot, target, platform)) return false
  return ctx.isDirectory || !isRiskyToOpen(target)
}

export const WELCOME_VAULT_NAMES = ['Meridian Welcome', 'Meridian Welcome (Windows)'] as const

/**
 * The welcome vault is created (and replaced, if it exists) at one fixed place: a folder with a
 * known name directly inside Documents. Anything else is refused, because the handler deletes
 * the destination first.
 */
export function isWelcomeDestAllowed(
  dest: string,
  roots: { home: string; documents: string },
  platform: Platform
): boolean {
  const p = pathFor(platform)
  const d = normalizePath(dest, platform)
  if (!d) return false
  const bases = [p.join(roots.home, 'Documents'), roots.documents]
  return bases.some((base) =>
    WELCOME_VAULT_NAMES.some((name) => normalizePath(p.join(base, name), platform) === d)
  )
}

/**
 * Git remotes: https://, ssh:// or scp-style (git@host:path) only. Local paths and exotic
 * transports (ext::, fd::, file:) are refused, as is anything that could be read as an option.
 */
export function isSafeGitRemote(url: unknown): boolean {
  if (typeof url !== 'string' || url.length === 0 || url.length > 500) return false
  // eslint-disable-next-line no-control-regex
  if (/[\s\u0000-\u001f\u007f]/.test(url) || url.startsWith('-')) return false
  const userinfo = '([^\\s/@:]+(:[^\\s/@]*)?@)?'
  const host = '[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?'
  const port = '(:\\d{1,5})?'
  const https = new RegExp(`^https://${userinfo}${host}${port}/[^\\s]+$`)
  const ssh = new RegExp(`^ssh://${userinfo}${host}${port}/[^\\s]+$`)
  const scp = new RegExp(`^[A-Za-z0-9._-]+@${host}:[^\\s/][^\\s]*$`)
  return https.test(url) || ssh.test(url) || scp.test(url)
}

function ipv4Octets(ip: string): number[] | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  const nums = parts.map((x) => (/^\d{1,3}$/.test(x) ? Number(x) : NaN))
  return nums.every((n) => n >= 0 && n <= 255) ? nums : null
}

function isPrivateIPv4(o: number[]): boolean {
  const [a, b, c] = o
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  )
}

/** Expand an IPv6 address into eight 16-bit groups, or null if it is malformed. */
function ipv6Groups(ip: string): number[] | null {
  let text = ip.split('%')[0]
  const v4 = /(\d+\.\d+\.\d+\.\d+)$/.exec(text)
  if (v4) {
    const o = ipv4Octets(v4[1])
    if (!o) return null
    text =
      text.slice(0, -v4[1].length) +
      ((o[0] << 8) | o[1]).toString(16) +
      ':' +
      ((o[2] << 8) | o[3]).toString(16)
  }
  const halves = text.split('::')
  if (halves.length > 2) return null
  const head = halves[0] ? halves[0].split(':') : []
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : []
  const missing = 8 - head.length - tail.length
  if ((halves.length === 1 && missing !== 0) || missing < 0) return null
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill('0'), ...tail]
  if (groups.length !== 8 || !groups.every((g) => /^[0-9a-fA-F]{1,4}$/.test(g))) return null
  return groups.map((g) => parseInt(g, 16))
}

/** Loopback, private, link-local, multicast, reserved and unspecified addresses. */
export function isPrivateAddress(ip: string): boolean {
  const kind = isIP(ip)
  if (kind === 4) {
    const o = ipv4Octets(ip)
    return !o || isPrivateIPv4(o)
  }
  if (kind === 6) {
    const g = ipv6Groups(ip)
    if (!g) return true
    if (g.every((x) => x === 0)) return true // ::
    if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return true // ::1
    // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible: judge by the embedded IPv4 address
    if (g.slice(0, 5).every((x) => x === 0) && (g[5] === 0xffff || g[5] === 0)) {
      return isPrivateIPv4([g[6] >> 8, g[6] & 255, g[7] >> 8, g[7] & 255])
    }
    // NAT64 64:ff9b::/96
    if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) {
      return isPrivateIPv4([g[6] >> 8, g[6] & 255, g[7] >> 8, g[7] & 255])
    }
    if ((g[0] & 0xfe00) === 0xfc00) return true // fc00::/7 unique local
    if ((g[0] & 0xffc0) === 0xfe80) return true // fe80::/10 link-local
    if ((g[0] & 0xff00) === 0xff00) return true // multicast
    if (g[0] === 0x2001 && g[1] === 0x0db8) return true // documentation
    return false
  }
  return true // not an IP address at all
}

/** Host names that are local by convention, whatever DNS says. */
export function isLocalHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, '')
  return (
    h === 'localhost' ||
    h.endsWith('.localhost') ||
    h.endsWith('.local') ||
    h.endsWith('.internal') ||
    h.endsWith('.lan') ||
    h.endsWith('.home.arpa') ||
    !h.includes('.') // single-label names resolve through the local network
  )
}
