import { describe, it, expect, beforeEach, vi } from 'vitest'
import { pluginRegistry } from '../../src/renderer/src/plugins/registry'
import type { MeridianPlugin, PluginAPI } from '../../src/renderer/src/plugins/types'

describe('PluginRegistry', () => {
  let mockAPI: PluginAPI

  beforeEach(() => {
    // Reset registry maps
    ;(pluginRegistry as any).corePlugins.clear()
    ;(pluginRegistry as any).communityPlugins.clear()
    ;(pluginRegistry as any).loadedPlugins.clear()
    ;(pluginRegistry as any).commands.clear()
    ;(pluginRegistry as any).commandOwners.clear()
    ;(pluginRegistry as any).listeners.clear()

    // Create a mock PluginAPI
    mockAPI = {
      vault: {} as any,
      settings: {
        get: vi.fn(),
        set: vi.fn()
      },
      ui: {
        toast: vi.fn(),
        openSettings: vi.fn()
      },
      app: {
        openDailyNote: vi.fn()
      },
      registerCommand: vi.fn()
    }
    pluginRegistry.setAPI(mockAPI)
  })

  it('registers and retrieves core plugins', () => {
    const plugin: MeridianPlugin = {
      id: 'test-core',
      name: 'Test Core Plugin',
      version: '1.0.0'
    }

    pluginRegistry.registerCorePlugin(plugin)
    expect(pluginRegistry.getCorePlugins()).toContain(plugin)
    expect(pluginRegistry.getPlugin('test-core')).toBe(plugin)
  })

  it('enables and disables core plugins', async () => {
    const onLoadSpy = vi.fn()
    const onUnloadSpy = vi.fn()

    const plugin: MeridianPlugin = {
      id: 'test-core',
      name: 'Test Core',
      version: '1.0.0',
      onLoad: onLoadSpy,
      onUnload: onUnloadSpy
    }

    pluginRegistry.registerCorePlugin(plugin)

    await pluginRegistry.enablePlugin('test-core')
    expect(pluginRegistry.isPluginLoaded('test-core')).toBe(true)
    expect(onLoadSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        vault: mockAPI.vault,
        settings: mockAPI.settings,
        ui: mockAPI.ui,
        app: mockAPI.app,
        registerCommand: expect.any(Function)
      })
    )

    pluginRegistry.disablePlugin('test-core')
    expect(pluginRegistry.isPluginLoaded('test-core')).toBe(false)
    expect(onUnloadSpy).toHaveBeenCalled()
  })

  it('loads community plugins and maps exports', () => {
    const manifest = {
      id: 'my-community-plugin',
      name: 'My Community Plugin',
      version: '1.0.1',
      author: 'Author Name',
      description: 'Community plugin description'
    }

    const onLoadSpy = vi.fn()
    const exports = {
      default: class MyPlugin {
        onLoad = onLoadSpy
      }
    }

    const loaded = pluginRegistry.loadCommunityPlugin(manifest, exports)
    expect(loaded.id).toBe('my-community-plugin')
    expect(loaded.name).toBe('My Community Plugin')
    expect(loaded.author).toBe('Author Name')
    expect(pluginRegistry.getPlugin('my-community-plugin')).toBe(loaded)
  })

  it('registers and unregisters plugin commands', async () => {
    const runSpy = vi.fn()
    const command = {
      id: 'my-command',
      title: 'My Command',
      run: runSpy
    }

    const plugin: MeridianPlugin = {
      id: 'test-commands-plugin',
      name: 'Commands Test',
      version: '1.0.0',
      commands: [command]
    }

    pluginRegistry.registerCorePlugin(plugin)
    await pluginRegistry.enablePlugin('test-commands-plugin')

    const cmds = pluginRegistry.getCommands()
    expect(cmds).toContain(command)

    pluginRegistry.disablePlugin('test-commands-plugin')
    expect(pluginRegistry.getCommands()).not.toContain(command)
  })

  it('unregisters commands registered through the PluginAPI on unload', async () => {
    const dynamicCommand = {
      id: 'dynamic-command',
      title: 'Dynamic Command',
      run: vi.fn()
    }

    const plugin: MeridianPlugin = {
      id: 'dynamic-commands-plugin',
      name: 'Dynamic Commands Test',
      version: '1.0.0',
      onLoad: (api) => {
        api.registerCommand(dynamicCommand)
      }
    }

    pluginRegistry.registerCorePlugin(plugin)
    await pluginRegistry.enablePlugin('dynamic-commands-plugin')
    expect(pluginRegistry.getCommands()).toContain(dynamicCommand)

    pluginRegistry.disablePlugin('dynamic-commands-plugin')
    expect(pluginRegistry.getCommands()).not.toContain(dynamicCommand)
  })

  it('notifies subscribers when commands change', async () => {
    const listener = vi.fn()
    const unsubscribe = pluginRegistry.subscribe(listener)
    const command = {
      id: 'observable-command',
      title: 'Observable Command',
      run: vi.fn()
    }

    pluginRegistry.registerCommand(command)
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    pluginRegistry.registerCommand({ ...command, id: 'after-unsubscribe' })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('rethrows enable errors so callers can surface them', async () => {
    const failingPlugin: MeridianPlugin = {
      id: 'broken-plugin',
      name: 'Broken',
      version: '1.0.0',
      onLoad: () => {
        throw new Error('boom')
      }
    }
    pluginRegistry.registerCorePlugin(failingPlugin)

    await expect(pluginRegistry.enablePlugin('broken-plugin')).rejects.toThrow('boom')
    expect(pluginRegistry.isPluginLoaded('broken-plugin')).toBe(false)
  })

  describe('pruneCommunityPlugins (vault switch)', () => {
    function makeManifest(id: string) {
      return {
        id,
        name: id,
        version: '1.0.0'
      }
    }

    it('drops community entries not in the keep set', () => {
      pluginRegistry.loadCommunityPlugin(makeManifest('vault-a-only'), {})
      pluginRegistry.loadCommunityPlugin(makeManifest('shared-plugin'), {})

      pluginRegistry.pruneCommunityPlugins(new Set(['shared-plugin']))

      const remaining = pluginRegistry.getCommunityPlugins().map((p) => p.id)
      expect(remaining).toEqual(['shared-plugin'])
    })

    it('disables loaded plugins before dropping them', async () => {
      const onUnloadSpy = vi.fn()
      const manifest = makeManifest('to-be-pruned')
      const exports = {
        default: class P {
          onUnload = onUnloadSpy
        }
      }
      pluginRegistry.loadCommunityPlugin(manifest, exports)
      await pluginRegistry.enablePlugin('to-be-pruned')
      expect(pluginRegistry.isPluginLoaded('to-be-pruned')).toBe(true)

      pluginRegistry.pruneCommunityPlugins(new Set())

      expect(onUnloadSpy).toHaveBeenCalled()
      expect(pluginRegistry.isPluginLoaded('to-be-pruned')).toBe(false)
      expect(pluginRegistry.getCommunityPlugins()).toEqual([])
    })

    it('is a no-op when every id is preserved', () => {
      pluginRegistry.loadCommunityPlugin(makeManifest('a'), {})
      pluginRegistry.loadCommunityPlugin(makeManifest('b'), {})

      pluginRegistry.pruneCommunityPlugins(new Set(['a', 'b']))

      const ids = pluginRegistry.getCommunityPlugins().map((p) => p.id).sort()
      expect(ids).toEqual(['a', 'b'])
    })
  })
})
