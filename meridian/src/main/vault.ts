import { readFile, writeFile, readdir, stat, mkdir, rm, rename, realpath, lstat } from 'fs/promises'
import * as path from 'path'
import { PluginManifest, VaultFile } from '../shared/types'

const PLUGIN_ID_RE = /^[a-z0-9][a-z0-9-]*$/

type PathOperations = Pick<
  typeof path,
  'basename' | 'dirname' | 'isAbsolute' | 'join' | 'normalize' | 'relative' | 'resolve' | 'sep'
>

export function normalizeNativePath(input: string, pathOps: PathOperations = path): string {
  return pathOps.normalize(input)
}

export function toPortablePath(input: string, pathOps: PathOperations = path): string {
  return pathOps.sep === '\\' ? input.replace(/\\/g, '/') : input
}

export function normalizeGitPath(input: string, pathOps: PathOperations = path): string {
  const gitPath = pathOps.sep === '\\' ? input.replace(/\\/g, '/') : input
  return path.posix.normalize(gitPath)
}

export function normalizePluginEntryPath(input: string, pathOps: PathOperations = path): string {
  return toPortablePath(normalizeNativePath(input, pathOps), pathOps)
}

export function resolveWithinRoot(
  rootPath: string,
  targetPath: string,
  pathOps: PathOperations = path
): string {
  const resolvedRoot = pathOps.resolve(normalizeNativePath(rootPath, pathOps))
  const resolvedTarget = pathOps.resolve(resolvedRoot, normalizeNativePath(targetPath, pathOps))
  const relativeToRoot = pathOps.relative(resolvedRoot, resolvedTarget)
  if (
    relativeToRoot === '..' ||
    relativeToRoot.startsWith(`..${pathOps.sep}`) ||
    pathOps.isAbsolute(relativeToRoot)
  ) {
    throw new Error(`Path outside vault: ${targetPath}`)
  }
  return resolvedTarget
}

export function resolveMoveDestination(
  vaultPath: string,
  sourcePath: string,
  targetDir: string,
  pathOps: PathOperations = path
): string {
  const resolvedSource = resolveWithinRoot(vaultPath, sourcePath, pathOps)
  const resolvedTarget = resolveWithinRoot(vaultPath, targetDir, pathOps)
  return resolveWithinRoot(
    vaultPath,
    pathOps.join(resolvedTarget, pathOps.basename(resolvedSource)),
    pathOps
  )
}

export async function resolveExistingPathWithinRoot(
  rootPath: string,
  targetPath: string
): Promise<string> {
  const resolvedTarget = resolveWithinRoot(rootPath, targetPath)
  const [realRoot, realTarget] = await Promise.all([realpath(rootPath), realpath(resolvedTarget)])
  resolveWithinRoot(realRoot, realTarget)
  return resolvedTarget
}

export async function resolveWritablePathWithinRoot(
  rootPath: string,
  targetPath: string
): Promise<string> {
  const resolvedTarget = resolveWithinRoot(rootPath, targetPath)
  const realRoot = await realpath(rootPath)
  let existingAncestor = resolvedTarget

  while (true) {
    try {
      await lstat(existingAncestor)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      const parent = path.dirname(existingAncestor)
      if (parent === existingAncestor) throw error
      existingAncestor = parent
      continue
    }

    const realAncestor = await realpath(existingAncestor)
    resolveWithinRoot(realRoot, realAncestor)
    return resolvedTarget
  }
}

export class VaultManager {
  public readonly vaultPath: string

  constructor(vaultPath: string) {
    this.vaultPath = normalizeNativePath(vaultPath)
  }

  private resolveExistingAndAssert(targetPath: string): Promise<string> {
    return resolveExistingPathWithinRoot(this.vaultPath, targetPath)
  }

  private resolveWritableAndAssert(targetPath: string): Promise<string> {
    return resolveWritablePathWithinRoot(this.vaultPath, targetPath)
  }

  async listFiles(dir = this.vaultPath): Promise<VaultFile[]> {
    const resolvedDir = await this.resolveExistingAndAssert(dir)
    const entries = await readdir(resolvedDir)
    const files: VaultFile[] = []

    for (const entry of entries) {
      if (entry.startsWith('.')) continue
      const fullPath = path.join(resolvedDir, entry)
      const safePath = await this.resolveExistingAndAssert(fullPath)
      const info = await stat(safePath)
      const isDirectory = info.isDirectory()

      const file: VaultFile = {
        name: entry,
        path: toPortablePath(safePath),
        relativePath: toPortablePath(path.relative(this.vaultPath, safePath)),
        isDirectory,
        mtime: info.mtimeMs,
        birthtime: info.birthtimeMs
      }

      if (isDirectory) {
        file.children = await this.listFiles(safePath)
      }

      files.push(file)
    }

    return files.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }

