import { readFile, writeFile, readdir, stat, mkdir, rm, rename } from 'fs/promises'
import { basename, dirname, join, relative, resolve, sep } from 'path'
import { VaultFile } from '../shared/types'

export class VaultManager {
  constructor(public readonly vaultPath: string) {}

  private resolveAndAssert(targetPath: string): string {
    const resolved = resolve(this.vaultPath, targetPath)
    const vaultResolved = resolve(this.vaultPath)
    if (!resolved.startsWith(vaultResolved + sep) && resolved !== vaultResolved) {
      throw new Error(`Path outside vault: ${targetPath}`)
    }
    return resolved
  }

  async listFiles(dir = this.vaultPath): Promise<VaultFile[]> {
    const resolvedDir = this.resolveAndAssert(dir)
    const entries = await readdir(resolvedDir)
    const files: VaultFile[] = []

    for (const entry of entries) {
      if (entry.startsWith('.')) continue
      const fullPath = join(resolvedDir, entry)
      const info = await stat(fullPath)
      const isDirectory = info.isDirectory()

      const file: VaultFile = {
        name: entry,
        path: fullPath,
        relativePath: relative(this.vaultPath, fullPath),
        isDirectory,
        mtime: info.mtimeMs,
        birthtime: info.birthtimeMs
      }

      if (isDirectory) {
        file.children = await this.listFiles(fullPath)
      }

      files.push(file)
    }

    return files.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }

  async getFile(filePath: string): Promise<VaultFile> {
    const resolvedPath = this.resolveAndAssert(filePath)
    const info = await stat(resolvedPath)
    const isDirectory = info.isDirectory()
    const file: VaultFile = {
      name: basename(resolvedPath),
      path: resolvedPath,
      relativePath: relative(this.vaultPath, resolvedPath),
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
    const resolvedPath = this.resolveAndAssert(filePath)
    return readFile(resolvedPath, 'utf-8')
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const resolvedPath = this.resolveAndAssert(filePath)
    await writeFile(resolvedPath, content, 'utf-8')
  }

  async createFile(dir: string, name: string): Promise<string> {
    const resolvedDir = this.resolveAndAssert(dir)
    const filePath = join(resolvedDir, name)
    const resolvedPath = this.resolveAndAssert(filePath)
    await writeFile(resolvedPath, '', 'utf-8')
    return resolvedPath
  }

  async deleteFile(filePath: string): Promise<void> {
    const resolvedPath = this.resolveAndAssert(filePath)
    await rm(resolvedPath, { recursive: true })
  }

  async createDirectory(parentDir: string, name: string): Promise<string> {
    const resolvedParent = this.resolveAndAssert(parentDir)
    const dirPath = join(resolvedParent, name)
    const resolvedPath = this.resolveAndAssert(dirPath)
    await mkdir(resolvedPath, { recursive: true })
    return resolvedPath
  }

  async renameFile(oldPath: string, newName: string): Promise<string> {
    const resolvedOld = this.resolveAndAssert(oldPath)
    const dir = dirname(resolvedOld)
    const newPath = join(dir, newName)
    const resolvedNew = this.resolveAndAssert(newPath)
    await rename(resolvedOld, resolvedNew)
    return resolvedNew
  }

  async moveFile(sourcePath: string, targetDir: string): Promise<string> {
    const resolvedSource = this.resolveAndAssert(sourcePath)
    const resolvedTarget = this.resolveAndAssert(targetDir)
    const name = basename(resolvedSource)
    const destPath = join(resolvedTarget, name)
    const resolvedDest = this.resolveAndAssert(destPath)
    if (resolvedSource === resolvedDest) return resolvedDest
    await rename(resolvedSource, resolvedDest)
    return resolvedDest
  }

  async listPluginManifests(): Promise<any[]> {
    const pluginsDir = join(this.vaultPath, '.meridian', 'plugins')
    try {
      const stats = await stat(pluginsDir)
      if (!stats.isDirectory()) return []
    } catch {
      return []
    }

    const entries = await readdir(pluginsDir)
    const manifests: any[] = []

    for (const entry of entries) {
      if (entry.startsWith('.')) continue
      const manifestPath = join(pluginsDir, entry, 'manifest.json')
      try {
        const manifestContent = await readFile(manifestPath, 'utf-8')
        const manifestObj = JSON.parse(manifestContent)
        if (manifestObj.id && manifestObj.name) {
          manifests.push(manifestObj)
        }
      } catch (err) {
        console.warn(`[VaultManager] Failed to read manifest for plugin ${entry}:`, err)
      }
    }

    return manifests
  }
}
