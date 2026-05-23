import type { VaultFile } from '../../src/shared/types'

/**
 * Synthetic vault fixtures for graph perf / truncation tests.
 *
 * These DO NOT touch real filesystem state — they only build the
 * VaultFile shape that buildGraphData consumes. The companion outlinks
 * function returns deterministic edge lists based on the file index.
 *
 * Used to validate:
 *   - graphMaxNodes 400 default keeps the graph at the documented limit
 *   - graphMaxNodes 800 doubles the budget without throwing
 *   - graphMaxNodes 0 ("all nodes") renders every file (slow path)
 *   - high-degree hubs survive truncation regardless of mtime ordering
 */

export interface SyntheticVaultOptions {
  /** Number of plain notes in the vault. */
  fileCount: number
  /** Number of hub notes whose degree should exceed the cap fallback. */
  hubCount?: number
  /** Outgoing edges per hub (linking forward through the file list). */
  hubFanOut?: number
  /** Optional path prefix; defaults to /vault. */
  pathPrefix?: string
}

export interface SyntheticVault {
  files: VaultFile[]
  outlinks: (path: string) => string[]
}

function makeFile(path: string, name: string, mtime: number): VaultFile {
  return {
    name,
    path,
    relativePath: name,
    isDirectory: false,
    mtime,
    birthtime: mtime
  }
}

/**
 * Build a synthetic vault of `fileCount` markdown notes plus optional hubs.
 *
 * Hub notes have ids `hub-{i}.md` and link forward to the next `hubFanOut`
 * non-hub notes. All other notes are orphans with monotonically increasing
 * mtime so degree ties resolve to the most recently modified files.
 */
export function buildSyntheticVault(options: SyntheticVaultOptions): SyntheticVault {
  const {
    fileCount,
    hubCount = 0,
    hubFanOut = 0,
    pathPrefix = '/vault'
  } = options

  const files: VaultFile[] = []
  for (let i = 0; i < fileCount; i++) {
    const name = `note-${i.toString().padStart(5, '0')}.md`
    files.push(makeFile(`${pathPrefix}/${name}`, name, 1000 + i))
  }

  const hubPaths: string[] = []
  for (let h = 0; h < hubCount; h++) {
    const name = `hub-${h.toString().padStart(3, '0')}.md`
    const path = `${pathPrefix}/${name}`
    hubPaths.push(path)
    files.push(makeFile(path, name, 500 + h)) // older mtime so they don't win on recency
  }

  const outlinkMap = new Map<string, string[]>()
  for (let h = 0; h < hubCount; h++) {
    const targets: string[] = []
    for (let k = 0; k < hubFanOut && k < fileCount; k++) {
      const targetIndex = (h + k) % fileCount
      const targetName = `note-${targetIndex.toString().padStart(5, '0')}.md`
      targets.push(`${pathPrefix}/${targetName}`)
    }
    outlinkMap.set(hubPaths[h], targets)
  }

  return {
    files,
    outlinks: (path: string) => outlinkMap.get(path) ?? []
  }
}

export function getHubPaths(vault: SyntheticVault, hubCount: number, pathPrefix = '/vault'): string[] {
  const out: string[] = []
  for (let h = 0; h < hubCount; h++) {
    out.push(`${pathPrefix}/hub-${h.toString().padStart(3, '0')}.md`)
  }
  return out
}
