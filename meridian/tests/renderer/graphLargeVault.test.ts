import { describe, it, expect } from 'vitest'
import { buildGraphData } from '../../src/renderer/src/components/Graph/graphLayout'
import { buildSyntheticVault, getHubPaths } from '../fixtures/largeVault'

const baseOptions = {
  disabledCategories: new Set<string>(),
  strictFilter: false,
  debouncedSearchQuery: '',
  width: 800,
  height: 600
}

describe('graphLayout — large synthetic vaults', () => {
  it('caps a 1500-note vault at the 400-node default', () => {
    const { files, outlinks } = buildSyntheticVault({ fileCount: 1500 })
    const result = buildGraphData(files, outlinks, { ...baseOptions, maxNodes: 400 })

    expect(result.totalEligible).toBe(1500)
    expect(result.displayedCount).toBe(400)
    expect(result.truncated).toBe(true)
    expect(result.maxNodes).toBe(400)
  })

  it('doubles the budget when graphMaxNodes=800', () => {
    const { files, outlinks } = buildSyntheticVault({ fileCount: 1500 })
    const result = buildGraphData(files, outlinks, { ...baseOptions, maxNodes: 800 })

    expect(result.displayedCount).toBe(800)
    expect(result.truncated).toBe(true)
  })

  it('renders every node when graphMaxNodes=0 (slow path)', () => {
    const { files, outlinks } = buildSyntheticVault({ fileCount: 1500 })
    const result = buildGraphData(files, outlinks, { ...baseOptions, maxNodes: 0 })

    expect(result.displayedCount).toBe(1500)
    expect(result.truncated).toBe(false)
  })

  it('preserves hubs when truncating', () => {
    // 1200 plain notes + 5 hubs each linking to 30 forward notes.
    // Hubs have older mtime than plain notes; degree must outrank mtime.
    const vault = buildSyntheticVault({
      fileCount: 1200,
      hubCount: 5,
      hubFanOut: 30
    })
    const result = buildGraphData(vault.files, vault.outlinks, {
      ...baseOptions,
      maxNodes: 100
    })

    expect(result.displayedCount).toBe(100)
    const displayedIds = new Set(result.nodes.map((n) => n.id))
    for (const hub of getHubPaths(vault, 5)) {
      expect(displayedIds.has(hub)).toBe(true)
    }
  })

  it('returns matching hidden count for the banner', () => {
    const { files, outlinks } = buildSyntheticVault({ fileCount: 600 })
    const result = buildGraphData(files, outlinks, { ...baseOptions, maxNodes: 400 })

    const hidden = result.totalEligible - result.displayedCount
    expect(hidden).toBe(200)
    expect(result.totalEligible).toBe(600)
    expect(result.displayedCount).toBe(400)
  })
})
