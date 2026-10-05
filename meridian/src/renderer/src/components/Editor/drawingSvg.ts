import { escapeAttr } from './markdownUtils'

/** Coerce untrusted file data to a finite number so it can never carry markup. */
function num(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

function color(value: unknown, fallback: string): string {
  return typeof value === 'string' && value ? escapeAttr(value) : fallback
}

function pointPair(p: unknown): [number, number] {
  const pair = Array.isArray(p) ? p : []
  return [num(pair[0]), num(pair[1])]
}

/** Render saved sketchpad elements to SVG markup. Every field is sanitized. */
export function renderDrawingToSVG(elements: unknown[]): string {
  return elements
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return ''
      const el = raw as Record<string, unknown>
      const stroke = color(el.stroke, 'currentColor')
      const fill = color(el.fill, 'none')
      const sw = num(el.strokeWidth, 1)

      if (el.type === 'pencil' && Array.isArray(el.points) && el.points.length > 0) {
        const pts = el.points.map(pointPair)
        const d =
          `M ${pts[0][0]} ${pts[0][1]} ` +
          pts
            .slice(1)
            .map((p) => `L ${p[0]} ${p[1]}`)
            .join(' ')
        return `<path d="${d}" stroke="${stroke}" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round" />`
      }
      if (el.type === 'rectangle' && [el.x, el.y, el.w, el.h].every((v) => v !== undefined)) {
        const [x0, y0, w, h] = [num(el.x), num(el.y), num(el.w), num(el.h)]
        const x = w < 0 ? x0 + w : x0
        const y = h < 0 ? y0 + h : y0
        return `<rect x="${x}" y="${y}" width="${Math.abs(w)}" height="${Math.abs(h)}" stroke="${stroke}" stroke-width="${sw}" fill="${fill}" />`
      }
      if (el.type === 'circle' && [el.x, el.y, el.w].every((v) => v !== undefined)) {
        return `<circle cx="${num(el.x)}" cy="${num(el.y)}" r="${Math.abs(num(el.w))}" stroke="${stroke}" stroke-width="${sw}" fill="${fill}" />`
      }
      if (el.type === 'line' && [el.x, el.y, el.w, el.h].every((v) => v !== undefined)) {
        return `<line x1="${num(el.x)}" y1="${num(el.y)}" x2="${num(el.w)}" y2="${num(el.h)}" stroke="${stroke}" stroke-width="${sw}" />`
      }
      if (el.type === 'text' && el.x !== undefined && el.y !== undefined && el.text) {
        return `<text x="${num(el.x)}" y="${num(el.y)}" fill="${stroke}" font-size="${sw}" font-family="sans-serif">${escapeAttr(String(el.text))}</text>`
      }
      return ''
    })
    .join('\n')
}
