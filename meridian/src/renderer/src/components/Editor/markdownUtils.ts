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
  return html.replace(
    /<blockquote>\s*<p>\[!([\w]+)\]([^<\n]*)(?:<br>)?([\s\S]*?)<\/p>([\s\S]*?)<\/blockquote>/gi,
    (_match, type, titleRest, firstParaRest, bodyRest) => {
      const typeKey = type.toLowerCase()
      const info = CALLOUT_TYPES[typeKey] ?? { icon: '📝', color: '#6b7280' }
      const displayTitle = titleRest.trim() || (typeKey.charAt(0).toUpperCase() + typeKey.slice(1))
      const body = (firstParaRest + bodyRest).trim()
      return `<div class="callout callout-${typeKey}" style="border-left:4px solid ${info.color};background:${info.color}22;border-radius:6px;padding:12px 16px;margin:12px 0"><div class="callout-title" style="display:flex;align-items:center;gap:6px;font-weight:600;margin-bottom:${body ? '8px' : '0'};color:${info.color}"><span>${info.icon}</span><span>${displayTitle}</span></div>${body ? `<div class="callout-content">${body}</div>` : ''}</div>`
    }
  )
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

    return fullMatch
  })

  return processed.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_fullMatch, link, alias) => {
    const label = (alias?.trim() ?? link.trim()).replace(/"/g, '&quot;')
    const linkAttr = link.trim().replace(/"/g, '&quot;')
    return `<span class="wiki-link" data-link="${linkAttr}" style="color:var(--accent-color);text-decoration:underline;cursor:pointer">${label}</span>`
  })
}
