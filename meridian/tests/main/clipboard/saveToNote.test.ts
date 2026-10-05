// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import type { ClipboardEntry } from '../../../src/shared/clipboard'
import { safeFolder, saveEntryToNote } from '../../../src/main/clipboard/saveToNote'
import { isSafeSnippetName, listSnippets, readSnippet } from '../../../src/main/clipboard/snippets'

let vault: string
const now = new Date(2024, 4, 7, 9, 5)
beforeEach(() => {
  vault = mkdtempSync(join(tmpdir(), 'meridian-save-'))
})
afterEach(() => rmSync(vault, { recursive: true, force: true }))

const entry = (over: Partial<ClipboardEntry>): ClipboardEntry => ({
  id: 'e1',
  kind: 'text',
  hash: 'h',
  text: 'hello',
  createdAt: 1,
  lastUsedAt: 1,
  pinned: false,
  sensitive: false,
  ...over
})
const ctx = (extra = {}) => ({ vaultPath: vault, now, ...extra })
const read = (...p: string[]): string => readFileSync(join(vault, ...p), 'utf-8')

describe('saveEntryToNote', () => {
  it('appends to Inbox.md, creating it with a heading', async () => {
    const r = await saveEntryToNote(ctx(), entry({ text: 'buy milk' }), null, 'inbox')
    expect(r).toEqual({ ok: true, path: join(vault, 'Inbox.md') })
    expect(read('Inbox.md')).toBe('# Inbox\n\n- 09:05 buy milk\n')
    await saveEntryToNote(ctx(), entry({ text: 'second' }), null, 'inbox')
    expect(read('Inbox.md')).toBe('# Inbox\n\n- 09:05 buy milk\n- 09:05 second\n')
  })

  it('converts URLs, tables and code on the way in', async () => {
    await saveEntryToNote(ctx(), entry({ text: 'https://example.com' }), null, 'inbox')
    await saveEntryToNote(ctx(), entry({ text: 'a\tb\n1\t2' }), null, 'inbox')
    const inbox = read('Inbox.md')
    expect(inbox).toContain('- 09:05 <https://example.com>')
    expect(inbox).toContain('| a | b |\n| --- | --- |\n| 1 | 2 |')
  })

  it('writes to the daily note using the configured date format and appends on the next save', async () => {
    await saveEntryToNote(ctx({ dailyNoteDateFormat: 'DD.MM.YYYY' }), entry({}), null, 'daily')
    expect(read('Daily', '07.05.2024.md')).toBe('# 07.05.2024\n\n- 09:05 hello\n')
    await saveEntryToNote(
      ctx({ dailyNoteDateFormat: 'DD.MM.YYYY' }),
      entry({ text: 'more' }),
      null,
      'daily'
    )
    expect(read('Daily', '07.05.2024.md')).toBe('# 07.05.2024\n\n- 09:05 hello\n\n- 09:05 more\n')
  })

  it('creates a new note named after the first line and never overwrites', async () => {
    const e = entry({ text: 'Project: kickoff\nagenda items' })
    const a = await saveEntryToNote(ctx(), e, null, 'new')
    const b = await saveEntryToNote(ctx(), e, null, 'new')
    expect(a).toEqual({ ok: true, path: join(vault, 'Project kickoff.md') })
    expect(b).toEqual({ ok: true, path: join(vault, 'Project kickoff 2.md') })
    expect(read('Project kickoff.md')).toBe('# Project kickoff\n\nProject: kickoff\nagenda items\n')
  })

  it('saves images into the attachment folder and links them', async () => {
    const png = Buffer.from('png-bytes')
    const r = await saveEntryToNote(ctx(), entry({ kind: 'image', text: '' }), png, 'new')
    expect(r.ok).toBe(true)
    const images = readdirSync(join(vault, 'assets'))
    expect(images).toHaveLength(1)
    expect(readFileSync(join(vault, 'assets', images[0])).equals(png)).toBe(true)
    const note = readdirSync(vault).find((f) => f.endsWith('.md'))!
    expect(read(note)).toContain(`![](assets/${images[0]})`)
  })

  it('refuses an image entry whose blob is missing', async () => {
    expect(await saveEntryToNote(ctx(), entry({ kind: 'image', text: '' }), null, 'inbox')).toEqual(
      {
        ok: false,
        error: 'not-found'
      }
    )
  })

  it('never writes outside the vault, whatever the attachment folder says', async () => {
    expect(safeFolder('../../etc', 'assets')).toBe('assets')
    expect(safeFolder('/abs', 'assets')).toBe('abs')
    expect(safeFolder('C:\\Windows', 'assets')).toBe('assets')
    expect(safeFolder('a/../b', 'assets')).toBe('assets')
    expect(safeFolder('  media/pics  ', 'assets')).toBe('media/pics')
    await saveEntryToNote(
      ctx({ attachmentFolder: '../../escape' }),
      entry({ kind: 'image', text: '' }),
      Buffer.from('x'),
      'inbox'
    )
    expect(existsSync(join(vault, 'assets'))).toBe(true)
    expect(existsSync(join(vault, '..', '..', 'escape'))).toBe(false)
  })

  it('reports failure instead of throwing', async () => {
    const r = await saveEntryToNote(
      { vaultPath: join(vault, 'missing', '\0bad'), now },
      entry({}),
      null,
      'inbox'
    )
    expect(r).toEqual({ ok: false, error: 'failed' })
  })
})

describe('snippets', () => {
  const put = (name: string, content: string): void => {
    mkdirSync(join(vault, '_snippets'), { recursive: true })
    writeFileSync(join(vault, '_snippets', name), content)
  }

  it('lists snippet notes with a preview, sorted by name', async () => {
    put('Signature.md', '# Best regards\n\nVlad')
    put('Address.md', '---\ntags: x\n---\n12 Main St')
    put('notes.txt', 'ignored')
    expect(await listSnippets(vault)).toEqual([
      { name: 'Address', preview: '12 Main St' },
      { name: 'Signature', preview: 'Best regards' }
    ])
  })

  it('returns no snippets when the folder does not exist', async () => {
    expect(await listSnippets(vault)).toEqual([])
  })

  it('reads a snippet without frontmatter', async () => {
    put('Address.md', '---\ntags: x\n---\n12 Main St\n')
    expect(await readSnippet(vault, 'Address')).toBe('12 Main St')
  })

  it('rejects names that could escape the folder', async () => {
    writeFileSync(join(vault, 'secret.md'), 'top secret')
    for (const bad of ['../secret', '..\\secret', 'a/b', '.hidden', '', '..']) {
      expect(isSafeSnippetName(bad)).toBe(false)
      expect(await readSnippet(vault, bad)).toBeNull()
    }
  })
})
