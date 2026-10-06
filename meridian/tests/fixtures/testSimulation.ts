import { createD3Simulation } from '../../src/renderer/src/components/Graph/simulation/createD3Simulation'
import type { GroupMode } from '../../src/renderer/src/components/Graph/graphGroups'
import { linkedVault } from './linkedVault'

/** A real graph simulation rendered into a detached element (happy-dom). */
export function testSimulation(count: number, folders: string[], groupMode: GroupMode = 'type') {
  const { files, outlinks } = linkedVault(count, folders)
  const el = document.createElement('div')
  Object.defineProperty(el, 'clientWidth', { value: 1200 })
  Object.defineProperty(el, 'clientHeight', { value: 800 })
  const res = createD3Simulation({
    el,
    files,
    outlinks,
    disabledCategories: new Set(),
    strictFilter: false,
    debouncedSearchQuery: '',
    linkDistance: 100,
    repulsionStrength: -160,
    shape: { linkStrength: 0.25, gravity: 0.06, collidePad: 12 },
    textSize: 11,
    showArrows: false,
    openFile: () => undefined,
    handleMouseOver: () => undefined,
    handleMouseOut: () => undefined,
    maxNodes: 0,
    labelMode: 'auto',
    showGlow: false,
    groupMode
  })
  if (!res) throw new Error('no simulation')
  return { el, state: res.state }
}
