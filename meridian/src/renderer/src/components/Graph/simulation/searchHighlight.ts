import type { D3State } from '../graphTypes'
import { restingFill, restingStroke, restingStrokeWidth } from '../graphColors'

/**
 * Mark the notes whose name contains the search text. Only notes that are on screen count, so a note
 * hidden by a filter or by history mode is not lit up. `q` is the lower-cased, trimmed query.
 */
export function highlightMatches(state: D3State, q: string, visible: Set<string>): void {
  state.matches.clear()
  if (q) {
    for (const d of state.nodes) {
      if (visible.has(d.id) && d.name.toLowerCase().includes(q)) state.matches.add(d.id)
    }
  }
  const mode = state.groups.getMode()
  const { matches } = state
  state.nodeG
    .select<SVGCircleElement>('circle.vis')
    .attr('fill', (d) => restingFill(d, mode, matches))
    .attr('stroke', (d) => restingStroke(d, mode, matches))
    .attr('stroke-width', (d) => restingStrokeWidth(d, matches))
}
