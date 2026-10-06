/**
 * The two sliders (link distance, repulsion) are not enough to change how the graph looks: the collision
 * radius and the pull towards the centre decide the layout just as much. A preset therefore sets those too.
 */
export interface ForceShape {
  /** How firmly a link holds its two ends at the link distance (0..1). */
  linkStrength: number
  /** Pull of every node towards the centre of the view. */
  gravity: number
  /** Space kept around a node on top of its radius and half the text size. */
  collidePad: number
}

export const DEFAULT_SHAPE: ForceShape = { linkStrength: 0.25, gravity: 0.06, collidePad: 12 }

export interface ForcePreset {
  key: 'default' | 'readable' | 'dense' | 'galaxy'
  linkDistance: number
  repulsion: number
  textSize?: number
  shape: ForceShape
}

// Values stay inside the slider ranges (distance 30..200, repulsion -300..-20).
export const FORCE_PRESETS: ForcePreset[] = [
  { key: 'default', linkDistance: 100, repulsion: -160, shape: DEFAULT_SHAPE },
  {
    key: 'readable',
    linkDistance: 140,
    repulsion: -260,
    textSize: 10,
    shape: { linkStrength: 0.3, gravity: 0.04, collidePad: 22 }
  },
  {
    key: 'dense',
    linkDistance: 45,
    repulsion: -90,
    shape: { linkStrength: 0.7, gravity: 0.1, collidePad: 0 }
  },
  {
    key: 'galaxy',
    linkDistance: 200,
    repulsion: -40,
    shape: { linkStrength: 0.15, gravity: 0.004, collidePad: 24 }
  }
]

/** Dragging a node: low target activity, damped velocity and soft collisions keep its neighbours calm. */
export const DRAG_ALPHA_TARGET = 0.1
export const VELOCITY_DECAY = 0.5
export const COLLIDE_STRENGTH = 0.6
