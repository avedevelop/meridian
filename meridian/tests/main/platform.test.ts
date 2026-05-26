import { describe, expect, it } from 'vitest'
import { buildWindowOptions } from '../../src/main/platform'

describe('buildWindowOptions', () => {
  it('uses macOS hidden inset chrome on darwin', () => {
    const options = buildWindowOptions('darwin', { width: 1200, height: 800 })

    expect(options.titleBarStyle).toBe('hiddenInset')
    expect(options.width).toBe(1200)
    expect(options.height).toBe(800)
  })

  it('uses standard framed chrome on Windows', () => {
    const options = buildWindowOptions('win32', { width: 1200, height: 800 })

    expect(options.titleBarStyle).toBeUndefined()
    expect(options.backgroundColor).toBe('#1a1a1a')
  })
})
