import type { VaultFile } from '@shared/types'
import type { GNode, GLink } from './graphTypes'
import { GROUP_COLORS } from './GraphSidebar'

/**
 * Maximum number of nodes to render in the graph for performance reasons.
 */
export const MAX_GRAPH_NODES = 400

export function flattenFiles(files: VaultFile[]): VaultFile[] {
  return files.flatMap((f) => (f.children ? [f, ...flattenFiles(f.children)] : [f]))
}

export function getNodeGroup(
  id: string,
  name: string,
  degree: number
): 'canvas' | 'project' | 'daily' | 'connected' | 'orphan' {
  if (id.endsWith('.canvas')) return 'canvas'
  if (name.match(/^\d{4}-\d{2}-\d{2}$/)) return 'daily'
  if (id.includes('/Projects/') || id.includes('\\Projects\\')) return 'project'
  return degree > 0 ? 'connected' : 'orphan'
}

export const nodeR = (d: GNode) => (d.degree > 0 ? 8 + Math.min(d.degree * 2, 12) : 6)
export const labelColor = (d: GNode) => (d.degree > 0 ? 'var(--text-primary)' : 'var(--text-secondary)')
export const nodeColor = (d: GNode) => GROUP_COLORS[getNodeGroup(d.id, d.name, d.degree)]

export interface BuildGraphDataOptions {
  disabledCategories: Set<string>
  strictFilter: boolean
  debouncedSearchQuery: string
  width: number
  height: number
}

export function buildGraphData(
  files: VaultFile[],
  outlinks: (file: string) => any,
  options: BuildGraphDataOptions
): { nodes: GNode[]; links: GLink[] } {
  const { disabledCategories, strictFilter, debouncedSearchQuery, width, height } = options

  // Phase 1: Filter base paths (daily, canvas, project, strict search)
  let filteredPaths = flattenFiles(files)
    .filter((f) => !f.isDirectory && (f.name.endsWith('.md') || f.name.endsWith('.canvas')))
    .map((f) => f.path)

  filteredPaths = filteredPaths.filter((path) => {
    const name = path.split('/').pop()?.replace(/\.(md|canvas)$/, '') ?? ''

    // Daily Notes filter
    const isDaily = !!name.match(/^\d{4}-\d{2}-\d{2}$/)
    if (isDaily && disabledCategories.has('daily')) return false

    // Canvases filter
    const isCanvas = path.endsWith('.canvas')
    if (isCanvas && disabledCategories.has('canvas')) return false

    // Projects folder filter
    const isProject = path.includes('/Projects/') || path.includes('\\Projects\\')
    if (isProject && disabledCategories.has('project')) return false

    // Strict search filter
    if (strictFilter && debouncedSearchQuery) {
      const q = debouncedSearchQuery.toLowerCase().trim()
      if (!name.toLowerCase().includes(q)) return false
    }

    return true
  })

  // Phase 2: Compute degrees & links on this subset
  const liveSet = new Set(filteredPaths)
  const degree: Record<string, number> = {}
  const edgeSet = new Set<string>()
  const links: GLink[] = []

  for (const file of filteredPaths) {
    for (const target of outlinks(file)) {
      if (!liveSet.has(target)) continue
      const key = [file, target].sort().join('|')
      if (edgeSet.has(key)) continue
      edgeSet.add(key)
      links.push({ source: file, target })
      degree[file] = (degree[file] ?? 0) + 1
      degree[target] = (degree[target] ?? 0) + 1
    }
  }

  // Phase 3: Filter based on orphan and connected states
  filteredPaths = filteredPaths.filter((path) => {
    const deg = degree[path] ?? 0
    const isOrphan = deg === 0

    if (isOrphan && disabledCategories.has('orphan')) return false
    if (!isOrphan && disabledCategories.has('connected')) return false

    return true
  })

  // Final dataset setup (limit to MAX_GRAPH_NODES for performance)
  const finalPathsSet = new Set(filteredPaths.slice(0, MAX_GRAPH_NODES))
  const finalPaths = filteredPaths.filter((p) => finalPathsSet.has(p))

  const finalLinks = links.filter(
    (l) => finalPathsSet.has(l.source as string) && finalPathsSet.has(l.target as string)
  )

  const finalDegree: Record<string, number> = {}
  finalLinks.forEach((l) => {
    const s = l.source as string
    const t = l.target as string
    finalDegree[s] = (finalDegree[s] ?? 0) + 1
    finalDegree[t] = (finalDegree[t] ?? 0) + 1
  })

  const nodes: GNode[] = finalPaths.map((f) => ({
    id: f,
    name: f.split('/').pop()?.replace(/\.(md|canvas)$/, '') ?? '',
    degree: finalDegree[f] ?? 0,
    x: width / 2 + (Math.random() - 0.5) * 100,
    y: height / 2 + (Math.random() - 0.5) * 100
  }))

  return { nodes, links: finalLinks }
}
