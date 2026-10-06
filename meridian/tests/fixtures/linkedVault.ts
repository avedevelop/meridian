import type { VaultFile } from '../../src/shared/types'

/**
 * A connected note graph: every note links to one or two earlier ones, so there are hubs and chains.
 * With `folders`, notes are spread over those top-level folders; without, they sit in the vault root.
 */
export function linkedVault(
  count: number,
  folders: string[] = []
): { files: VaultFile[]; outlinks: (p: string) => string[] } {
  const rel = (i: number): string =>
    folders.length ? `${folders[i % folders.length]}/n${i}.md` : `n${i}.md`
  const path = (i: number): string => `/vault/${rel(i)}`
  let seed = 7
  const rand = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647
  const edges = new Map<string, string[]>()
  for (let i = 1; i < count; i++) {
    const targets = new Set([Math.floor(rand() * i)])
    if (rand() < 0.6) targets.add(Math.floor(rand() * i))
    edges.set(path(i), [...targets].map(path))
  }
  const files: VaultFile[] = Array.from({ length: count }, (_, i) => ({
    name: `n${i}.md`,
    path: path(i),
    relativePath: rel(i),
    isDirectory: false,
    mtime: i,
    birthtime: i
  }))
  return { files, outlinks: (p) => edges.get(p) ?? [] }
}