  async getFile(filePath: string): Promise<VaultFile> {
    const resolvedPath = await this.resolveExistingAndAssert(filePath)
    const info = await stat(resolvedPath)
    const isDirectory = info.isDirectory()
    const file: VaultFile = {
      name: path.basename(resolvedPath),
      path: toPortablePath(resolvedPath),
      relativePath: toPortablePath(path.relative(this.vaultPath, resolvedPath)),
      isDirectory,
      mtime: info.mtimeMs,
      birthtime: info.birthtimeMs
    }

    if (isDirectory) {
      file.children = await this.listFiles(resolvedPath)
    }

    return file
  }

  async readFile(filePath: string): Promise<string> {
    const resolvedPath = await this.resolveExistingAndAssert(filePath)
    return readFile(resolvedPath, 'utf-8')
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const resolvedPath = await this.resolveWritableAndAssert(filePath)
    await writeFile(resolvedPath, content, 'utf-8')
  }

  async createFile(dir: string, name: string): Promise<string> {
    const resolvedDir = await this.resolveExistingAndAssert(dir)
    const filePath = path.join(resolvedDir, name)
    const resolvedPath = await this.resolveWritableAndAssert(filePath)
    await writeFile(resolvedPath, '', 'utf-8')
    return toPortablePath(resolvedPath)
  }

  async deleteFile(filePath: string): Promise<void> {
    const resolvedPath = await this.resolveExistingAndAssert(filePath)
    await rm(resolvedPath, { recursive: true })
  }

  async createDirectory(parentDir: string, name: string): Promise<string> {
    const resolvedParent = await this.resolveExistingAndAssert(parentDir)
    const dirPath = path.join(resolvedParent, name)
    const resolvedPath = await this.resolveWritableAndAssert(dirPath)
    await mkdir(resolvedPath, { recursive: true })
    return toPortablePath(resolvedPath)
  }

  async renameFile(oldPath: string, newName: string): Promise<string> {
    const resolvedOld = await this.resolveExistingAndAssert(oldPath)
    const dir = path.dirname(resolvedOld)
    const newPath = path.join(dir, newName)
    const resolvedNew = await this.resolveWritableAndAssert(newPath)
    await rename(resolvedOld, resolvedNew)
    return toPortablePath(resolvedNew)
  }

  async moveFile(sourcePath: string, targetDir: string): Promise<string> {
    const resolvedSource = await this.resolveExistingAndAssert(sourcePath)
    await this.resolveExistingAndAssert(targetDir)
    const resolvedDest = resolveMoveDestination(this.vaultPath, sourcePath, targetDir)
    await this.resolveWritableAndAssert(resolvedDest)
    if (resolvedSource === resolvedDest) return toPortablePath(resolvedDest)
    await rename(resolvedSource, resolvedDest)
    return toPortablePath(resolvedDest)
  }

  async listPluginManifests(): Promise<PluginManifest[]> {
    const pluginsDir = path.join(this.vaultPath, '.meridian', 'plugins')
    try {
      const safePluginsDir = await this.resolveExistingAndAssert(pluginsDir)
      const stats = await stat(safePluginsDir)
      if (!stats.isDirectory()) return []
    } catch {
      return []
    }

    const entries = await readdir(pluginsDir)
    const manifests: PluginManifest[] = []

    for (const entry of entries) {
      if (entry.startsWith('.')) continue
      const manifestPath = path.join(pluginsDir, entry, 'manifest.json')
      try {
        const safeManifestPath = await this.resolveExistingAndAssert(manifestPath)
        const manifestContent = await readFile(safeManifestPath, 'utf-8')
        const manifestObj = JSON.parse(manifestContent) as Partial<PluginManifest>
        if (
          manifestObj.id === entry &&
          PLUGIN_ID_RE.test(manifestObj.id) &&
          manifestObj.name &&
          manifestObj.version
        ) {
          manifests.push({ ...manifestObj, source: 'vault' } as PluginManifest)
        }
      } catch (err) {
        console.warn(`[VaultManager] Failed to read manifest for plugin ${entry}:`, err)
      }
    }

    return manifests
  }
}
