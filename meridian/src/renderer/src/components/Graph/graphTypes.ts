import * as d3 from 'd3'
import type { GroupLayer } from './simulation/groupLayer'

export interface GNode extends d3.SimulationNodeDatum {
  id: string
  name: string
  degree: number
  /** Top-level folder in the vault ('' for the root); used to group and colour by folder. */
  folder?: string
  /** Position of the folder among the vault's folders; picks its colour. */
  folderIndex?: number
}

export interface GLink extends d3.SimulationLinkDatum<GNode> {
  source: string | GNode
  target: string | GNode
}

export interface GraphViewProps {
  onFileOpen?: () => void
}

export interface D3State {
  sim: d3.Simulation<GNode, GLink>
  nodeG: d3.Selection<SVGGElement, GNode, SVGGElement, unknown>
  linkSel: d3.Selection<SVGLineElement, GLink, SVGGElement, unknown>
  dateLabel: d3.Selection<SVGTextElement, unknown, null, undefined>
  svgEl: SVGSVGElement
  /** Group puddles and the force that gathers each group; changed live when the group mode changes. */
  groups: GroupLayer
  /** Ids of the notes matching the search box; they are highlighted and always labelled. */
  matches: Set<string>
  nodes: GNode[]
  links: GLink[]
  width: number
  height: number
}

export interface GraphBuildResult {
  nodes: GNode[]
  links: GLink[]
  totalEligible: number // after filters, before cap
  displayedCount: number
  truncated: boolean
  maxNodes: number
}
