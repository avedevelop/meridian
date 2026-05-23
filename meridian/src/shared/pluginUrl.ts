/**
 * Helpers for the meridian-plugin:// scheme used to load community
 * plugin assets from inside a vault. Pure string logic so both
 * main (Node) and renderer can share it without crossing IPC.
 *
 * Format: meridian-plugin://<plugin-id>/<entry-file>
 *   - plugin-id: lowercase, alphanumeric, dashes (matches manifest.id)
 *   - entry-file: relative path inside the plugin folder, no leading slash
 */

export const PLUGIN_URL_SCHEME = 'meridian-plugin:'

const ID_RE = /^[a-z0-9][a-z0-9-]*$/

/**
 * Build a meridian-plugin:// URL for a given plugin id and entry file.
 * Returns null if id is not a valid plugin id.
 *
 * The entry file is normalized: leading "./" or "/" are stripped.
 * Backwards traversal (..) is rejected.
 */
export function buildPluginUrl(id: string, entryFile = 'main.js'): string | null {
  if (!ID_RE.test(id)) return null
  const cleaned = entryFile.replace(/^\.?\/+/, '')
  if (cleaned === '' || cleaned.split('/').some((seg) => seg === '..')) return null
  return `meridian-plugin://${id}/${cleaned}`
}

export interface ParsedPluginUrl {
  id: string
  path: string
}

/**
 * Parse a meridian-plugin:// URL back into { id, path }.
 * Returns null on invalid scheme, missing host, or unsafe path traversal.
 */
export function parsePluginUrl(url: string): ParsedPluginUrl | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== PLUGIN_URL_SCHEME) return null
  const id = parsed.hostname
  if (!ID_RE.test(id)) return null
  const path = decodeURIComponent(parsed.pathname).replace(/^\/+/, '')
  if (path === '' || path.split('/').some((seg) => seg === '..')) return null
  return { id, path }
}
