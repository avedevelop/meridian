import { createHash, randomUUID } from 'crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'fs'
import { appendFile, mkdir, readFile, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import MiniSearch from 'minisearch'
import type {
  ClipboardEntry,
  ClipboardEntryKind,
  ClipboardEntrySummary,
  ClipboardListQuery,
  ClipboardListResult
} from '../../shared/clipboard'
import { maskPreview } from './privacy'

type Op =
  | { op: 'put'; entry: ClipboardEntry }
  | { op: 'touch'; id: string; at: number }
  | { op: 'pin'; id: string; pinned: boolean }
  | { op: 'del'; id: string }

export interface NewEntry {
  kind: ClipboardEntryKind
  text: string
  html?: string
  image?: { png: Buffer; width: number; height: number }
  files?: string[]
  sensitive: boolean
}

const PREVIEW_CHARS = 300
const INDEX_CHARS = 2000
const URL_RE = /^(https?:\/\/|www\.)\S+$/i

export function hashContent(parts: Array<string | Buffer>): string {
  const h = createHash('sha256')
  for (const p of parts) {
    h.update(p)
    h.update('\0')
  }
  return h.digest('hex')
}

function summarize(e: ClipboardEntry): ClipboardEntrySummary {
  const raw =
    e.kind === 'image'
      ? `Image ${e.imageWidth ?? '?'}×${e.imageHeight ?? '?'}`
      : e.text.slice(0, PREVIEW_CHARS)
  return {
    id: e.id,
    kind: e.kind,
    preview: e.sensitive ? maskPreview(raw) : raw,
    length: e.text.length,
    createdAt: e.createdAt,
    lastUsedAt: e.lastUsedAt,
    pinned: e.pinned,
    sensitive: e.sensitive,
    imageWidth: e.imageWidth,
    imageHeight: e.imageHeight,
    fileCount: e.files?.length
  }
}

/**
 * Clipboard history on disk: an append-only JSONL journal compacted on load,
 * content-addressed image blobs, and an in-memory MiniSearch index over the text.
 * Pure Node (no native modules), so it behaves the same on macOS and Windows.
 */
export class ClipboardStore {
  private entries = new Map<string, ClipboardEntry>()
  private byHash = new Map<string, string>()
  private index = new MiniSearch<{ id: string; text: string }>({
    fields: ['text'],
    storeFields: [],
    searchOptions: { prefix: true, fuzzy: 0.15, combineWith: 'AND' }
  })
  private journalLines = 0
  private writeChain: Promise<void> = Promise.resolve()
  private readonly journalPath: string
  private readonly blobDir: string

  constructor(private readonly dir: string) {
    mkdirSync(join(dir, 'blobs'), { recursive: true })
    this.journalPath = join(dir, 'history.jsonl')
    this.blobDir = join(dir, 'blobs')
    this.load()
  }

  private load(): void {
    if (!existsSync(this.journalPath)) return
    const lines = readFileSync(this.journalPath, 'utf-8').split('\n')
    for (const line of lines) {
      if (!line) continue
      try {
        this.apply(JSON.parse(line) as Op)
        this.journalLines++
      } catch {
        // a torn last line after a crash: ignore it
      }
    }
    if (this.journalLines > this.entries.size * 2 + 100) this.compactSync()
  }

  private apply(op: Op): void {
    if (op.op === 'put') {
      this.entries.set(op.entry.id, op.entry)
      this.byHash.set(op.entry.hash, op.entry.id)
      this.indexEntry(op.entry)
    } else if (op.op === 'touch') {
      const e = this.entries.get(op.id)
      if (e) e.lastUsedAt = op.at
    } else if (op.op === 'pin') {
      const e = this.entries.get(op.id)
      if (e) e.pinned = op.pinned
    } else if (op.op === 'del') {
      this.removeFromMemory(op.id)
    }
  }

  private indexEntry(e: ClipboardEntry): void {
    if (this.index.has(e.id)) this.index.discard(e.id)
    if (e.sensitive || !e.text) return
    this.index.add({ id: e.id, text: e.text.slice(0, INDEX_CHARS) })
  }

  private removeFromMemory(id: string): ClipboardEntry | undefined {
    const e = this.entries.get(id)
    if (!e) return undefined
    this.entries.delete(id)
    if (this.byHash.get(e.hash) === id) this.byHash.delete(e.hash)
    if (this.index.has(id)) this.index.discard(id)
    return e
  }

  private compactSync(): void {
    const body = [...this.entries.values()].map((entry) => JSON.stringify({ op: 'put', entry }))
    const tmp = `${this.journalPath}.tmp`
    writeFileSync(tmp, body.length ? body.join('\n') + '\n' : '', 'utf-8')
    renameSync(tmp, this.journalPath)
    this.journalLines = this.entries.size
  }

  private write(op: Op): void {
    this.journalLines++
    const line = JSON.stringify(op) + '\n'
    this.writeChain = this.writeChain
      .then(() => appendFile(this.journalPath, line, 'utf-8'))
      .catch(() => undefined)
  }

  /** Resolves when all queued journal writes are on disk. */
  flush(): Promise<void> {
    return this.writeChain
  }

  size(): number {
    return this.entries.size
  }

  get(id: string): ClipboardEntry | undefined {
    return this.entries.get(id)
  }

  /** Add an entry, or bump an identical existing one to the top. Returns the stored entry. */
  add(input: NewEntry, now = Date.now()): ClipboardEntry {
    const hash = hashContent([
      input.kind,
      input.text,
      input.html ?? '',
      input.image?.png ?? '',
      (input.files ?? []).join('\n')
    ])
    const existingId = this.byHash.get(hash)
    if (existingId) {
      const existing = this.entries.get(existingId)!
      existing.lastUsedAt = now
      this.write({ op: 'touch', id: existingId, at: now })
      return existing
    }

    const entry: ClipboardEntry = {
      id: randomUUID(),
      kind: input.kind,
      hash,
      text: input.text,
      html: input.html,
      files: input.files,
      createdAt: now,
      lastUsedAt: now,
      pinned: false,
      sensitive: input.sensitive
    }
    if (input.image) {
      entry.imageHash = hashContent([input.image.png])
      entry.imageWidth = input.image.width
      entry.imageHeight = input.image.height
      const blob = join(this.blobDir, `${entry.imageHash}.png`)
      this.writeChain = this.writeChain
        .then(async () => {
          await mkdir(this.blobDir, { recursive: true })
          if (!existsSync(blob)) await writeFile(blob, input.image!.png)
        })
        .catch(() => undefined)
    }
    this.apply({ op: 'put', entry })
    this.write({ op: 'put', entry })
    return entry
  }

  /** Bump an entry to the top of the history. */
  touch(id: string, now = Date.now()): boolean {
    const e = this.entries.get(id)
    if (!e) return false
    e.lastUsedAt = now
    this.write({ op: 'touch', id, at: now })
    return true
  }

  setPinned(id: string, pinned: boolean): boolean {
    const e = this.entries.get(id)
    if (!e) return false
    e.pinned = pinned
    this.write({ op: 'pin', id, pinned })
    return true
  }

  delete(id: string): boolean {
    const e = this.removeFromMemory(id)
    if (!e) return false
    this.write({ op: 'del', id })
    this.collectBlob(e.imageHash)
    return true
  }

  /** Remove everything (including pinned) and delete all blobs from disk. */
  async clear(): Promise<void> {
    await this.flush()
    this.entries.clear()
    this.byHash.clear()
    this.index.removeAll()
    this.journalLines = 0
    await rm(this.journalPath, { force: true })
    await rm(this.blobDir, { recursive: true, force: true })
    await mkdir(this.blobDir, { recursive: true })
  }

  private collectBlob(imageHash: string | undefined): void {
    if (!imageHash) return
    for (const e of this.entries.values()) if (e.imageHash === imageHash) return
    this.writeChain = this.writeChain
      .then(() => rm(join(this.blobDir, `${imageHash}.png`), { force: true }))
      .catch(() => undefined)
  }

  /** Drop unpinned entries older than `maxAgeDays`, then keep at most `maxEntries` unpinned ones (oldest go first). */
  expire(opts: { maxAgeDays: number; maxEntries: number }, now = Date.now()): number {
    const cutoff = now - opts.maxAgeDays * 86_400_000
    const unpinned = [...this.entries.values()]
      .filter((e) => !e.pinned)
      .sort((a, b) => a.lastUsedAt - b.lastUsedAt)
    const victims = new Set(unpinned.filter((e) => e.lastUsedAt < cutoff).map((e) => e.id))
    let remaining = unpinned.length - victims.size // pinned entries do not count toward the cap
    for (const e of unpinned) {
      if (remaining <= opts.maxEntries) break
      if (!victims.has(e.id)) {
        victims.add(e.id)
        remaining--
      }
    }
    for (const id of victims) this.delete(id)
    return victims.size
  }

  async readImage(id: string): Promise<Buffer | null> {
    const e = this.entries.get(id)
    if (!e?.imageHash) return null
    await this.flush()
    try {
      return await readFile(join(this.blobDir, `${e.imageHash}.png`))
    } catch {
      return null
    }
  }

  list(q: ClipboardListQuery = {}): ClipboardListResult {
    const limit = Math.max(1, Math.min(q.limit ?? 50, 200))
    let items: ClipboardEntry[]
    const text = q.query?.trim()
    if (text) {
      const hits = this.index.search(text)
      items = hits
        .map((h) => this.entries.get(String(h.id)))
        .filter((e): e is ClipboardEntry => !!e)
    } else {
      items = [...this.entries.values()]
    }
    if (q.pinnedOnly) items = items.filter((e) => e.pinned)
    if (q.kind === 'link')
      items = items.filter((e) => e.kind !== 'image' && URL_RE.test(e.text.trim()))
    else if (q.kind === 'text') items = items.filter((e) => e.kind === 'text' || e.kind === 'html')
    else if (q.kind) items = items.filter((e) => e.kind === q.kind)
    if (!text) {
      items.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.lastUsedAt - a.lastUsedAt)
    }
    const offset = q.cursor ? Math.max(0, parseInt(q.cursor, 10) || 0) : 0
    const page = items.slice(offset, offset + limit)
    const next = offset + limit < items.length ? String(offset + limit) : null
    return { items: page.map(summarize), nextCursor: next, total: items.length }
  }

  /** Remove the data directory contents on disk synchronously (used by tests and uninstall paths). */
  destroySync(): void {
    rmSync(this.dir, { recursive: true, force: true })
  }
}
