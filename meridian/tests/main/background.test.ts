// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ Menu: {}, Tray: class {}, app: {}, nativeImage: {} }))

import {
  HIDDEN_ARG,
  loginItemSettings,
  readBackgroundPrefs,
  shouldHideOnClose,
  shouldQuitWhenAllClosed,
  shouldStartHidden,
  trayLabels,
  trayLanguage
} from '../../src/main/background'

const prefs = (over: Partial<ReturnType<typeof readBackgroundPrefs>> = {}) => ({
  runInBackground: false,
  startMinimized: false,
  launchAtLogin: false,
  ...over
})

describe('readBackgroundPrefs', () => {
  it('defaults everything to off and only accepts real booleans', () => {
    expect(readBackgroundPrefs({})).toEqual(prefs())
    expect(
      readBackgroundPrefs({ runInBackground: 'yes', startMinimized: 1, launchAtLogin: null })
    ).toEqual(prefs())
    expect(readBackgroundPrefs({ runInBackground: true, launchAtLogin: true })).toEqual(
      prefs({ runInBackground: true, launchAtLogin: true })
    )
  })
})

describe('shouldHideOnClose', () => {
  it('hides only in background mode and never while quitting', () => {
    expect(shouldHideOnClose(prefs(), false)).toBe(false)
    expect(shouldHideOnClose(prefs({ runInBackground: true }), false)).toBe(true)
    expect(shouldHideOnClose(prefs({ runInBackground: true }), true)).toBe(false)
  })
})

describe('shouldQuitWhenAllClosed', () => {
  it.each([
    ['darwin', false, false],
    ['win32', false, true],
    ['linux', false, true],
    ['win32', true, false],
    ['darwin', true, false]
  ] as const)('%s runInBackground=%s -> %s', (platform, runInBackground, expected) => {
    expect(shouldQuitWhenAllClosed(platform, prefs({ runInBackground }))).toBe(expected)
  })
})

describe('shouldStartHidden', () => {
  const on = prefs({ runInBackground: true, startMinimized: true })
  it('starts hidden only for login launches', () => {
    expect(shouldStartHidden(on, { argv: ['app'], wasOpenedAtLogin: false })).toBe(false)
    expect(shouldStartHidden(on, { argv: ['app'], wasOpenedAtLogin: true })).toBe(true)
    expect(shouldStartHidden(on, { argv: ['app', HIDDEN_ARG], wasOpenedAtLogin: false })).toBe(true)
  })

  it('never hides the window when there is no tray to bring it back', () => {
    const noTray = prefs({ runInBackground: false, startMinimized: true })
    expect(shouldStartHidden(noTray, { argv: [HIDDEN_ARG], wasOpenedAtLogin: true })).toBe(false)
    expect(
      shouldStartHidden(prefs({ runInBackground: true }), {
        argv: [HIDDEN_ARG],
        wasOpenedAtLogin: true
      })
    ).toBe(false)
  })
})

describe('loginItemSettings', () => {
  it('registers the --hidden argument only when it would take effect', () => {
    expect(loginItemSettings(prefs())).toEqual({ openAtLogin: false, args: [] })
    expect(loginItemSettings(prefs({ launchAtLogin: true }))).toEqual({
      openAtLogin: true,
      args: []
    })
    expect(
      loginItemSettings(prefs({ launchAtLogin: true, runInBackground: true, startMinimized: true }))
    ).toEqual({ openAtLogin: true, args: [HIDDEN_ARG] })
    expect(
      loginItemSettings(prefs({ runInBackground: true, startMinimized: true })).openAtLogin
    ).toBe(false)
  })
})

describe('tray labels', () => {
  it('follows the app language and falls back to English', () => {
    expect(trayLanguage('ru')).toBe('ru')
    expect(trayLanguage('nb')).toBe('nb')
    expect(trayLanguage('de')).toBe('en')
    expect(trayLanguage(undefined)).toBe('en')
    expect(trayLabels('ru').quit).toBe('Выйти из Meridian')
    expect(trayLabels('xx').open).toBe('Open Meridian')
  })
})
