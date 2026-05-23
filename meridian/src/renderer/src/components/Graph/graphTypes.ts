import * as d3 from 'd3'

export interface GNode extends d3.SimulationNodeDatum {
  id: string
  name: string
  degree: number
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
