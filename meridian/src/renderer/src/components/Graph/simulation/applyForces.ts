import * as d3 from 'd3'
import type { GNode, GLink } from '../graphTypes'
import { nodeR } from '../graphLayout'
import { COLLIDE_STRENGTH, type ForceShape } from '../graphForces'

export interface ForceValues {
  linkDistance: number
  repulsionStrength: number
  shape: ForceShape
  textSize: number
}

/** Push slider and preset values into a running simulation. The caller decides whether to reheat it. */
export function applyForces(sim: d3.Simulation<GNode, GLink>, v: ForceValues): void {
  ;(sim.force('link') as d3.ForceLink<GNode, GLink>)
    ?.distance(v.linkDistance)
    .strength(v.shape.linkStrength)
  ;(sim.force('charge') as d3.ForceManyBody<GNode>)?.strength(v.repulsionStrength)
  ;(sim.force('x') as d3.ForceX<GNode>)?.strength(v.shape.gravity)
  ;(sim.force('y') as d3.ForceY<GNode>)?.strength(v.shape.gravity)
  ;(sim.force('collide') as d3.ForceCollide<GNode>)
    ?.radius((d) => nodeR(d) + v.shape.collidePad + v.textSize * 0.5)
    .strength(COLLIDE_STRENGTH)
}
