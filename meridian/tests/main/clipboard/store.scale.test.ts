// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { ClipboardStore } from '../../../src/main/clipboard/store'

const WORDS =
  'alpha beta gamma delta epsilon project meeting invoice draft notes report budget plan'.split(' ')

describe('ClipboardStore at 50k entries', () => {
  it('inserts, searches and reloads within generous bounds', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'meridian-clip-scale-'))
    try {
      const N = 50_000
      const store = new ClipboardStore(dir)
      const t0 = performance.now()
      for (let i = 0; i < N; i++) {
        const text = `${WORDS[i % WORDS.length]} ${WORDS[(i * 7) % WORDS.length]} entry ${i} ${'lorem ipsum '.repeat(8)}`
        store.add({ kind: 'text', text, sensitive: false }, i)
      }
      await store.flush()
      const insertMs = performance.now() - t0

      const times: number[] = []
      for (let i = 0; i < 40; i++) {
        const t = performance.now()
        store.list({ query: WORDS[i % WORDS.length], limit: 50 })
        times.push(performance.now() - t)
      }
      times.sort((a, b) => a - b)
      const p95 = times[Math.floor(times.length * 0.95)]

      const tl = performance.now()
      const reopened = new ClipboardStore(dir)
      const loadMs = performance.now() - tl

      console.log(
        `[clipboard 50k] insert ${insertMs.toFixed(0)} ms, search p95 ${p95.toFixed(1)} ms, reload ${loadMs.toFixed(0)} ms, heap ${(process.memoryUsage().heapUsed / 1e6).toFixed(0)} MB`
      )
      expect(reopened.size()).toBe(N)
      expect(insertMs).toBeLessThan(60_000)
      expect(p95).toBeLessThan(500)
      expect(loadMs).toBeLessThan(30_000)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }, 180_000)
})
