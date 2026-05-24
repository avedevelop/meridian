import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'

const PLUGIN_ID_RE = /^[a-z0-9][a-z0-9-]*$/

describe('bundled community plugins', () => {
  const pluginsDir = join(process.cwd(), '..', 'plugins')

  it('ships loadable plugin manifests and entry files', () => {
    const pluginDirs = readdirSync(pluginsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()

    expect(pluginDirs).toEqual(
      expect.arrayContaining([
        'meridian-link-auditor',
        'meridian-quick-capture',
        'meridian-sample',
        'meridian-template-pack',
        'meridian-vault-index'
      ])
    )

    for (const pluginDir of pluginDirs) {
      const manifestPath = join(pluginsDir, pluginDir, 'manifest.json')
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as Record<string, string>
      const mainFile = manifest.main || 'main.js'

      expect(manifest.id).toBe(pluginDir)
      expect(manifest.id).toMatch(PLUGIN_ID_RE)
      expect(manifest.name).toBeTruthy()
      expect(manifest.version).toBeTruthy()
      expect(mainFile.split('/')).not.toContain('..')
      expect(existsSync(join(pluginsDir, pluginDir, mainFile))).toBe(true)
    }
  })
})
