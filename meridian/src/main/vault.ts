import { readFile, writeFile, readdir, stat, mkdir } from 'fs/promises'
import { join, relative } from 'path'
import { VaultFile } from '../shared/types'

export class VaultManager {
  constructor(public readonly vaultPath: string) {}

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

  async readFile(filePath: string): Promise<string> {
    return readFile(filePath, 'utf-8')
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    await writeFile(filePath, content, 'utf-8')
  }

  async createFile(dir: string, name: string): Promise<string> {
    const filePath = join(dir, name)
    await writeFile(filePath, '', 'utf-8')
    return filePath
  }

  async deleteFile(filePath: string): Promise<void> {
    const { rm } = await import('fs/promises')
    await rm(filePath, { recursive: true })
  }

  async createDirectory(parentDir: string, name: string): Promise<string> {
    const dirPath = join(parentDir, name)
    await mkdir(dirPath, { recursive: true })
    return dirPath
  }
}
