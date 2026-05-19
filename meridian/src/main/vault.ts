import { readFile, writeFile, readdir, stat, mkdir, rm, rename } from 'fs/promises'
import { basename, join, relative, resolve, sep } from 'path'
import { VaultFile } from '../shared/types'

export class VaultManager {
  constructor(public readonly vaultPath: string) {}

  private assertInsideVault(targetPath: string): void {
    const resolved = resolve(targetPath)
    const vaultResolved = resolve(this.vaultPath)
    if (!resolved.startsWith(vaultResolved + sep) && resolved !== vaultResolved) {
      throw new Error(`Path outside vault: ${targetPath}`)
    }
  }

  async listFiles(dir = this.vaultPath): Promise<VaultFile[]> {
    const entries = await readdir(dir)
    const files: VaultFile[] = []

    for (const entry of entries) {
      if (entry.startsWith('.')) continue
      const fullPath = join(dir, entry)
      const info = await stat(fullPath)
      const isDirectory = info.isDirectory()

      const file: VaultFile = {
        name: entry,
        path: fullPath,
        relativePath: relative(this.vaultPath, fullPath),
        isDirectory,
        mtime: info.mtimeMs,
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
    this.assertInsideVault(filePath)
    const info = await stat(filePath)
    const isDirectory = info.isDirectory()
    const file: VaultFile = {
      name: basename(filePath),
      path: filePath,
      relativePath: relative(this.vaultPath, filePath),
      isDirectory,
      mtime: info.mtimeMs,
    }

    if (isDirectory) {
      file.children = await this.listFiles(filePath)
    }

    return file
  }

  async readFile(filePath: string): Promise<string> {
    this.assertInsideVault(filePath)
    return readFile(filePath, 'utf-8')
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    this.assertInsideVault(filePath)
    await writeFile(filePath, content, 'utf-8')
  }

  async createFile(dir: string, name: string): Promise<string> {
    this.assertInsideVault(dir)
    const filePath = join(dir, name)
    await writeFile(filePath, '', 'utf-8')
    return filePath
  }

  async deleteFile(filePath: string): Promise<void> {
    this.assertInsideVault(filePath)
    await rm(filePath, { recursive: true })
  }

  async createDirectory(parentDir: string, name: string): Promise<string> {
    this.assertInsideVault(parentDir)
    const dirPath = join(parentDir, name)
    await mkdir(dirPath, { recursive: true })
    return dirPath
  }

  async renameFile(oldPath: string, newName: string): Promise<string> {
    this.assertInsideVault(oldPath)
    const dir = oldPath.split('/').slice(0, -1).join('/')
    const newPath = dir + '/' + newName
    this.assertInsideVault(newPath)
    await rename(oldPath, newPath)
    return newPath
  }

  async moveFile(sourcePath: string, targetDir: string): Promise<string> {
    this.assertInsideVault(sourcePath)
    this.assertInsideVault(targetDir)
    const name = basename(sourcePath)
    const destPath = join(targetDir, name)
    this.assertInsideVault(destPath)
    if (sourcePath === destPath) return destPath
    await rename(sourcePath, destPath)
    return destPath
  }
}
