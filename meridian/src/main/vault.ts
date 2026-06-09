import { readFile, writeFile, readdir, stat, mkdir, rm, rename } from 'fs/promises'
import { basename, dirname, join, relative, resolve, sep } from 'path'
import {
  CreatedTypedNote,
  CreateTypedNoteInput,
  MeridianVaultConfig,
  NoteTypeDefinition,
  PluginManifest,
  VaultFile
} from '../shared/types'
import {
  buildTypedNoteContent,
  normalizeNoteTypes,
  sanitizeNoteFileName
} from '../shared/noteTypes'

const PLUGIN_ID_RE = /^[a-z0-9][a-z0-9-]*$/
const CONFIG_PATH = join('.meridian', 'config.json')

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

  async getMeridianConfig(): Promise<MeridianVaultConfig> {
    const configPath = this.resolveAndAssert(CONFIG_PATH)
    try {
      const content = await readFile(configPath, 'utf-8')
      const parsed = JSON.parse(content) as Partial<MeridianVaultConfig>
      return {
        version: 1,
        noteTypes: normalizeNoteTypes(parsed)
      }
    } catch {
      return {
        version: 1,
        noteTypes: normalizeNoteTypes()
      }
    }
  }

  async saveMeridianConfig(config: MeridianVaultConfig): Promise<void> {
    const configPath = this.resolveAndAssert(CONFIG_PATH)
    await mkdir(dirname(configPath), { recursive: true })
    await writeFile(
      configPath,
      JSON.stringify(
        {
          version: 1,
          noteTypes: normalizeNoteTypes(config)
        },
        null,
        2
      ),
      'utf-8'
    )
  }

  async listNoteTypes(): Promise<NoteTypeDefinition[]> {
    const config = await this.getMeridianConfig()
    return config.noteTypes
  }

  private async uniqueFilePath(dir: string, requestedName: string): Promise<string> {
    const parsedName = requestedName.endsWith('.md') ? requestedName.slice(0, -3) : requestedName
    let candidateName = sanitizeNoteFileName(parsedName)
    let candidatePath = this.resolveAndAssert(join(dir, candidateName))
    let index = 2

    while (await this.pathExists(candidatePath)) {
      candidateName = sanitizeNoteFileName(`${parsedName} ${index}`)
      candidatePath = this.resolveAndAssert(join(dir, candidateName))
      index += 1
    }

    return candidatePath
  }

  private async pathExists(path: string): Promise<boolean> {
    try {
      await stat(path)
      return true
    } catch {
      return false
    }
  }

  async createTypedNote(input: CreateTypedNoteInput): Promise<CreatedTypedNote> {
    const types = await this.listNoteTypes()
    const definition = types.find((type) => type.id === input.typeId)
    if (!definition) throw new Error(`Unknown note type: ${input.typeId}`)

    const resolvedDir = this.resolveAndAssert(input.dir)
    await mkdir(resolvedDir, { recursive: true })

    const today = new Date().toISOString().slice(0, 10)
    const title = input.title?.trim() || (definition.id === 'daily' ? today : definition.label)
    const filePath = await this.uniqueFilePath(resolvedDir, title)
    const content = buildTypedNoteContent(definition, { title, date: today })

    await writeFile(filePath, content, 'utf-8')

    return {
      path: filePath,
      name: basename(filePath),
      content,
      type: definition
    }
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

  async listPluginManifests(): Promise<PluginManifest[]> {
    const pluginsDir = join(this.vaultPath, '.meridian', 'plugins')
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
          manifests.push({ ...manifestObj, source: 'vault' } as PluginManifest)
        }
      } catch (err) {
        console.warn(`[VaultManager] Failed to read manifest for plugin ${entry}:`, err)
      }
    }

    return manifests
  }
}
