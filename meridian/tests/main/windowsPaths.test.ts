import { describe, expect, it } from 'vitest'
import { posix, win32 } from 'path'
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  normalizeGitPath,
  normalizeNativePath,
  normalizePluginEntryPath,
  resolveExistingPathWithinRoot,
  resolveMoveDestination,
  resolveWithinRoot,
  resolveWritablePathWithinRoot,
  toPortablePath
} from '../../src/main/vault'
import { VaultManager } from '../../src/main/vault'
import { buildPluginUrl, parsePluginUrl } from '../../src/shared/pluginUrl'

describe('Windows path handling', () => {
  it('normalizes shell and persisted paths with Windows path rules', () => {
    expect(normalizeNativePath('C:/Users/ave/Vault\\Notes\\Today.md', win32)).toBe(
      'C:\\Users\\ave\\Vault\\Notes\\Today.md'
    )
  })

  it('normalizes Windows git object paths to forward slash form', () => {
    expect(normalizeGitPath('Notes\\Daily/Today.md', win32)).toBe('Notes/Daily/Today.md')
  })

  it('preserves a macOS git path containing a literal backslash', () => {
    expect(normalizeGitPath('Notes/Back\\slash.md', posix)).toBe('Notes/Back\\slash.md')
  })

  it('exposes Windows filesystem paths to the renderer with portable separators', () => {
    expect(toPortablePath('C:\\Users\\ave\\Vault\\Notes\\Today.md', win32)).toBe(
      'C:/Users/ave/Vault/Notes/Today.md'
    )
  })

  it('rejects Windows-style traversal outside a vault root', () => {
    expect(() =>
      resolveWithinRoot('C:\\Users\\ave\\Vault', 'C:\\Users\\ave\\Vault\\..\\secrets.md', win32)
    ).toThrow('Path outside vault')
    expect(() =>
      resolveWithinRoot('C:\\Users\\ave\\Vault', 'C:\\Users\\ave\\Vault-archive\\note.md', win32)
    ).toThrow('Path outside vault')
  })

  it('resolves a nested Windows-style move destination inside the vault', () => {
    expect(
      resolveMoveDestination(
        'C:\\Users\\ave\\Vault',
        'C:\\Users\\ave\\Vault\\Inbox\\Idea.md',
        'C:/Users/ave/Vault/Projects\\Meridian',
        win32
      )
    ).toBe('C:\\Users\\ave\\Vault\\Projects\\Meridian\\Idea.md')
  })

  it('preserves a valid macOS filename containing a backslash', () => {
    expect(normalizeNativePath('/Users/ave/Vault/Back\\slash.md', posix)).toBe(
      '/Users/ave/Vault/Back\\slash.md'
    )
    expect(toPortablePath('/Users/ave/Vault/Back\\slash.md', posix)).toBe(
      '/Users/ave/Vault/Back\\slash.md'
    )
  })

  it('converts Windows manifest entry paths only at the native main-process boundary', () => {
    expect(buildPluginUrl('sample-plugin', normalizePluginEntryPath('dist\\main.js', win32))).toBe(
      'meridian-plugin://sample-plugin/dist/main.js'
    )
  })

  it('preserves a POSIX plugin filename containing a backslash', () => {
    const entry = 'dist\\main.js'
    const url = buildPluginUrl('sample-plugin', entry)
    expect(url).toBe('meridian-plugin://sample-plugin/dist\\main.js')
    expect(parsePluginUrl(url!)).toEqual({ id: 'sample-plugin', path: entry })
  })

  it('rejects Windows traversal after main-process manifest normalization', () => {
    const entry = normalizePluginEntryPath('..\\escape.js', win32)
    expect(buildPluginUrl('sample-plugin', entry)).toBeNull()
    expect(() =>
      resolveWithinRoot('C:\\Vault\\.meridian\\plugins\\sample-plugin', '..\\escape.js', win32)
    ).toThrow('Path outside vault')
  })
})

describe('symlink containment', () => {
  function setupSymlinkFixture(context: { skip: () => void }) {
    const root = mkdtempSync(join(tmpdir(), 'meridian-vault-'))
    const outside = mkdtempSync(join(tmpdir(), 'meridian-outside-'))
    const linkedDir = join(root, 'linked')
    mkdirSync(join(root, 'notes'))
    writeFileSync(join(outside, 'secret.md'), 'outside')
    try {
      symlinkSync(outside, linkedDir, 'dir')
    } catch (error) {
      rmSync(root, { recursive: true, force: true })
      rmSync(outside, { recursive: true, force: true })
      const code = (error as NodeJS.ErrnoException).code
      if (code === 'EPERM' || code === 'EACCES' || code === 'ENOTSUP') {
        context.skip()
        return null
      }
      throw error
    }
    return { root, outside, linkedDir }
  }

  it('rejects an existing file reached through a symlink outside the vault', async (context) => {
    const fixture = setupSymlinkFixture(context)
    if (!fixture) return
    try {
      await expect(
        resolveExistingPathWithinRoot(fixture.root, join(fixture.linkedDir, 'secret.md'))
      ).rejects.toThrow('Path outside vault')
      await expect(new VaultManager(fixture.root).readFile(join(fixture.linkedDir, 'secret.md')))
        .rejects.toThrow('Path outside vault')
    } finally {
      rmSync(fixture.root, { recursive: true, force: true })
      rmSync(fixture.outside, { recursive: true, force: true })
    }
  })

  it('rejects new writes through a symlinked parent outside the vault', async (context) => {
    const fixture = setupSymlinkFixture(context)
    if (!fixture) return
    const target = join(fixture.linkedDir, 'created.md')
    try {
      await expect(resolveWritablePathWithinRoot(fixture.root, target)).rejects.toThrow(
        'Path outside vault'
      )
      await expect(new VaultManager(fixture.root).writeFile(target, 'escape')).rejects.toThrow(
        'Path outside vault'
      )
      await expect(
        new VaultManager(fixture.root).deleteFile(join(fixture.linkedDir, 'secret.md'))
      ).rejects.toThrow('Path outside vault')
      await expect(
        new VaultManager(fixture.root).renameFile(join(fixture.linkedDir, 'secret.md'), 'moved.md')
      ).rejects.toThrow('Path outside vault')
      expect(existsSync(join(fixture.outside, 'created.md'))).toBe(false)
      expect(existsSync(join(fixture.outside, 'secret.md'))).toBe(true)
      expect(existsSync(join(fixture.outside, 'moved.md'))).toBe(false)
    } finally {
      rmSync(fixture.root, { recursive: true, force: true })
      rmSync(fixture.outside, { recursive: true, force: true })
    }
  })

  it('rejects writes through a dangling symlink target', async (context) => {
    const fixture = setupSymlinkFixture(context)
    if (!fixture) return
    const dangling = join(fixture.root, 'dangling.md')
    const outsideTarget = join(fixture.outside, 'future.md')
    try {
      symlinkSync(outsideTarget, dangling, 'file')
    } catch (error) {
      rmSync(fixture.root, { recursive: true, force: true })
      rmSync(fixture.outside, { recursive: true, force: true })
      const code = (error as NodeJS.ErrnoException).code
      if (code === 'EPERM' || code === 'EACCES' || code === 'ENOTSUP') {
        context.skip()
        return
      }
      throw error
    }
    try {
      await expect(new VaultManager(fixture.root).writeFile(dangling, 'escape')).rejects.toThrow()
      expect(existsSync(outsideTarget)).toBe(false)
    } finally {
      rmSync(fixture.root, { recursive: true, force: true })
      rmSync(fixture.outside, { recursive: true, force: true })
    }
  })
})
