import { describe, expect, it } from 'vitest'
import { LinkIndex } from '../../src/renderer/src/lib/linkIndex'
import { ReferenceLinkIndex } from '../fixtures/referenceLinkIndex'

function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

const NAMES = ['Alpha', 'beta', 'Gamma Note', 'delta', 'Épsilon', 'Zeta', 'eta', 'Theta']
const FOLDERS = ['', 'Projects/', 'People/', 'Projects/Deep/']

interface Op {
  kind: 'update' | 'remove'
  path: string
  content: string
}

function randomOps(seed: number, windows: boolean): { ops: Op[]; paths: string[] } {
  const rand = rng(seed)
  const pick = <T>(xs: T[]): T => xs[Math.floor(rand() * xs.length)]
  const root = windows ? 'C:\\Vault\\' : '/vault/'
  const sep = (p: string): string => (windows ? p.replace(/\//g, '\\') : p)
  const paths: string[] = []
  for (let i = 0; i < 14; i++) {
    const ext = rand() < 0.12 ? '.canvas' : '.md'
    // Same names in different folders on purpose: resolution order matters
    paths.push(root + sep(pick(FOLDERS) + pick(NAMES) + ext))
  }
  const unique = [...new Set(paths)]

  const linkText = (): string => {
    const base = pick(NAMES)
    const r = rand()
    if (r < 0.4) return base
    if (r < 0.55) return base.toUpperCase()
    if (r < 0.7) return `${base}.md`
    if (r < 0.85) return pick(FOLDERS).slice(0, -1) ? `${pick(FOLDERS)}${base}` : base
    if (r < 0.92) return `${pick(FOLDERS).replace(/\//g, '\\')}${base}`
    return `Missing ${Math.floor(rand() * 3)}`
  }
  const contentFor = (path: string): string => {
    if (path.endsWith('.canvas')) {
      const nodes = Array.from({ length: Math.floor(rand() * 3) }, () =>
        rand() < 0.6
          ? { type: 'file', file: `${pick(FOLDERS)}${pick(NAMES)}.md` }
          : { type: 'text', text: `[[${linkText()}]]` }
      )
      return JSON.stringify({ nodes })
    }
    const links = Array.from({ length: Math.floor(rand() * 5) }, () => `[[${linkText()}]]`)
    const relation = rand() < 0.3 ? `---\nrelated: ["[[${linkText()}]]", ${linkText()}]\n---\n` : ''
    return `${relation}${links.join(' ')} #t${Math.floor(rand() * 3)}`
  }

  const ops: Op[] = []
  for (let i = 0; i < 40; i++) {
    const path = pick(unique)
    ops.push(
      rand() < 0.15
        ? { kind: 'remove', path, content: '' }
        : { kind: 'update', path, content: contentFor(path) }
    )
  }
  return { ops, paths: unique }
}

function snapshot(
  idx: LinkIndex | ReferenceLinkIndex,
  paths: string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const p of paths) {
    out[p] = {
      out: idx.getOutlinks(p),
      back: idx.getBacklinks(p),
      rel: idx.getRelations(p),
      unresolved: idx.getUnresolvedRelations(p),
      tags: idx.getTags(p)
    }
  }
  out.all = [...idx.getAllFiles()].sort()
  out.allTags = [...idx.getAllTags().entries()].sort()
  return out
}

describe('LinkIndex matches the original implementation', () => {
  for (const windows of [false, true]) {
    for (let seed = 1; seed <= 60; seed++) {
      it(`random operations (seed ${seed}, ${windows ? 'windows' : 'posix'} paths)`, () => {
        const { ops, paths } = randomOps(seed, windows)
        const fast = new LinkIndex()
        const ref = new ReferenceLinkIndex()
        const root = windows ? 'C:\\Vault' : '/vault'
        ops.forEach((op, i) => {
          if (op.kind === 'update') {
            fast.update(op.path, op.content, root)
            ref.update(op.path, op.content, root)
          } else {
            fast.remove(op.path, root)
            ref.remove(op.path, root)
          }
          // Reads in the middle exercise lazy resolution
          if (i % 7 === 0) expect(snapshot(fast, paths)).toEqual(snapshot(ref, paths))
        })
        expect(snapshot(fast, paths)).toEqual(snapshot(ref, paths))
      })
    }
  }

  it('batch updates give the same result as one-by-one updates', () => {
    const { ops, paths } = randomOps(99, false)
    const one = new LinkIndex()
    const batch = new LinkIndex()
    const updates = ops.filter((o) => o.kind === 'update')
    for (const o of updates) one.update(o.path, o.content, '/vault')
    batch.updateMany(
      updates.map((o) => ({ path: o.path, content: o.content })),
      '/vault'
    )
    expect(snapshot(batch, paths)).toEqual(snapshot(one, paths))
  })
})
