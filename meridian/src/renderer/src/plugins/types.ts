export interface PluginCommand {
  id: string
  title: string
  run: (api: PluginAPI) => void | Promise<void>
}

export interface PluginAPI {
  vault: typeof window.vault
  settings: {
    get<T>(key: string): T
    set(key: string, value: unknown): void
  }
  ui: {
    toast(message: string): void
    openSettings?(tab?: string): void
  }
  app: {
    openDailyNote(): Promise<void>
  }
  registerCommand(cmd: PluginCommand): void
}

export interface MeridianPlugin {
  id: string
  name: string
  version: string
  author?: string
  description?: string
  minAppVersion?: string
  // Lifecycle
  onLoad?(api: PluginAPI): void | Promise<void>
  onUnload?(): void
  // Contributions
  commands?: PluginCommand[]
}
