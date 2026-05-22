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
