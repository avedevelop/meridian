/**
 * Path helpers that work for both POSIX and Windows paths.
 * File paths come from the main process in the platform's native form
 * (`C:\Vault\Note.md` on Windows), while wiki-links and canvas references
 * always use `/`, so renderer code must not assume one separator.
 */

/** Replace backslashes with forward slashes. */
export function toPosix(path: string): string {
  return path.replace(/\\/g, '/')
}

/** Last path segment, ignoring trailing separators. */
export function basename(path: string): string {
  const parts = toPosix(path).split('/').filter(Boolean)
  return parts[parts.length - 1] ?? ''
}

/** Last path segment without a trailing `.md` or `.canvas` extension. */
export function noteName(path: string): string {
  return basename(path).replace(/\.(md|canvas)$/i, '')
}

/** True when `child` is inside `parent` (either separator style, case-sensitive). */
export function isInside(parent: string, child: string): boolean {
  const p = toPosix(parent).replace(/\/+$/, '')
  return toPosix(child).startsWith(`${p}/`)
}

/** `path` relative to `root`, always with `/` separators; null when outside `root`. */
export function relativeTo(root: string, path: string): string | null {
  if (!isInside(root, path)) return null
  return toPosix(path).slice(toPosix(root).replace(/\/+$/, '').length + 1)
}
