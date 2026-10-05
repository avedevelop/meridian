import { app } from 'electron'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

/** The renderer's settings as last saved to disk (`preferences.json`); empty if missing or unreadable. */
export function readPreferences(): Record<string, unknown> {
  try {
    const path = join(app.getPath('userData'), 'meridian', 'preferences.json')
    if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    // fall back to defaults
  }
  return {}
}
