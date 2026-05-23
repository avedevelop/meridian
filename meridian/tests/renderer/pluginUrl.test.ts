import { describe, it, expect } from 'vitest'
import {
  buildPluginUrl,
  parsePluginUrl,
  PLUGIN_URL_SCHEME
} from '../../src/shared/pluginUrl'

describe('pluginUrl helpers', () => {
  it('exports the meridian-plugin: scheme constant', () => {
    expect(PLUGIN_URL_SCHEME).toBe('meridian-plugin:')
  })

  describe('buildPluginUrl', () => {
    it('builds a URL with the default entry file', () => {
      expect(buildPluginUrl('hello-plugin')).toBe('meridian-plugin://hello-plugin/main.js')
    })

    it('builds a URL with a custom entry file', () => {
      expect(buildPluginUrl('my-plugin', 'dist/index.js')).toBe(
        'meridian-plugin://my-plugin/dist/index.js'
      )
    })

    it('strips leading ./ and / from the entry file', () => {
      expect(buildPluginUrl('p1', './main.js')).toBe('meridian-plugin://p1/main.js')
      expect(buildPluginUrl('p1', '/main.js')).toBe('meridian-plugin://p1/main.js')
    })

    it('rejects invalid plugin ids', () => {
      expect(buildPluginUrl('Bad-ID')).toBeNull()
      expect(buildPluginUrl('')).toBeNull()
      expect(buildPluginUrl('-leading-dash')).toBeNull()
      expect(buildPluginUrl('has space')).toBeNull()
      expect(buildPluginUrl('has/slash')).toBeNull()
    })

    it('rejects path traversal in the entry file', () => {
      expect(buildPluginUrl('p1', '../escape.js')).toBeNull()
      expect(buildPluginUrl('p1', 'a/../b.js')).toBeNull()
    })

    it('rejects empty entry files', () => {
      expect(buildPluginUrl('p1', '')).toBeNull()
      expect(buildPluginUrl('p1', '/')).toBeNull()
    })
  })

  describe('parsePluginUrl', () => {
    it('parses a well-formed url', () => {
      expect(parsePluginUrl('meridian-plugin://hello-plugin/main.js')).toEqual({
        id: 'hello-plugin',
        path: 'main.js'
      })
    })

    it('decodes percent-encoded paths', () => {
      expect(parsePluginUrl('meridian-plugin://p1/dir%20one/main.js')).toEqual({
        id: 'p1',
        path: 'dir one/main.js'
      })
    })

    it('returns null for the wrong scheme', () => {
      expect(parsePluginUrl('https://hello-plugin/main.js')).toBeNull()
      expect(parsePluginUrl('file:///main.js')).toBeNull()
    })

    it('returns null for an invalid id', () => {
      expect(parsePluginUrl('meridian-plugin://Bad/main.js')).toBeNull()
    })

    it('normalizes traversal away (URL parser collapses ../)', () => {
      // The WHATWG URL parser collapses ../ at the start of the path,
      // so this round-trips to a safe path. The on-disk security
      // check still happens in the main protocol handler via
      // resolve() + startsWith(pluginRoot).
      expect(parsePluginUrl('meridian-plugin://p1/../escape.js')).toEqual({
        id: 'p1',
        path: 'escape.js'
      })
    })

    it('returns null for malformed urls', () => {
      expect(parsePluginUrl('not a url')).toBeNull()
    })
  })

  describe('round trip', () => {
    it('build → parse yields original inputs', () => {
      const url = buildPluginUrl('hello-plugin', 'sub/dir/main.js')!
      expect(parsePluginUrl(url)).toEqual({ id: 'hello-plugin', path: 'sub/dir/main.js' })
    })
  })
})
