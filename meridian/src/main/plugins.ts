import { app } from 'electron'
import { existsSync } from 'fs'
import { mkdir, readFile, readdir, stat } from 'fs/promises'
import { join, resolve, sep } from 'path'
import type { PluginManifest, PluginSource } from '../shared/types'

type AppPluginSource = Extract<PluginSource, 'user' | 'bundled'>

const APP_PLUGIN_SOURCES: AppPluginSource[] = ['user', 'bundled']
const PLUGIN_ID_RE = /^[a-z0-9][a-z0-9-]*$/

export interface ResolvedPluginFile {
  root: string
  fullPath: string
}

export function getUserPluginsDir(): string {
  return join(app.getPath('userData'), 'plugins')
}

export function getBundledPluginsDir(): string {
  const candidates = [
    join(process.resourcesPath, 'plugins'),
    resolve(app.getAppPath(), '..', 'plugins'),
    resolve(process.cwd(), '..', 'plugins'),
    resolve(process.cwd(), 'plugins')
  ]

  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0]
}

export async function ensureUserPluginsDir(): Promise<string> {
  const dir = getUserPluginsDir()
  await mkdir(dir, { recursive: true })
  return dir
}

async function listPluginManifestsFromDir(
  pluginsDir: string,
  source: AppPluginSource
): Promise<PluginManifest[]> {
  try {
    const stats = await stat(pluginsDir)
    if (!stats.isDirectory()) return []
  } catch {
    return []
  }

  const entries = await readdir(pluginsDir)
  const manifests: PluginManifest[] = []

  for (const entry of entries) {
    if (entry.startsWith('.')) continue
    const manifestPath = join(pluginsDir, entry, 'manifest.json')
    try {
      const manifestContent = await readFile(manifestPath, 'utf-8')
      const manifestObj = JSON.parse(manifestContent) as Partial<PluginManifest>
      if (
        manifestObj.id === entry &&
        PLUGIN_ID_RE.test(manifestObj.id) &&
        manifestObj.name &&
        manifestObj.version
      ) {
        manifests.push({ ...manifestObj, source } as PluginManifest)
      }
    } catch (err) {
      console.warn(`[Plugins] Failed to read ${source} plugin manifest ${entry}:`, err)
    }
  }

  return manifests
}

export async function listAppPluginManifests(): Promise<PluginManifest[]> {
  const manifests = [
    ...(await listPluginManifestsFromDir(getUserPluginsDir(), 'user')),
    ...(await listPluginManifestsFromDir(getBundledPluginsDir(), 'bundled'))
  ]
  const byId = new Map<string, PluginManifest>()

  for (const manifest of manifests) {
    if (!byId.has(manifest.id)) byId.set(manifest.id, manifest)
  }

  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name))
}

function getAppPluginRoots(source?: AppPluginSource): string[] {
  const sources = source ? [source] : APP_PLUGIN_SOURCES
  return sources.map((source) => (source === 'user' ? getUserPluginsDir() : getBundledPluginsDir()))
}

export async function resolveAppPluginFile(
  pluginId: string,
  fileSubpath: string,
  source?: AppPluginSource
): Promise<ResolvedPluginFile | null> {
  if (!PLUGIN_ID_RE.test(pluginId)) return null

  for (const pluginsDir of getAppPluginRoots(source)) {
    const pluginRoot = resolve(pluginsDir, pluginId)
    const fullPath = resolve(pluginRoot, fileSubpath)

    if (!fullPath.startsWith(pluginRoot + sep) && fullPath !== pluginRoot) {
      continue
    }

    try {
      const stats = await stat(fullPath)
      if (stats.isFile()) return { root: pluginRoot, fullPath }
    } catch {
      // Try the next app-level plugin source.
    }
  }

  return null
}
