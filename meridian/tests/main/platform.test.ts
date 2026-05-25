import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  openExternal: vi.fn()
}))

vi.mock('electron', () => ({
  app: { name: 'Meridian' },
  BrowserWindow: {
    getFocusedWindow: () => ({ webContents: { send: mocks.send } })
  },
  shell: { openExternal: mocks.openExternal }
}))

import { buildAppMenuTemplate, getWindowOptions } from '../../src/main/platform'

describe('platform helpers', () => {
  beforeEach(() => {
    mocks.send.mockClear()
    mocks.openExternal.mockClear()
  })

  it('uses hiddenInset only on darwin window options', () => {
    const darwin = getWindowOptions('darwin', { width: 1280, height: 900 })
    const win32 = getWindowOptions('win32', { width: 1280, height: 900 })

    expect(darwin.width).toBe(1280)
    expect(darwin.height).toBe(900)
    expect(darwin.titleBarStyle).toBe('hiddenInset')
    expect(win32.width).toBe(1280)
    expect(win32.height).toBe(900)
    expect(win32.titleBarStyle).toBeUndefined()
  })

  it('packages the runtime window icon used by window options', () => {
    const options = getWindowOptions('win32', { width: 1280, height: 900 })
    const builderConfig = readFileSync(join(__dirname, '../../electron-builder.yml'), 'utf8')

    expect(options.icon).toMatch(/resources[/\\]icon\.png$/)
    expect(builderConfig).toContain('  - resources/icon.png')
  })

  it('adds the app menu only on darwin', () => {
    const darwinTemplate = buildAppMenuTemplate('darwin')
    const win32Template = buildAppMenuTemplate('win32')

    expect(darwinTemplate[0].label).toBe('Meridian')
    expect(darwinTemplate.some((item) => item.label === 'File')).toBe(true)
    expect(win32Template[0].label).toBe('File')
    expect(win32Template.some((item) => item.label === 'Meridian')).toBe(false)
  })

  it('omits macOS-only window menu roles on Windows', () => {
    const template = buildAppMenuTemplate('win32')
    const windowMenu = template.find((item) => item.label === 'Window')
    const windowRoles = windowMenu?.submenu?.map((item) => item.role)

    expect(windowRoles).not.toContain('zoom')
    expect(windowRoles).not.toContain('front')
  })

  it('preserves menu actions', () => {
    const template = buildAppMenuTemplate('win32')
    const fileMenu = template.find((item) => item.label === 'File')
    const helpMenu = template.find((item) => item.label === 'Help')

    expect(fileMenu?.submenu?.[0].click).toEqual(expect.any(Function))
    expect(helpMenu?.submenu?.[0].click).toEqual(expect.any(Function))
  })
})
