import { describe, expect, it } from 'vitest'
import {
  entryToMarkdown,
  expandSnippet,
  inboxEntry,
  looksLikeCode,
  looksLikeTable,
  noteTitleFor,
  tableToMarkdown
} from '../../src/shared/clipboardNote'

const now = new Date(2024, 4, 7, 9, 5)
const text = (t: string) => ({ kind: 'text' as const, text: t })

describe('entryToMarkdown', () => {
  it('turns a URL into an autolink', () => {
    expect(entryToMarkdown(text('https://example.com/a?b=1'))).toEqual({
      kind: 'link',
      markdown: '<https://example.com/a?b=1>'
    })
  })

  it('turns tab-separated rows into a markdown table and escapes pipes', () => {
    const block = entryToMarkdown(text('Name\tQty\nApple\t3\nA|B\t1'))
    expect(block.kind).toBe('table')
    expect(block.markdown).toBe('| Name | Qty |\n| --- | --- |\n| Apple | 3 |\n| A\\|B | 1 |')
  })

  it('fences code, using a longer fence if the code contains one', () => {
    const code = 'function a() {\n  return 1;\n}'
    expect(entryToMarkdown(text(code))).toEqual({
      kind: 'code',
      markdown: `\`\`\`\n${code}\n\`\`\``
    })
    const nested = 'const s = "```";\nfoo();\n'
    expect(entryToMarkdown(text(nested)).markdown.startsWith('````')).toBe(true)
  })

  it('leaves prose, short text and ragged tables alone', () => {
    expect(entryToMarkdown(text('Buy milk')).kind).toBe('text')
    expect(entryToMarkdown(text('First line.\nSecond line, still prose.')).kind).toBe('text')
    expect(looksLikeTable('a\tb\nc')).toBe(false)
    expect(looksLikeTable('single\tline')).toBe(false)
    expect(looksLikeCode('Dear John,\n\nSee you tomorrow; bring snacks.')).toBe(false)
  })

  it('renders images from a saved reference and files as a list', () => {
    expect(entryToMarkdown({ kind: 'image', text: '' }, 'assets/image-1.png').markdown).toBe(
      '![](assets/image-1.png)'
    )
    expect(entryToMarkdown({ kind: 'files', text: '/a/b.txt', files: ['/a/b.txt'] }).markdown).toBe(
      '- `/a/b.txt`'
    )
  })

  it('tableToMarkdown handles CRLF', () => {
    expect(tableToMarkdown('a\tb\r\n1\t2\r\n')).toContain('| 1 | 2 |')
  })
})

describe('inboxEntry', () => {
  it('formats single lines as a timestamped bullet', () => {
    expect(inboxEntry({ kind: 'text', markdown: 'idea' }, now)).toBe('- 09:05 idea')
  })

  it('puts multi-line blocks after the timestamp bullet', () => {
    expect(inboxEntry({ kind: 'code', markdown: '```\na\nb\n```' }, now)).toBe(
      '- 09:05 (clipboard)\n\n```\na\nb\n```'
    )
  })
})

describe('noteTitleFor', () => {
  it('uses the first line, stripped of unsafe characters', () => {
    expect(noteTitleFor(text('Meeting: Q2 plan?\nmore'), now)).toBe('Meeting Q2 plan')
    expect(noteTitleFor(text('https://example.com/page'), now)).toBe('example.com page')
  })

  it('falls back for empty, reserved or non-text entries', () => {
    expect(noteTitleFor(text('???'), now)).toBe('Clipboard 2024-05-07 0905')
    expect(noteTitleFor(text('CON'), now)).toBe('Clipboard 2024-05-07 0905')
    expect(noteTitleFor({ kind: 'image', text: '' }, now)).toBe('Clipboard 2024-05-07 0905')
  })

  it('limits the length', () => {
    expect(noteTitleFor(text('x'.repeat(200)), now).length).toBeLessThanOrEqual(50)
  })
})

describe('expandSnippet', () => {
  it('expands known placeholders and leaves unknown ones', () => {
    expect(
      expandSnippet('On {{date}} at {{ time }}: {{clipboard}} {{other}}', {
        now,
        clipboard: 'CLIP'
      })
    ).toBe('On 2024-05-07 at 09:05: CLIP {{other}}')
  })

  it('honors a custom date format', () => {
    expect(expandSnippet('{{date}}', { now, clipboard: '', dateFormat: 'DD.MM.YYYY' })).toBe(
      '07.05.2024'
    )
  })

  it('does not re-expand placeholders found inside the clipboard text', () => {
    expect(expandSnippet('{{clipboard}}', { now, clipboard: '{{date}}' })).toBe('{{date}}')
  })
})
