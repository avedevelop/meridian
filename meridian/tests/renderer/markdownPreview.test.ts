import { describe, it, expect } from 'vitest'
import { postprocessWikiLinks } from '../../src/renderer/src/components/Editor/markdownUtils'
import type { VaultFile } from '../../src/shared/types'

const makeFile = (name: string, relativePath: string): VaultFile => ({
  name,
  path: `/vault/${relativePath}`,
  relativePath,
  isDirectory: false,
  mtime: 0,
  birthtime: 0
})

describe('postprocessWikiLinks image embeds', () => {
  it('converts ![[image.png]] to img tag with vault:// src', () => {
    const html = '<p>![[photo.png]]</p>'
    const files = [makeFile('photo.png', 'assets/photo.png')]
    const result = postprocessWikiLinks(html, files)
    expect(result).toContain('<img src="vault:///assets/photo.png"')
    expect(result).toContain('alt="photo.png"')
  })

  it('uses vault:///filename when file not found in vault', () => {
    const html = '<p>![[unknown.jpg]]</p>'
    const result = postprocessWikiLinks(html, [])
    expect(result).toContain('<img src="vault:///unknown.jpg"')
  })

  it('respects alias in ![[image.png|My Caption]]', () => {
    const html = '<p>![[photo.png|My Caption]]</p>'
    const files = [makeFile('photo.png', 'assets/photo.png')]
    const result = postprocessWikiLinks(html, files)
    expect(result).toContain('alt="My Caption"')
  })

  it('converts ![[drawing.excalidraw]] to excalidraw-embed div, not img', () => {
    const html = '<p>![[drawing.excalidraw]]</p>'
    const result = postprocessWikiLinks(html, [])
    expect(result).toContain('class="excalidraw-embed"')
    expect(result).not.toContain('<img')
  })

  it('still converts [[wikilinks]] to spans', () => {
    const html = '<p>[[Note Name]]</p>'
    const result = postprocessWikiLinks(html, [])
    expect(result).toContain('class="wiki-link"')
    expect(result).toContain('data-link="Note Name"')
  })

  it('case-insensitive filename matching', () => {
    const html = '<p>![[Photo.PNG]]</p>'
    const files = [makeFile('photo.png', 'assets/photo.png')]
    const result = postprocessWikiLinks(html, files)
    expect(result).toContain('vault:///assets/photo.png')
  })

  it('passes through non-image, non-excalidraw file embeds as wiki-link spans', () => {
    const html = '<p>![[note.md]]</p>'
    const result = postprocessWikiLinks(html, [])
    // ![[note.md]] is not matched as an image or excalidraw, so the [[...]] portion
    // gets converted to a wiki-link span by the second pass; the leading ! stays
    expect(result).toContain('class="wiki-link"')
    expect(result).toContain('data-link="note.md"')
    expect(result).not.toContain('<img')
  })
})
