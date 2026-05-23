import type { MeridianPlugin, PluginCommand, PluginAPI } from './types'

class PluginRegistry {
  private corePlugins = new Map<string, MeridianPlugin>()
  private communityPlugins = new Map<string, MeridianPlugin>()
  private loadedPlugins = new Map<string, MeridianPlugin>() // active plugin instances
  private commands = new Map<string, PluginCommand>()
  private api: PluginAPI | null = null

  setAPI(api: PluginAPI) {
    this.api = api
  }

  registerCorePlugin(plugin: MeridianPlugin) {
    this.corePlugins.set(plugin.id, plugin)
  }

  getCorePlugins(): MeridianPlugin[] {
    return Array.from(this.corePlugins.values())
  }

  getCommunityPlugins(): MeridianPlugin[] {
    return Array.from(this.communityPlugins.values())
  }

  getPlugin(id: string): MeridianPlugin | undefined {
    return this.corePlugins.get(id) ?? this.communityPlugins.get(id)
  }

  registerCommand(cmd: PluginCommand) {
    this.commands.set(cmd.id, cmd)
  }

  getCommands(): PluginCommand[] {
    return Array.from(this.commands.values())
  }

  isPluginLoaded(id: string): boolean {
    return this.loadedPlugins.has(id)
  }

  async enablePlugin(id: string): Promise<void> {
    if (!this.api) return
    if (this.loadedPlugins.has(id)) return

    const plugin = this.getPlugin(id)
    if (!plugin) return

    try {
      this.loadedPlugins.set(id, plugin)
      if (plugin.commands) {
        for (const cmd of plugin.commands) {
          this.registerCommand(cmd)
        }
      }
      if (plugin.onLoad) {
        await plugin.onLoad(this.api)
      }
    } catch (err) {
      console.error(`Failed to load plugin ${id}:`, err)
      this.loadedPlugins.delete(id)
      if (plugin.commands) {
        for (const cmd of plugin.commands) {
          this.commands.delete(cmd.id)
        }
      }
      throw err
    }
  }

  disablePlugin(id: string): void {
    const plugin = this.loadedPlugins.get(id)
    if (!plugin) return

    try {
      if (plugin.onUnload) {
        plugin.onUnload()
      }
    } catch (err) {
      console.error(`Failed to unload plugin ${id}:`, err)
    }

    // Remove commands registered by this plugin
    if (plugin.commands) {
      for (const cmd of plugin.commands) {
        this.commands.delete(cmd.id)
      }
    }

    this.loadedPlugins.delete(id)
  }

  clearCommunityPlugins() {
    for (const [id] of this.communityPlugins) {
      this.disablePlugin(id)
    }
    this.communityPlugins.clear()
  }

  loadCommunityPlugin(manifest: any, moduleExports: any): MeridianPlugin {
    let pluginInstance: any
    if (typeof moduleExports.default === 'function') {
      pluginInstance = new moduleExports.default()
    } else if (moduleExports.default) {
      pluginInstance = moduleExports.default
    } else {
      pluginInstance = moduleExports
    }

    const plugin: MeridianPlugin = {
      ...pluginInstance,
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      author: manifest.author,
      description: manifest.description,
      minAppVersion: manifest.minAppVersion,
      onLoad: pluginInstance.onLoad?.bind(pluginInstance),
      onUnload: pluginInstance.onUnload?.bind(pluginInstance)
    }

    this.communityPlugins.set(plugin.id, plugin)
    return plugin
  }
}

export const pluginRegistry = new PluginRegistry()
export default pluginRegistry
