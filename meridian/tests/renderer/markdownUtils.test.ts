import type { VaultFile } from '../../src/shared/types'
import { postprocessWikiLinks } from '../../src/renderer/src/components/Editor/markdownUtils'

const makeVaultFile = (name: string, relativePath: string): VaultFile => ({
  name,
  path: `/vault/${relativePath}`,
  relativePath,
  isDirectory: false,
  mtime: 0,
  birthtime: 0
})

describe('postprocessWikiLinks note embeds', () => {
  it('creates note-embed div for ![[Note.md]] when file exists', () => {
    const html = '<p>![[My Note.md]]</p>'
    const files = [makeVaultFile('My Note.md', 'My Note.md')]
    const result = postprocessWikiLinks(html, files)
    expect(result).toContain('class="note-embed"')
    expect(result).toContain('data-path="/vault/My Note.md"')
    expect(result).not.toContain('![[')
  })

  it('creates note-embed div for ![[Note]] without extension', () => {
    const html = '<p>![[My Note]]</p>'
    const files = [makeVaultFile('My Note.md', 'notes/My Note.md')]
    const result = postprocessWikiLinks(html, files)
    expect(result).toContain('class="note-embed"')
    expect(result).toContain('data-path="/vault/notes/My Note.md"')
  })

  it('leaves ![[Unknown Note]] unchanged when file not found', () => {
    const html = '<p>![[Unknown Note]]</p>'
    const result = postprocessWikiLinks(html, [])
    expect(result).toBe('<p>![[Unknown Note]]</p>')
  })

  it('does not create note-embed for images', () => {
    const html = '<p>![[photo.png]]</p>'
    const files = [makeVaultFile('photo.png', 'assets/photo.png')]
    const result = postprocessWikiLinks(html, files)
    expect(result).toContain('<img')
    expect(result).not.toContain('note-embed')
  })
})

import { processHighlights } from '../../src/renderer/src/components/Editor/markdownUtils'

describe('processHighlights', () => {
  it('converts ==text== to <mark> tag with background style', () => {
    const result = processHighlights('<p>Hello ==world== here</p>')
    expect(result).toContain('<mark')
    expect(result).toContain('world')
    expect(result).toContain('background:')
    expect(result).not.toContain('==world==')
  })

  it('does not convert ==text== inside <code>', () => {
    const result = processHighlights('<p>See <code>==not highlighted==</code></p>')
    expect(result).toContain('==not highlighted==')
    expect(result).not.toContain('<mark')
  })

  it('does not convert ==text== inside <pre><code>', () => {
    const result = processHighlights('<pre><code>==not highlighted==</code></pre>')
    expect(result).toContain('==not highlighted==')
    expect(result).not.toContain('<mark')
  })

  it('handles multiple highlights in one paragraph', () => {
    const result = processHighlights('<p>==first== and ==second==</p>')
    const markCount = (result.match(/<mark/g) ?? []).length
    expect(markCount).toBe(2)
  })

  it('leaves text without == unchanged', () => {
    const result = processHighlights('<p>normal text</p>')
    expect(result).toBe('<p>normal text</p>')
  })

  it('does not convert single = signs', () => {
    const result = processHighlights('<p>a = b</p>')
    expect(result).not.toContain('<mark')
  })
})
