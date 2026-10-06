import * as d3 from 'd3'
import type { D3State } from '../graphTypes'

/** Zoom and pan so the whole graph is in view. Same maths as the "recenter" button. */
export function fitView(
  state: D3State,
  zoom: d3.ZoomBehavior<SVGSVGElement, unknown>,
  duration = 600
): void {
  if (state.nodes.length === 0) return
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity
  for (const n of state.nodes) {
    if (n.x === undefined || n.y === undefined) continue
    if (n.x < minX) minX = n.x
    if (n.x > maxX) maxX = n.x
    if (n.y < minY) minY = n.y
    if (n.y > maxY) maxY = n.y
  }
  if (minX === Infinity) return

  const dx = maxX - minX
  const dy = maxY - minY
  const padding = 60
  const scale = Math.max(
    0.2,
    Math.min(2, 0.95 / Math.max(dx / (state.width - padding), dy / (state.height - padding)))
  )
  const tx = state.width / 2 - ((minX + maxX) / 2) * scale
  const ty = state.height / 2 - ((minY + maxY) / 2) * scale

  d3.select(state.svgEl)
    .transition()
    .duration(duration)
    .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale))
}
