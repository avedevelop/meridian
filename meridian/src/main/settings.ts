import Store from 'electron-store'
import { AppConfig } from '../shared/types'

const DEFAULT_CONFIG: AppConfig = {
  recentVaults: [],
  lastVault: null,
  windowBounds: { width: 1200, height: 800 },
}

export class AppSettings {
  private store = new Store<AppConfig>({ name: 'meridian-config', defaults: DEFAULT_CONFIG })

  get(): AppConfig {
    return {
      recentVaults: this.store.get('recentVaults', DEFAULT_CONFIG.recentVaults),
      lastVault: this.store.get('lastVault', DEFAULT_CONFIG.lastVault),
      windowBounds: this.store.get('windowBounds', DEFAULT_CONFIG.windowBounds),
    }
  }

  setLastVault(path: string | null): void {
    this.store.set('lastVault', path)
  }

  addRecentVault(path: string, name: string): void {
    const recents = this.store.get('recentVaults', DEFAULT_CONFIG.recentVaults)
    const filtered = recents.filter(v => v.path !== path)
    filtered.unshift({ path, name })
    this.store.set('recentVaults', filtered.slice(0, 10))
  }

  setWindowBounds(bounds: AppConfig['windowBounds']): void {
    this.store.set('windowBounds', bounds)
  }
}
