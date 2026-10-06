import { posix, win32 } from 'path'

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

/**
 * Files that are safe to hand to the system's default app: documents, images, media, plain data.
 * An allowlist, not a denylist: a plugin can write any file into the vault, and formats such as
 * .html, .svg, .docm, .chm, .jnlp or .iso run active content when opened.
 */
const SAFE_OPEN_EXTENSIONS = new Set([
  'md',
  'markdown',
  'txt',
  'pdf',
  'csv',
  'json',
  'canvas',
  'excalidraw',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'bmp',
  'tif',
  'tiff',
  'mp3',
  'wav',
  'ogg',
  'm4a',
  'mp4',
  'webm',
  'mov'
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

/** Could opening this file run something? Anything not on the allowlist, and extension-less files, count as risky. */
export function isRiskyToOpen(name: string): boolean {
  return !SAFE_OPEN_EXTENSIONS.has(extensionOf(name))
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
  const scp = new RegExp(`^[A-Za-z0-9._-]+@${host}:[^\\s]+$`)
  return https.test(url) || ssh.test(url) || scp.test(url)
}
