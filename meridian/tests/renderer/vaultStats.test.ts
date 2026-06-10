import { describe, expect, it } from 'vitest'
import { countWords, buildHeatmap, topLinked } from '../../src/renderer/src/lib/vaultStats'

// ──────────────────────────────────────────────
// countWords
// ──────────────────────────────────────────────
describe('countWords', () => {
  it('counts plain words', () => {
    expect(countWords('hello world foo')).toBe(3)
  })

  it('returns 0 for empty string', () => {
    expect(countWords('')).toBe(0)
  })

  it('strips fenced code blocks before counting', () => {
    const text = 'before\n```\nconst x = 1;\nlet y = 2;\n```\nafter'
    // "before" and "after" = 2 words; code content excluded
    expect(countWords(text)).toBe(2)
  })

  it('strips multiple code fences', () => {
    const text = 'one\n```js\nconsole.log("hello")\n```\ntwo\n```\nmore code\n```\nthree'
    expect(countWords(text)).toBe(3)
  })

  it('handles inline code by not treating it as a fence', () => {
    const text = 'word `inline` code word'
    // inline code is not stripped — 4 words
    expect(countWords(text)).toBe(4)
  })
})

// ──────────────────────────────────────────────
// buildHeatmap
// ──────────────────────────────────────────────
describe('buildHeatmap', () => {
  it('returns exactly 90 buckets by default', () => {
    const buckets = buildHeatmap([])
    expect(buckets).toHaveLength(90)
  })

  it('returns requested number of buckets', () => {
    const buckets = buildHeatmap([], 30)
    expect(buckets).toHaveLength(30)
  })

  it('last bucket date is today (YYYY-MM-DD)', () => {
    const buckets = buildHeatmap([])
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    expect(buckets[buckets.length - 1].date).toBe(todayStr)
  })

  it('first bucket date is 89 days before today for 90 buckets', () => {
    const buckets = buildHeatmap([], 90)
    const d = new Date()
    d.setDate(d.getDate() - 89)
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    expect(buckets[0].date).toBe(expected)
  })

  it('counts dates falling in today bucket', () => {
    const today = new Date()
    const buckets = buildHeatmap([today])
    expect(buckets[buckets.length - 1].count).toBe(1)
  })

  it('ignores dates before the window', () => {
    const old = new Date()
    old.setDate(old.getDate() - 100)
    const buckets = buildHeatmap([old])
    const total = buckets.reduce((s, b) => s + b.count, 0)
    expect(total).toBe(0)
  })

  it('counts multiple dates in a single bucket', () => {
    const d1 = new Date()
    const d2 = new Date()
    const buckets = buildHeatmap([d1, d2])
    expect(buckets[buckets.length - 1].count).toBe(2)
  })

  it('all buckets have count 0 when no dates provided', () => {
    const buckets = buildHeatmap([])
    expect(buckets.every((b) => b.count === 0)).toBe(true)
  })
})

// ──────────────────────────────────────────────
// topLinked
// ──────────────────────────────────────────────
describe('topLinked', () => {
  it('returns empty array for empty map', () => {
    expect(topLinked(new Map())).toEqual([])
  })

  it('returns top n by count (desc)', () => {
    const m = new Map([
      ['/a.md', 5],
      ['/b.md', 10],
      ['/c.md', 3]
    ])
    const result = topLinked(m, 2)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ path: '/b.md', count: 10 })
    expect(result[1]).toEqual({ path: '/a.md', count: 5 })
  })

  it('returns all items if n > map size', () => {
    const m = new Map([['/a.md', 1]])
    expect(topLinked(m, 5)).toHaveLength(1)
  })

  it('defaults n to 5', () => {
    const m = new Map<string, number>([
      ['/a.md', 6],
      ['/b.md', 5],
      ['/c.md', 4],
      ['/d.md', 3],
      ['/e.md', 2],
      ['/f.md', 1]
    ])
    expect(topLinked(m)).toHaveLength(5)
  })

  it('stable ordering: ties sorted by path', () => {
    const m = new Map([
      ['/b.md', 3],
      ['/a.md', 3]
    ])
    const result = topLinked(m, 5)
    // both have count=3; stable tie-break by path ascending
    expect(result[0].path).toBe('/a.md')
    expect(result[1].path).toBe('/b.md')
  })
})
