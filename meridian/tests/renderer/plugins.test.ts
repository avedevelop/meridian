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
    expect(onLoadSpy).toHaveBeenCalledWith(mockAPI)

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
})
