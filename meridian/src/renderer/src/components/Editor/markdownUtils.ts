import type { VaultFile } from '@shared/types'

export const IMAGE_EXTS = /\.(png|jpg|jpeg|gif|webp|svg|bmp|tiff)$/i

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
