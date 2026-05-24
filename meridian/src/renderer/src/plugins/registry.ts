import type { MeridianPlugin, PluginCommand, PluginAPI } from './types'

class PluginRegistry {
  private corePlugins = new Map<string, MeridianPlugin>()
  private communityPlugins = new Map<string, MeridianPlugin>()
  private loadedPlugins = new Map<string, MeridianPlugin>() // active plugin instances
  private commands = new Map<string, PluginCommand>()
  private commandOwners = new Map<string, string>()
  private listeners = new Set<() => void>()
  private api: PluginAPI | null = null

  private notify() {
    for (const listener of this.listeners) listener()
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

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

  registerCommand(cmd: PluginCommand, ownerId?: string) {
    this.commands.set(cmd.id, cmd)
    if (ownerId) {
      this.commandOwners.set(cmd.id, ownerId)
    }
    this.notify()
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
          this.registerCommand(cmd, id)
        }
      }
      if (plugin.onLoad) {
        const pluginAPI: PluginAPI = {
          ...this.api,
          registerCommand: (cmd) => this.registerCommand(cmd, id)
        }
        await plugin.onLoad(pluginAPI)
      }
    } catch (err) {
      console.error(`Failed to load plugin ${id}:`, err)
      this.loadedPlugins.delete(id)
      this.removePluginCommands(id)
      throw err
    }
  }

  private removePluginCommands(id: string): void {
    let changed = false
    for (const [cmdId, ownerId] of Array.from(this.commandOwners.entries())) {
      if (ownerId === id) {
        this.commands.delete(cmdId)
        this.commandOwners.delete(cmdId)
        changed = true
      }
    }

    if (changed) this.notify()
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

    this.removePluginCommands(id)

    this.loadedPlugins.delete(id)
  }

  clearCommunityPlugins() {
    for (const [id] of this.communityPlugins) {
      this.disablePlugin(id)
    }
    this.communityPlugins.clear()
  }

  pruneCommunityPlugins(keepIds: Iterable<string>): void {
    const keep = new Set(keepIds)
    for (const id of Array.from(this.communityPlugins.keys())) {
      if (!keep.has(id)) {
        if (this.loadedPlugins.has(id)) {
          this.disablePlugin(id)
        }
        this.communityPlugins.delete(id)
      }
    }
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
