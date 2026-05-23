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
    const names = files.map((f) => f.name).sort()
    expect(names).toEqual(['Hello.md', 'World.md'])
    expect(files[0].birthtime).toBeGreaterThan(0)
    expect(files[1].birthtime).toBeGreaterThan(0)
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

  it('returns metadata for a single vault file', async () => {
    const filePath = join(tmpDir, 'Note.md')
    writeFileSync(filePath, '# Note')
    const file = await vault.getFile(filePath)
    expect(file).toMatchObject({
      name: 'Note.md',
      path: filePath,
      relativePath: 'Note.md',
      isDirectory: false
    })
    expect(file.mtime).toBeGreaterThan(0)
    expect(file.birthtime).toBeGreaterThan(0)
  })

  it('lists subdirectory files recursively', async () => {
    mkdirSync(join(tmpDir, 'Projects'))
    writeFileSync(join(tmpDir, 'Projects', 'Alpha.md'), '')
    const files = await vault.listFiles()
    const dir = files.find((f) => f.isDirectory && f.name === 'Projects')
    expect(dir).toBeDefined()
    expect(dir!.children?.length).toBe(1)
    expect(dir!.children?.[0].name).toBe('Alpha.md')
  })

  it('lists plugin manifests', async () => {
    const pluginsDir = join(tmpDir, '.meridian', 'plugins')
    mkdirSync(join(pluginsDir, 'my-plugin'), { recursive: true })
    const manifest = {
      id: 'my-plugin',
      name: 'My Plugin',
      version: '1.0.0',
      main: 'main.js'
    }
    writeFileSync(join(pluginsDir, 'my-plugin', 'manifest.json'), JSON.stringify(manifest))

    const manifests = await vault.listPluginManifests()
    expect(manifests).toHaveLength(1)
    expect(manifests[0]).toEqual(manifest)
  })
})
