import { describe, expect, it } from 'vitest'
import { getContextMenuPosition } from '../../src/renderer/src/components/Sidebar/ContextMenu'

describe('getContextMenuPosition', () => {
  it('keeps a menu near the clicked point when there is room', () => {
    expect(
      getContextMenuPosition({
        x: 120,
        y: 80,
        menuWidth: 180,
        menuHeight: 120,
        viewportWidth: 1000,
        viewportHeight: 800
      })
    ).toEqual({ left: 120, top: 80 })
  })

  it('clamps the menu to the lower viewport edge', () => {
    expect(
      getContextMenuPosition({
        x: 120,
        y: 760,
        menuWidth: 180,
        menuHeight: 120,
        viewportWidth: 1000,
        viewportHeight: 800
      })
    ).toEqual({ left: 120, top: 672 })
  })

  it('clamps the menu away from negative coordinates', () => {
    expect(
      getContextMenuPosition({
        x: -40,
        y: -20,
        menuWidth: 180,
        menuHeight: 120,
        viewportWidth: 1000,
        viewportHeight: 800
      })
    ).toEqual({ left: 8, top: 8 })
  })
})
