import { describe, it, expect } from 'vitest'
import { shouldShowLabel, truncateLabel } from '../../src/renderer/src/components/Graph/graphLabelHelpers'

describe('shouldShowLabel', () => {
  it('shows all labels when mode is all', () => {
    expect(shouldShowLabel('all', 0.5, 0, false)).toBe(true)
    expect(shouldShowLabel('all', 1.5, 5, true)).toBe(true)
  })

  it('shows labels only on hover when mode is hover', () => {
    expect(shouldShowLabel('hover', 1.5, 5, false)).toBe(false)
    expect(shouldShowLabel('hover', 0.5, 0, true)).toBe(true)
  })

  it('shows labels in auto mode depending on zoom, degree, or hover status', () => {
    // Zoom >= 1.2
    expect(shouldShowLabel('auto', 1.2, 0, false)).toBe(true)
    expect(shouldShowLabel('auto', 1.5, 0, false)).toBe(true)
    expect(shouldShowLabel('auto', 1.1, 0, false)).toBe(false)

    // Degree >= 2
    expect(shouldShowLabel('auto', 1.0, 2, false)).toBe(true)
    expect(shouldShowLabel('auto', 1.0, 3, false)).toBe(true)
    expect(shouldShowLabel('auto', 1.0, 1, false)).toBe(false)

    // Hovered
    expect(shouldShowLabel('auto', 0.5, 0, true)).toBe(true)
  })
})

describe('truncateLabel', () => {
  it('does not truncate short labels', () => {
    expect(truncateLabel('hello')).toBe('hello')
    expect(truncateLabel('my-note.md', 24)).toBe('my-note.md')
  })

  it('truncates labels exceeding the max length', () => {
    expect(truncateLabel('this-is-a-very-long-note-name-indeed.md', 24)).toBe('this-is-a-very-long-no…')
  })
})
