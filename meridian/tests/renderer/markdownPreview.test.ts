import { describe, it, expect } from 'vitest'

const IMAGE_EXTS = /\.(png|jpg|jpeg|gif|webp|svg|bmp|tiff)$/i

function postprocessWikiLinksTestable(html: string, files: Array<{name: string, relativePath: string}>): string {
  let processed = html.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, link, alias) => {
    const linkText = link.trim()
    if (linkText.endsWith('.excalidraw')) {
      const escapedLink = linkText.replace(/"/g, '&quot;')
      return `<div class="excalidraw-embed" data-link="${escapedLink}">Loading drawing...</div>`
    }
    if (IMAGE_EXTS.test(linkText)) {
      const match = files.find(f =>
        f.name.toLowerCase() === linkText.toLowerCase() ||
        f.relativePath.toLowerCase() === linkText.toLowerCase()
      )
      const src = match ? `vault:///${match.relativePath}` : `vault:///${linkText}`
      const alt = (alias?.trim() ?? linkText).replace(/"/g, '&quot;')
      return `<img src="${src}" alt="${alt}" style="max-width:100%;height:auto;border-radius:4px;margin:8px 0" />`
    }
    return _match
  })
  return processed.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, link, alias) => {
    const label = (alias?.trim() ?? link.trim()).replace(/"/g, '&quot;')
    const linkAttr = link.trim().replace(/"/g, '&quot;')
    return `<span class="wiki-link" data-link="${linkAttr}" style="color:var(--accent-color);text-decoration:underline;cursor:pointer">${label}</span>`
  })
}

describe('postprocessWikiLinks image embeds', () => {
  it('converts ![[image.png]] to img tag with vault:// src', () => {
    const html = '<p>![[photo.png]]</p>'
    const files = [{ name: 'photo.png', relativePath: 'assets/photo.png' }]
    const result = postprocessWikiLinksTestable(html, files)
    expect(result).toContain('<img src="vault:///assets/photo.png"')
    expect(result).toContain('alt="photo.png"')
  })

  it('uses vault:///filename when file not found in vault', () => {
    const html = '<p>![[unknown.jpg]]</p>'
    const result = postprocessWikiLinksTestable(html, [])
    expect(result).toContain('<img src="vault:///unknown.jpg"')
  })

  it('respects alias in ![[image.png|My Caption]]', () => {
    const html = '<p>![[photo.png|My Caption]]</p>'
    const files = [{ name: 'photo.png', relativePath: 'assets/photo.png' }]
    const result = postprocessWikiLinksTestable(html, files)
    expect(result).toContain('alt="My Caption"')
  })

  it('converts ![[drawing.excalidraw]] to excalidraw-embed div (not an img)', () => {
    const html = '<p>![[drawing.excalidraw]]</p>'
    const result = postprocessWikiLinksTestable(html, [])
    expect(result).toContain('class="excalidraw-embed"')
    expect(result).not.toContain('<img')
  })

  it('still converts [[wikilinks]] to spans', () => {
    const html = '<p>[[Note Name]]</p>'
    const result = postprocessWikiLinksTestable(html, [])
    expect(result).toContain('class="wiki-link"')
    expect(result).toContain('data-link="Note Name"')
  })
})
