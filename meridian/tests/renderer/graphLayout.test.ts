import { describe, it, expect } from 'vitest'
import type { VaultFile } from '../../src/shared/types'
import { buildGraphData } from '../../src/renderer/src/components/Graph/graphLayout'

const makeFile = (name: string, mtime: number): VaultFile => ({
  name,
  path: `/vault/${name}`,
  relativePath: name,
  isDirectory: false,
  mtime,
  birthtime: 0
})

describe('buildGraphData truncation and capping', () => {
  it('truncates 500 files to 400 when maxNodes is 400', () => {
    const files: VaultFile[] = Array.from({ length: 500 }, (_, i) =>
      makeFile(`note-${i}.md`, 1000 + i)
    )
    const outlinks = () => []
    const options = {
      disabledCategories: new Set<string>(),
      strictFilter: false,
      debouncedSearchQuery: '',
      width: 800,
      height: 600,
      maxNodes: 400
    }

    const result = buildGraphData(files, outlinks, options)

    expect(result.truncated).toBe(true)
    expect(result.displayedCount).toBe(400)
    expect(result.totalEligible).toBe(500)
    expect(result.nodes.length).toBe(400)
  })

  it('keeps high-degree nodes when truncated', () => {
    // 5 files: A, B, C, D, E
    // A and B are connected (degree 1 each), C, D, E are orphans (degree 0)
    const files = [
      makeFile('A.md', 100),
      makeFile('B.md', 100),
      makeFile('C.md', 100),
      makeFile('D.md', 100),
      makeFile('E.md', 100)
    ]

    const outlinks = (path: string) => {
      if (path === '/vault/A.md') return ['/vault/B.md']
      if (path === '/vault/B.md') return ['/vault/A.md']
      return []
    }

    const options = {
      disabledCategories: new Set<string>(),
      strictFilter: false,
      debouncedSearchQuery: '',
      width: 800,
      height: 600,
      maxNodes: 2
    }

    const result = buildGraphData(files, outlinks, options)

    expect(result.truncated).toBe(true)
    expect(result.displayedCount).toBe(2)
    expect(result.totalEligible).toBe(5)

    const nodeNames = result.nodes.map((n) => n.name)
    expect(nodeNames).toContain('A')
    expect(nodeNames).toContain('B')
  })

  it('falls back to mtime when degrees are equal', () => {
    // 3 files, all degree 0: A (mtime 100), B (mtime 300), C (mtime 200)
    // If capped at 2, we expect B and C (most recent mtimes)
    const files = [makeFile('A.md', 100), makeFile('B.md', 300), makeFile('C.md', 200)]
    const outlinks = () => []
    const options = {
      disabledCategories: new Set<string>(),
      strictFilter: false,
      debouncedSearchQuery: '',
      width: 800,
      height: 600,
      maxNodes: 2
    }

    const result = buildGraphData(files, outlinks, options)

    expect(result.truncated).toBe(true)
    expect(result.displayedCount).toBe(2)
    expect(result.totalEligible).toBe(3)

    const nodeNames = result.nodes.map((n) => n.name)
    expect(nodeNames).toContain('B')
    expect(nodeNames).toContain('C')
    expect(nodeNames).not.toContain('A')
  })

  it('does not truncate when maxNodes is 0', () => {
    const files: VaultFile[] = Array.from({ length: 500 }, (_, i) =>
      makeFile(`note-${i}.md`, 1000 + i)
    )
    const outlinks = () => []
    const options = {
      disabledCategories: new Set<string>(),
      strictFilter: false,
      debouncedSearchQuery: '',
      width: 800,
      height: 600,
      maxNodes: 0
    }

    const result = buildGraphData(files, outlinks, options)

    expect(result.truncated).toBe(false)
    expect(result.displayedCount).toBe(500)
    expect(result.totalEligible).toBe(500)
    expect(result.nodes.length).toBe(500)
  })
})
