export interface DrawingElement {
  id: string
  type: 'pencil' | 'rectangle' | 'circle' | 'line' | 'text'
  points?: [number, number][]
  x?: number
  y?: number
  w?: number
  h?: number
  text?: string
  stroke: string
  fill: string
  strokeWidth: number
}

export const ERASER_RADIUS = 18
export const STEP = 3 // px between discretization points

// Convert any shape to a series of outline points for partial erase
export const discretize = (el: DrawingElement): [number, number][] | null => {
  if (el.type === 'pencil') return (el.points as [number, number][]) ?? null
  if (el.type === 'line' && el.x !== undefined && el.y !== undefined && el.w !== undefined && el.h !== undefined) {
    const n = Math.max(2, Math.ceil(Math.hypot(el.w - el.x, el.h - el.y) / STEP))
    return Array.from({ length: n + 1 }, (_, i) => [
      el.x! + (el.w! - el.x!) * i / n, el.y! + (el.h! - el.y!) * i / n,
    ] as [number, number])
  }
  if (el.type === 'rectangle' && el.x !== undefined && el.y !== undefined && el.w !== undefined && el.h !== undefined) {
    const x1 = el.x, y1 = el.y, x2 = el.x + el.w, y2 = el.y + el.h
    const wn = Math.max(2, Math.ceil(Math.abs(el.w) / STEP))
    const hn = Math.max(2, Math.ceil(Math.abs(el.h) / STEP))
    const pts: [number, number][] = []
    for (let i = 0; i <= wn; i++) pts.push([x1 + (x2 - x1) * i / wn, y1])
    for (let i = 1; i <= hn; i++) pts.push([x2, y1 + (y2 - y1) * i / hn])
    for (let i = wn - 1; i >= 0; i--) pts.push([x1 + (x2 - x1) * i / wn, y2])
    for (let i = hn - 1; i > 0; i--) pts.push([x1, y1 + (y2 - y1) * i / hn])
    return pts
  }
  if (el.type === 'circle' && el.x !== undefined && el.y !== undefined && el.w !== undefined) {
    const n = Math.max(16, Math.ceil(2 * Math.PI * el.w / STEP))
    return Array.from({ length: n }, (_, i) => {
      const a = (2 * Math.PI * i) / n
      return [el.x! + el.w! * Math.cos(a), el.y! + el.w! * Math.sin(a)] as [number, number]
    })
  }
  return null
}

// Split point array at eraser position → contiguous segments outside the eraser
export const splitSegments = (pts: [number, number][], x: number, y: number): [number, number][][] => {
  const segs: [number, number][][] = []
  let seg: [number, number][] = []
  for (const pt of pts) {
    if (Math.hypot(x - pt[0], y - pt[1]) < ERASER_RADIUS) {
      if (seg.length >= 2) segs.push(seg)
      seg = []
    } else {
      seg.push(pt)
    }
  }
  if (seg.length >= 2) segs.push(seg)
  return segs
}

// Apply eraser: ALL types get partially erased via discretize → split
export const applyEraserAt = (elements: DrawingElement[], x: number, y: number): DrawingElement[] => {
  const result: DrawingElement[] = []
  for (const el of elements) {
    if (el.type === 'text') {
      // Text erased whole on contact
      if (!(el.x !== undefined && el.y !== undefined && Math.abs(x - el.x) < 60 && Math.abs(y - el.y) < 20))
        result.push(el)
      continue
    }
    const pts = discretize(el)
    if (!pts) { result.push(el); continue }
    if (!pts.some(([px, py]) => Math.hypot(x - px, y - py) < ERASER_RADIUS)) {
      result.push(el); continue
    }
    // Convert remaining segments to pencil strokes
    splitSegments(pts, x, y).forEach((s, i) => result.push({
      id: i === 0 ? el.id : `${el.id}-${i}-${Date.now()}`,
      type: 'pencil',
      points: s,
      stroke: el.stroke,
      fill: 'none',
      strokeWidth: el.strokeWidth,
    }))
  }
  return result
}
