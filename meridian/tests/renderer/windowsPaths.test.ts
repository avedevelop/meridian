import { describe, it, expect } from 'vitest'
import type { VaultFile } from '../../src/shared/types'
import { LinkIndex } from '../../src/renderer/src/lib/linkIndex'
import {
  buildGraphData,
  calculateGraphStats
} from '../../src/renderer/src/components/Graph/graphLayout'

const root = 'C:\\Users\\me\\Vault'
const win = (rel: string): string => `${root}\\${rel.replace(/\//g, '\\')}`

describe('LinkIndex with Windows paths', () => {
  it('resolves a bare [[Note]] link to a backslash path', () => {
    const idx = new LinkIndex()
    idx.update(win('A.md'), 'See [[B]].', root)
    idx.update(win('B.md'), '', root)
    expect(idx.getOutlinks(win('A.md'))).toEqual([win('B.md')])
    expect(idx.getBacklinks(win('B.md'))).toEqual([win('A.md')])
  })

  it('resolves links to notes in subfolders, bare and with folder', () => {
    const idx = new LinkIndex()
    idx.update(win('Projects/Idea.md'), '', root)
    idx.update(win('A.md'), '[[Idea]] and [[Projects/Idea]] and [[idea.md]]', root)
    expect(idx.getOutlinks(win('A.md'))).toEqual([
      win('Projects/Idea.md'),
      win('Projects/Idea.md'),
      win('Projects/Idea.md')
    ])
  })

  it('resolves canvas file nodes', () => {
    const idx = new LinkIndex()
    idx.update(win('Projects/Idea.md'), '', root)
    idx.update(
      win('Board.canvas'),
      JSON.stringify({ nodes: [{ type: 'file', file: 'Projects/Idea.md' }] }),
      root
    )
    expect(idx.getOutlinks(win('Board.canvas'))).toEqual([win('Projects/Idea.md')])
  })
})

describe('graph data with Windows paths', () => {
  const file = (rel: string): VaultFile => ({
    name: rel.split('/').pop()!,
    path: win(rel),
    relativePath: rel,
    isDirectory: false,
    mtime: 1,
    birthtime: 1
  })
  const files = [file('A.md'), file('Projects/Idea.md'), file('2024-05-01.md')]
  const outlinks = (p: string): string[] => (p === win('A.md') ? [win('Projects/Idea.md')] : [])
  const options = {
    disabledCategories: new Set<string>(),
    strictFilter: false,
    debouncedSearchQuery: '',
    width: 800,
    height: 600,
    maxNodes: 400
  }

  it('names nodes by file name, not by full path', () => {
    const { nodes } = buildGraphData(files, outlinks, options)
    expect(nodes.map((n) => n.name).sort()).toEqual(['2024-05-01', 'A', 'Idea'])
  })

  it('keeps links and applies the daily and project category filters', () => {
    const { links } = buildGraphData(files, outlinks, options)
    expect(links).toHaveLength(1)
    const noDaily = buildGraphData(files, outlinks, {
      ...options,
      disabledCategories: new Set(['daily'])
    })
    expect(noDaily.nodes.map((n) => n.name)).not.toContain('2024-05-01')
    const noProject = buildGraphData(files, outlinks, {
      ...options,
      disabledCategories: new Set(['project'])
    })
    expect(noProject.nodes.map((n) => n.name)).not.toContain('Idea')
  })

  it('strict search matches the file name', () => {
    const { nodes } = buildGraphData(files, outlinks, {
      ...options,
      strictFilter: true,
      debouncedSearchQuery: 'idea'
    })
    expect(nodes.map((n) => n.name)).toEqual(['Idea'])
  })

  it('computes hub names from file names', () => {
    const stats = calculateGraphStats(files, outlinks)
    expect(stats.hubs.map((h) => h.name).sort()).toEqual(['A', 'Idea'])
  })
})
