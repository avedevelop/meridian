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
