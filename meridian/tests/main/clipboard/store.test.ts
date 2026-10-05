// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  appendFileSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { ClipboardStore } from '../../../src/main/clipboard/store'

let dir: string
const stores: ClipboardStore[] = []
const open = (): ClipboardStore => {
  const s = new ClipboardStore(dir)
  stores.push(s)
  return s
}
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'meridian-clip-'))
})
afterEach(async () => {
  await Promise.all(stores.splice(0).map((s) => s.flush()))
  rmSync(dir, { recursive: true, force: true })
})

const text = (t: string, sensitive = false) => ({ kind: 'text' as const, text: t, sensitive })

describe('ClipboardStore', () => {
  it('adds entries and lists newest first', () => {
    const s = open()
    s.add(text('first'), 1000)
    s.add(text('second'), 2000)
    expect(s.list().items.map((i) => i.preview)).toEqual(['second', 'first'])
  })

  it('de-duplicates identical content and bumps it to the top', () => {
    const s = open()
    s.add(text('a'), 1000)
    s.add(text('b'), 2000)
    s.add(text('a'), 3000)
    expect(s.size()).toBe(2)
    expect(s.list().items.map((i) => i.preview)).toEqual(['a', 'b'])
  })

  it('persists across restarts, including pins, touches and deletes', async () => {
    const s = open()
    const a = s.add(text('alpha'), 1000)
    const b = s.add(text('beta'), 2000)
    s.add(text('gamma'), 3000)
    s.setPinned(a.id, true)
    s.delete(b.id)
    await s.flush()

    const again = open()
    expect(again.size()).toBe(2)
    expect(again.list().items.map((i) => [i.preview, i.pinned])).toEqual([
      ['alpha', true],
      ['gamma', false]
    ])
  })

  it('ignores a torn last journal line after a crash', async () => {
    const s = open()
    s.add(text('kept'), 1000)
    await s.flush()
    appendFileSync(join(dir, 'history.jsonl'), '{"op":"put","entry":{"id":"x"')
    expect(open().size()).toBe(1)
  })

  it('searches by text with prefix matching and never indexes sensitive entries', () => {
    const s = open()
    s.add(text('meeting notes for project apollo'), 1)
    s.add(text('grocery list'), 2)
    s.add(text('apollo secret token', true), 3)
    expect(s.list({ query: 'apol' }).items.map((i) => i.preview)).toEqual([
      'meeting notes for project apollo'
    ])
    expect(s.list({ query: 'grocery' }).total).toBe(1)
  })

  it('masks previews of sensitive entries', () => {
    const s = open()
    s.add(text('hunter2hunter2', true), 1)
    const [item] = s.list().items
    expect(item.preview).not.toContain('hunter')
    expect(item.sensitive).toBe(true)
  })

  it('filters by kind, links and pinned, and paginates', () => {
    const s = open()
    for (let i = 0; i < 5; i++) s.add(text(`note ${i}`), i)
    const link = s.add(text('https://example.com/page'), 10)
    s.setPinned(link.id, true)
    expect(s.list({ kind: 'link' }).items.map((i) => i.preview)).toEqual([
      'https://example.com/page'
    ])
    expect(s.list({ pinnedOnly: true }).total).toBe(1)
    const p1 = s.list({ limit: 2 })
    expect(p1.items).toHaveLength(2)
    expect(p1.nextCursor).toBe('2')
    const p3 = s.list({ limit: 2, cursor: '4' })
    expect(p3.items).toHaveLength(2)
    expect(p3.nextCursor).toBeNull()
  })

  it('expires by age and by count but never touches pinned entries', () => {
    const s = open()
    const day = 86_400_000
    const old = s.add(text('old pinned'), 0)
    s.setPinned(old.id, true)
    s.add(text('old'), 1)
    for (let i = 0; i < 5; i++) s.add(text(`recent ${i}`), 40 * day + i)
    const removed = s.expire({ maxAgeDays: 30, maxEntries: 3 }, 41 * day)
    const left = s.list().items.map((i) => i.preview)
    expect(removed).toBe(3)
    expect(left).toContain('old pinned')
    expect(left).not.toContain('old')
    expect(left.filter((p) => p.startsWith('recent'))).toHaveLength(3)
  })

  it('stores images as content-addressed blobs and deletes them when unused', async () => {
    const s = open()
    const png = Buffer.from('fake-png-bytes')
    const e = s.add({
      kind: 'image',
      text: '',
      image: { png, width: 2, height: 3 },
      sensitive: false
    })
    await s.flush()
    expect(readdirSync(join(dir, 'blobs'))).toEqual([`${e.imageHash}.png`])
    expect((await s.readImage(e.id))?.equals(png)).toBe(true)
    s.delete(e.id)
    await s.flush()
    expect(readdirSync(join(dir, 'blobs'))).toEqual([])
  })

  it('clear removes the journal and every blob from disk', async () => {
    const s = open()
    s.add({
      kind: 'image',
      text: '',
      image: { png: Buffer.from('x'), width: 1, height: 1 },
      sensitive: false
    })
    s.add(text('pinned too'))
    s.setPinned(s.list().items[0].id, true)
    await s.clear()
    expect(s.size()).toBe(0)
    expect(existsSync(join(dir, 'history.jsonl'))).toBe(false)
    expect(readdirSync(join(dir, 'blobs'))).toEqual([])
    expect(open().size()).toBe(0)
  })

  it('compacts a bloated journal on load', async () => {
    const s = open()
    const e = s.add(text('hot'), 1)
    for (let i = 0; i < 400; i++) s.touch(e.id, i)
    await s.flush()
    const lines = (): number =>
      readFileSync(join(dir, 'history.jsonl'), 'utf-8').trim().split('\n').length
    expect(lines()).toBeGreaterThan(300)
    open()
    expect(lines()).toBe(1)
    writeFileSync(join(dir, 'unused'), '')
  })
})
