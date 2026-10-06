import * as d3 from 'd3'
import type { D3State, GNode } from '../graphTypes'

/**
 * The container changed size (the sidebar was folded). Move the centre and the background instead of
 * building the graph again: a rebuild threw the layout away and the nodes faded back in from nothing.
 * Returns false when nothing changed.
 */
export function resizeGraph(state: D3State, width: number, height: number): boolean {
  if (!width || !height || (width === state.width && height === state.height)) return false
  state.width = width
  state.height = height
  const svg = d3.select(state.svgEl).attr('width', width).attr('height', height)
  svg.selectAll(':scope > rect').attr('width', width).attr('height', height)
  state.dateLabel.attr('x', width - 16).attr('y', height - 16)
  const { sim } = state
  ;(sim.force('x') as d3.ForceX<GNode>)?.x(width / 2)
  ;(sim.force('y') as d3.ForceY<GNode>)?.y(height / 2)
  ;(sim.force('orphanRadial') as d3.ForceRadial<GNode>)
    ?.x(width / 2)
    .y(height / 2)
    .radius(Math.min(width, height) * 0.4)
  return true
}
