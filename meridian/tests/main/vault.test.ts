import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { VaultManager } from '../../src/main/vault'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

let tmpDir: string
let vault: VaultManager

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'meridian-test-'))
  vault = new VaultManager(tmpDir)
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('VaultManager', () => {
  it('lists files in the vault root', async () => {
    writeFileSync(join(tmpDir, 'Hello.md'), '# Hello')
    writeFileSync(join(tmpDir, 'World.md'), '# World')

    const files = await vault.listFiles()
    const names = files.map(f => f.name).sort()
    expect(names).toEqual(['Hello.md', 'World.md'])
  })

  it('reads file content', async () => {
    writeFileSync(join(tmpDir, 'Note.md'), '# My Note')
    const content = await vault.readFile(join(tmpDir, 'Note.md'))
    expect(content).toBe('# My Note')
  })

  it('writes file content', async () => {
    const filePath = join(tmpDir, 'New.md')
    await vault.writeFile(filePath, '# Written')
    const content = await vault.readFile(filePath)
    expect(content).toBe('# Written')
  })

  it('creates a new file with default content', async () => {
    const filePath = await vault.createFile(tmpDir, 'Created.md')
    expect(filePath).toContain('Created.md')
    const content = await vault.readFile(filePath)
    expect(content).toBe('')
  })

  it('returns relative paths', async () => {
    writeFileSync(join(tmpDir, 'Note.md'), '')
    const files = await vault.listFiles()
    expect(files[0].relativePath).toBe('Note.md')
  })

  it('lists subdirectory files recursively', async () => {
    mkdirSync(join(tmpDir, 'Projects'))
    writeFileSync(join(tmpDir, 'Projects', 'Alpha.md'), '')
    const files = await vault.listFiles()
    const dir = files.find(f => f.isDirectory && f.name === 'Projects')
    expect(dir).toBeDefined()
    expect(dir!.children?.length).toBe(1)
    expect(dir!.children?.[0].name).toBe('Alpha.md')
  })
})
