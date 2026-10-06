import type { GNode } from './graphTypes'
import { getNodeGroup } from './graphLayout'
import { GROUP_COLORS } from './GraphSidebar'
import { FOLDER_PALETTE, NO_FOLDER_COLOR, folderColor, type GroupMode } from './graphGroups'

export function nodeFill(d: GNode, mode: GroupMode): string {
  if (mode === 'folder') return folderColor(d.folderIndex)
  return GROUP_COLORS[getNodeGroup(d.id, d.name, d.degree)]
}

/** Every colour a node can have, so the glow gradients can be defined once up front. */
export const ALL_NODE_COLORS: string[] = [
  ...new Set([...Object.values(GROUP_COLORS), ...FOLDER_PALETTE, NO_FOLDER_COLOR])
]

export const glowGradientId = (color: string): string => `glow-${color.replace('#', '')}`

/** Notes that match the search: warm yellow with a white ring, which no folder or type colour uses. */
export const MATCH_FILL = '#ffe66d'
export const MATCH_RING = '#ffffff'

/** The colour a node has when nothing is hovered. */
export function restingFill(d: GNode, mode: GroupMode, matches: Set<string>): string {
  return matches.has(d.id) ? MATCH_FILL : nodeFill(d, mode)
}

export const restingStroke = (d: GNode, mode: GroupMode, matches: Set<string>): string =>
  matches.has(d.id) ? MATCH_RING : nodeFill(d, mode)

export const restingStrokeWidth = (d: GNode, matches: Set<string>): number =>
  matches.has(d.id) ? 3 : 1.5
