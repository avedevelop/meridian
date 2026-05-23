import { CanvasNodeData, CanvasData } from './canvasTypes'

export const BG = '#161616'
export const NODE_FILL = '#1e1e2e'
export const NODE_STROKE = '#3a3a5a'
export const NODE_SELECTED_STROKE = '#7c6af7'
export const EDGE_COLOR = '#7c6af7'
export const DOT_COLOR = '#2a2a2a'
export const DOT_SPACING = 30
export const DOT_RADIUS = 1
export const SCALE_BY = 1.05
export const MIN_SCALE = 0.1
export const MAX_SCALE = 5
export const SAVE_DEBOUNCE_MS = 500
export const DEFAULT_NODE_W = 200
export const DEFAULT_NODE_H = 80
export const FONT_FAMILY = 'Inter, -apple-system, sans-serif'

export function parseCanvasData(raw: string): CanvasData {
  try {
    const parsed = JSON.parse(raw) as Partial<CanvasData>
    return {
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
      edges: Array.isArray(parsed.edges) ? parsed.edges : []
    }
  } catch {
    return { nodes: [], edges: [] }
  }
}

export function nodeCenter(n: CanvasNodeData): { x: number; y: number } {
  return { x: n.x + n.width / 2, y: n.y + n.height / 2 }
}

export function getContrastColor(hexColor: string | undefined): string {
  if (!hexColor) return '#ccc' // default text color for dark node
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 128 ? '#111' : '#ccc'
}

export function isUrl(str: string): boolean {
  try {
    const trimmed = str.trim()
    const url = new URL(trimmed)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function getEdgePoints(
  from: CanvasNodeData,
  to: CanvasNodeData,
  style: 'straight' | 'curved' | 'orthogonal'
): { points: number[]; bezier?: boolean } {
  const fc = { x: from.x + from.width / 2, y: from.y + from.height / 2 }
  const tc = { x: to.x + to.width / 2, y: to.y + to.height / 2 }

  let p1 = { x: fc.x, y: fc.y }
  let p2 = { x: tc.x, y: tc.y }

  const dx = tc.x - fc.x
  const dy = tc.y - fc.y

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) {
      p1 = { x: from.x + from.width, y: fc.y }
      p2 = { x: to.x, y: tc.y }
    } else {
      p1 = { x: from.x, y: fc.y }
      p2 = { x: to.x + to.width, y: tc.y }
    }
  } else {
    if (dy > 0) {
      p1 = { x: fc.x, y: from.y + from.height }
      p2 = { x: tc.x, y: to.y }
    } else {
      p1 = { x: fc.x, y: from.y }
      p2 = { x: tc.x, y: to.y + to.height }
    }
  }

  if (style === 'curved') {
    const dist = Math.sqrt(dx * dx + dy * dy)
    const offset = Math.min(100, dist * 0.4)
    let cp1x = p1.x
    let cp1y = p1.y
    let cp2x = p2.x
    let cp2y = p2.y

    if (Math.abs(dx) > Math.abs(dy)) {
      cp1x += dx > 0 ? offset : -offset
      cp2x += dx > 0 ? -offset : offset
    } else {
      cp1y += dy > 0 ? offset : -offset
      cp2y += dy > 0 ? -offset : offset
    }

    return {
      points: [p1.x, p1.y, cp1x, cp1y, cp2x, cp2y, p2.x, p2.y],
      bezier: true
    }
  } else if (style === 'orthogonal') {
    if (Math.abs(dx) > Math.abs(dy)) {
      const midX = p1.x + dx / 2
      return { points: [p1.x, p1.y, midX, p1.y, midX, p2.y, p2.x, p2.y] }
    } else {
      const midY = p1.y + dy / 2
      return { points: [p1.x, p1.y, p1.x, midY, p2.x, midY, p2.x, p2.y] }
    }
  }

  return { points: [p1.x, p1.y, p2.x, p2.y] }
}

export function computeMindMapLayout(
  canvasData: CanvasData
): Map<string, { x: number; y: number }> {
  const { nodes, edges } = canvasData
  const positions = new Map<string, { x: number; y: number }>()
  if (nodes.length === 0) return positions

  // Build adjacency list (directed: fromNode → toNode)
  const children = new Map<string, string[]>()
  const hasParent = new Set<string>()
  nodes.forEach((n) => children.set(n.id, []))
  edges.forEach((e) => {
    children.get(e.fromNode)?.push(e.toNode)
    hasParent.add(e.toNode)
  })

  // Find roots (nodes with no incoming edges)
  const roots = nodes.filter((n) => !hasParent.has(n.id)).map((n) => n.id)
  if (roots.length === 0) roots.push(nodes[0].id) // fallback: first node

  const H_GAP = 80 // horizontal gap between nodes
  const V_GAP = 60 // vertical gap between rows

  // Compute subtree height (in rows) for a node, preventing infinite loops
  const heightCache = new Map<string, number>()
  function subtreeHeight(id: string, pathStack: Set<string> = new Set()): number {
    if (pathStack.has(id)) return 1 // break cycle
    if (heightCache.has(id)) return heightCache.get(id)!

    const kids = children.get(id) ?? []
    if (kids.length === 0) return 1

    pathStack.add(id)
    let sum = 0
    for (const kid of kids) {
      sum += subtreeHeight(kid, pathStack)
    }
    pathStack.delete(id)

    const height = sum || 1
    heightCache.set(id, height)
    return height
  }

  // Place a subtree rooted at `id`, top-left corner at (x, startY)
  // Returns the total height consumed
  const placed = new Set<string>()
  function place(
    id: string,
    x: number,
    startY: number,
    pathStack: Set<string> = new Set()
  ): number {
    if (placed.has(id) || pathStack.has(id)) return 0
    placed.add(id)
    pathStack.add(id)

    const node = nodes.find((n) => n.id === id)
    if (!node) {
      pathStack.delete(id)
      return 0
    }

    const kids = children.get(id) ?? []
    const totalRows = Math.max(1, subtreeHeight(id))
    const totalH = totalRows * (node.height + V_GAP) - V_GAP
    const cy = startY + totalH / 2 - node.height / 2

    positions.set(id, { x, y: cy })

    let cursor = startY
    kids.forEach((kid) => {
      const kidNode = nodes.find((n) => n.id === kid)
      if (!kidNode) return
      const h = subtreeHeight(kid)
      place(kid, x + node.width + H_GAP, cursor, pathStack)
      cursor += h * (kidNode.height + V_GAP)
    })

    pathStack.delete(id)
    return totalH
  }

  // Place each root tree, stacking vertically
  const ROOT_X = 80
  let cursor = 80
  roots.forEach((root) => {
    const h = place(root, ROOT_X, cursor)
    const node = nodes.find((n) => n.id === root)
    cursor += h + (node?.height ?? 120) + V_GAP
  })

  return positions
}
