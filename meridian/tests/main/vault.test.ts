import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { VaultManager } from '../../src/main/vault'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync } from 'fs'
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
    expect(manifests[0]).toEqual({ ...manifest, source: 'vault' })
  })

  it('listPluginManifests handles missing plugins folder gracefully', async () => {
    const manifests = await vault.listPluginManifests()
    expect(manifests).toEqual([])
  })

  it('listPluginManifests ignores malformed manifest.json files', async () => {
    const pluginsDir = join(tmpDir, '.meridian', 'plugins')
    mkdirSync(join(pluginsDir, 'bad-plugin'), { recursive: true })
    writeFileSync(join(pluginsDir, 'bad-plugin', 'manifest.json'), 'invalid-json')

    const manifests = await vault.listPluginManifests()
    expect(manifests).toEqual([])
  })

  it('listPluginManifests ignores manifests missing required fields', async () => {
    const pluginsDir = join(tmpDir, '.meridian', 'plugins')
    mkdirSync(join(pluginsDir, 'missing-fields-plugin'), { recursive: true })
    const manifest = {
      version: '1.0.0'
    }
    writeFileSync(
      join(pluginsDir, 'missing-fields-plugin', 'manifest.json'),
      JSON.stringify(manifest)
    )

    const manifests = await vault.listPluginManifests()
    expect(manifests).toEqual([])
  })

  it('returns built-in note types when vault config is missing', async () => {
    const types = await vault.listNoteTypes()

    expect(types.map((type) => type.id)).toEqual(['project', 'person', 'daily', 'task'])
  })

  it('merges custom note types from vault config', async () => {
    mkdirSync(join(tmpDir, '.meridian'), { recursive: true })
    writeFileSync(
      join(tmpDir, '.meridian', 'config.json'),
      JSON.stringify({
        version: 1,
        noteTypes: [
          {
            id: 'meeting',
            label: 'Meeting',
            properties: [{ key: 'type', label: 'Type', kind: 'text', defaultValue: 'meeting' }],
            template: '# {{title}}\n\n{{date}}'
          }
        ]
      })
    )

    const types = await vault.listNoteTypes()

    expect(types.find((type) => type.id === 'meeting')?.label).toBe('Meeting')
    expect(types.find((type) => type.id === 'project')).toBeDefined()
  })

  it('creates a typed note with frontmatter and rendered template', async () => {
    const created = await vault.createTypedNote({
      typeId: 'project',
      dir: tmpDir,
      title: 'Project Alpha'
    })

    const content = readFileSync(created.path, 'utf-8')
    expect(created.name).toBe('Project Alpha.md')
    expect(content).toContain('type: project')
    expect(content).toContain('title: Project Alpha')
    expect(content).toContain('# Project Alpha')
  })

  it('creates typed notes in directories with spaces and Cyrillic characters', async () => {
    const dir = join(tmpDir, 'Проекты 2026')
    mkdirSync(dir)

    const created = await vault.createTypedNote({
      typeId: 'person',
      dir,
      title: 'Иван Петров'
    })

    expect(created.path).toBe(join(dir, 'Иван Петров.md'))
    expect(readFileSync(created.path, 'utf-8')).toContain('type: person')
  })

  it('uses a unique file name for duplicate typed notes', async () => {
    await vault.createTypedNote({ typeId: 'task', dir: tmpDir, title: 'Follow up' })
    const duplicate = await vault.createTypedNote({ typeId: 'task', dir: tmpDir, title: 'Follow up' })

    expect(duplicate.name).toBe('Follow up 2.md')
    expect(duplicate.path).toBe(join(tmpDir, 'Follow up 2.md'))
  })
})
