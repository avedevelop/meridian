import type { VaultFile } from '@shared/types'

export const IMAGE_EXTS = /\.(png|jpg|jpeg|gif|webp|svg|bmp|tiff)$/i

export const CALLOUT_TYPES: Record<string, { icon: string; color: string }> = {
  note: { icon: 'ℹ️', color: '#4b9ef4' },
  info: { icon: 'ℹ️', color: '#4b9ef4' },
  tip: { icon: '💡', color: '#22c55e' },
  warning: { icon: '⚠️', color: '#f59e0b' },
  caution: { icon: '⚠️', color: '#f59e0b' },
  danger: { icon: '🔥', color: '#ef4444' },
  error: { icon: '❌', color: '#ef4444' },
  success: { icon: '✅', color: '#22c55e' },
  question: { icon: '❓', color: '#a855f7' },
  quote: { icon: '💬', color: '#6b7280' },
  abstract: { icon: '📋', color: '#6366f1' },
  summary: { icon: '📋', color: '#6366f1' },
  todo: { icon: '☑️', color: '#6366f1' },
  important: { icon: '❗', color: '#ef4444' }
}

export function processCallouts(html: string): string {
  // Two-step: first capture each blockquote, then check if it's a callout
  return html.replace(/<blockquote>([\s\S]*?)<\/blockquote>/gi, (fullMatch, inner) => {
    // Accept [!TYPE] at start of first <p>, with optional title, optional <br> variant, newline
    const m = inner.match(/^\s*<p>\[!([\w]+)\]([^<\n]*?)(?:<br\s*\/?>)?\n?([\s\S]*?)<\/p>([\s\S]*)$/i)
    if (!m) return fullMatch

    const [, type, titleRest, firstParaRest, rest] = m
    const typeKey = type.toLowerCase()
    const info = CALLOUT_TYPES[typeKey] ?? { icon: '📝', color: '#6b7280' }
    const displayTitle = titleRest.trim() || (typeKey.charAt(0).toUpperCase() + typeKey.slice(1))
    const body = (firstParaRest + rest).trim()
    return `<div class="callout callout-${typeKey}" style="border-left:4px solid ${info.color};background:${info.color}22;border-radius:6px;padding:12px 16px;margin:12px 0"><div class="callout-title" style="display:flex;align-items:center;gap:6px;font-weight:600;margin-bottom:${body ? '8px' : '0'};color:${info.color}"><span>${info.icon}</span><span>${displayTitle}</span></div>${body ? `<div class="callout-content">${body}</div>` : ''}</div>`
  })
}

export function flattenVaultFiles(files: VaultFile[]): VaultFile[] {
  return files.flatMap((f) => (f.isDirectory ? flattenVaultFiles(f.children ?? []) : [f]))
}

export function postprocessWikiLinks(html: string, files: VaultFile[]): string {
  const flatFiles = flattenVaultFiles(files)

  let processed = html.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (fullMatch, link, alias) => {
    const linkText = link.trim()

    if (linkText.endsWith('.excalidraw')) {
      const escapedLink = linkText.replace(/"/g, '&quot;')
      return `<div class="excalidraw-embed" data-link="${escapedLink}" style="border:1px solid var(--border-color);border-radius:8px;padding:16px;background:var(--bg-secondary);margin:16px 0;max-width:100%;height:320px;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;box-sizing:border-box">Loading drawing...</div>`
    }

    if (IMAGE_EXTS.test(linkText)) {
      const match = flatFiles.find(
        (f) =>
          f.name.toLowerCase() === linkText.toLowerCase() ||
          f.relativePath.toLowerCase() === linkText.toLowerCase()
      )
      const src = match ? `vault:///${match.relativePath}` : `vault:///${linkText}`
      const alt = (alias?.trim() ?? linkText).replace(/"/g, '&quot;')
      return `<img src="${src}" alt="${alt}" style="max-width:100%;height:auto;border-radius:4px;margin:8px 0" />`
    }

    // Note embed: find matching .md file
    const linkNoExt = linkText.replace(/\.md$/i, '')
    const mdMatch = flatFiles.find((f) => {
      if (f.isDirectory || !f.name.endsWith('.md')) return false
      const nameNoExt = f.name.replace(/\.md$/i, '')
      const relPathNoExt = f.relativePath.replace(/\.md$/i, '')
      return (
        nameNoExt.toLowerCase() === linkNoExt.toLowerCase() ||
        f.relativePath.toLowerCase() === linkText.toLowerCase() ||
        relPathNoExt.toLowerCase() === linkNoExt.toLowerCase()
      )
    })
    if (mdMatch) {
      const escapedPath = mdMatch.path.replace(/"/g, '&quot;')
      const displayName = linkNoExt.replace(/</g, '&lt;').replace(/>/g, '&gt;')
      return `<div class="note-embed" data-path="${escapedPath}" style="border:1px solid var(--border-color);border-radius:6px;padding:12px 16px;margin:12px 0;background:var(--bg-secondary)"><div class="note-embed-title" style="font-size:11px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;letter-spacing:0.04em">📄 ${displayName}</div><div class="note-embed-content" style="color:var(--text-primary);font-size:0.95em">Loading…</div></div>`
    }

    // If the link explicitly ends in .md but no matching file was found,
    // strip the leading "!" so the second pass converts [[...]] to a wiki-link span.
    // For all other unresolved embeds (e.g. ![[Unknown Note]]) pass through unchanged.
    if (/\.md$/i.test(linkText)) {
      return fullMatch.slice(1) // strip leading "!" → let second pass handle [[...]]
    }
    return fullMatch
  })

  return processed.replace(/(?<!!)(\[\[([^\]|]+)(?:\|([^\]]+))?\]\])/g, (_fullMatch, _bracket, link, alias) => {
    const label = (alias?.trim() ?? link.trim()).replace(/"/g, '&quot;')
    const linkAttr = link.trim().replace(/"/g, '&quot;')
    return `<span class="wiki-link" data-link="${linkAttr}" style="color:var(--accent-color);text-decoration:underline;cursor:pointer">${label}</span>`
  })
}

export function processHighlights(html: string): string {
  return html.replace(
    /(<(?:pre|code)[^>]*>[\s\S]*?<\/(?:pre|code)>)|==([^=\n]{1,300})==/gi,
    (fullMatch, codeBlock, highlight) => {
      if (codeBlock !== undefined) return fullMatch
      if (highlight !== undefined) {
        return `<mark style="background:rgba(255,220,0,0.25);border-radius:2px;padding:0 2px">${highlight}</mark>`
      }
      return fullMatch
    }
  )
}
