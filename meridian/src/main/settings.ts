import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { AppConfig } from '../shared/types'

const DEFAULT_CONFIG: AppConfig = {
  recentVaults: [],
  lastVault: null,
  windowBounds: { width: 1200, height: 800 }
}

export class AppSettings {
  private configPath: string
  private data: AppConfig

  constructor() {
    const dir = join(app.getPath('userData'), 'meridian')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    this.configPath = join(dir, 'config.json')
    this.data = this.load()
  }

  private load(): AppConfig {
    try {
      return { ...DEFAULT_CONFIG, ...JSON.parse(readFileSync(this.configPath, 'utf-8')) }
    } catch {
      return { ...DEFAULT_CONFIG }
    }
  }

  private save(): void {
    writeFileSync(this.configPath, JSON.stringify(this.data, null, 2), 'utf-8')
  }

  get(): AppConfig {
    return this.data
  }

  setLastVault(path: string | null): void {
    this.data.lastVault = path
    this.save()
  }

  addRecentVault(path: string, name: string): void {
    const filtered = this.data.recentVaults.filter((v) => v.path !== path)
    filtered.unshift({ path, name })
    this.data.recentVaults = filtered.slice(0, 10)
    this.save()
  }

  setWindowBounds(bounds: AppConfig['windowBounds']): void {
    this.data.windowBounds = bounds
    this.save()
  }

  setGithubToken(token: string, username: string): void {
    this.data.githubToken = token
    this.data.githubUsername = username
    this.save()
  }
}
