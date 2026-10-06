// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { execFileSync } from 'child_process'

const mocks = vi.hoisted(() => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>()
  return {
    handlers,
    paths: { userData: '', documents: '', home: '' },
    dialog: { showOpenDialog: vi.fn(), showSaveDialog: vi.fn() },
    shell: { openPath: vi.fn(async () => ''), showItemInFolder: vi.fn(), openExternal: vi.fn() }
  }
})

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, fn: (...args: unknown[]) => unknown) =>
      mocks.handlers.set(channel, fn),
    removeHandler: vi.fn(),
    on: vi.fn()
  },
  BrowserWindow: { getAllWindows: () => [], fromWebContents: () => null },
  dialog: mocks.dialog,
  shell: mocks.shell,
  app: {
    getPath: (name: 'userData' | 'documents' | 'home') => mocks.paths[name],
    getAppPath: () => '/app'
  }
}))

vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('os')>()
  return { ...actual, default: actual, homedir: () => mocks.paths.home }
})

import { IPC } from '../../src/shared/types'
import { registerIpcHandlers, stopVaultWatcher } from '../../src/main/ipc'

const call = <T = unknown>(channel: string, ...args: unknown[]): Promise<T> =>
  Promise.resolve(mocks.handlers.get(channel)!({}, ...args)) as Promise<T>

let root: string
let recent: Array<{ path: string; name: string }>
let lastVault: string | null
const settings = {
  get: () => ({ recentVaults: recent, lastVault, windowBounds: { width: 1, height: 1 } }),
  addRecentVault: vi.fn((path: string, name: string) => recent.unshift({ path, name })),
  setLastVault: vi.fn((p: string | null) => {
    lastVault = p
  }),
  setGithubToken: vi.fn()
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'meridian-ipc-'))
  mocks.paths.userData = join(root, 'userData')
  mocks.paths.home = join(root, 'home')
  mocks.paths.documents = join(root, 'home', 'Documents')
  for (const dir of [mocks.paths.userData, mocks.paths.documents])
    mkdirSync(dir, { recursive: true })
  registerIpcHandlers(settings as never)
})
afterAll(() => {
  stopVaultWatcher()
  rmSync(root, { recursive: true, force: true })
})
beforeEach(() => {
  recent = []
  lastVault = null
  mocks.shell.openPath.mockClear()
  settings.addRecentVault.mockClear()
  settings.setLastVault.mockClear()
})
afterEach(() => stopVaultWatcher())

const makeDir = (name: string): string => {
  const dir = join(root, name)
  mkdirSync(dir, { recursive: true })
  return dir
}

describe('openByPath', () => {
  it('refuses a folder the user never chose, such as the home folder', async () => {
    expect(await call(IPC.VAULT_OPEN_BY_PATH, mocks.paths.home)).toBeNull()
    expect(await call(IPC.VAULT_OPEN_BY_PATH, '/')).toBeNull()
    expect(settings.addRecentVault).not.toHaveBeenCalled()
  })

  it('refuses non-string input', async () => {
    expect(await call(IPC.VAULT_OPEN_BY_PATH, { path: '/' })).toBeNull()
    expect(await call(IPC.VAULT_OPEN_BY_PATH, undefined)).toBeNull()
  })

  it('opens a vault from the recent list', async () => {
    const vault = makeDir('recent-vault')
    recent = [{ path: vault, name: 'recent-vault' }]
    expect(await call(IPC.VAULT_OPEN_BY_PATH, vault)).toEqual({ path: vault, name: 'recent-vault' })
  })

  it('opens a vault picked in the dialog, and again by path later in the session', async () => {
    const vault = makeDir('picked-vault')
    mocks.dialog.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: [vault] })
    expect(await call(IPC.VAULT_OPEN_DIALOG)).toMatchObject({ path: vault })
    recent = [] // even if the recent list was cleared, this session's choice stays valid
    expect(await call(IPC.VAULT_OPEN_BY_PATH, vault)).toMatchObject({ path: vault })
  })

  it('cannot be used to climb out of an approved vault', async () => {
    const vault = makeDir('approved')
    recent = [{ path: vault, name: 'approved' }]
    expect(await call(IPC.VAULT_OPEN_BY_PATH, join(vault, '..'))).toBeNull()
    expect(await call(IPC.VAULT_OPEN_BY_PATH, join(vault, 'sub'))).toBeNull()
  })
})

describe('settings:set lastVault', () => {
  it('ignores a folder that is not a known vault', async () => {
    await call(IPC.SETTINGS_SET, 'lastVault', mocks.paths.home)
    expect(settings.setLastVault).not.toHaveBeenCalled()
  })

  it('accepts null and known vaults', async () => {
    const vault = makeDir('known')
    recent = [{ path: vault, name: 'known' }]
    await call(IPC.SETTINGS_SET, 'lastVault', vault)
    await call(IPC.SETTINGS_SET, 'lastVault', null)
    expect(settings.setLastVault).toHaveBeenCalledTimes(2)
  })
})

describe('openPath', () => {
  let vault: string
  beforeEach(async () => {
    vault = makeDir('open-vault')
    recent = [{ path: vault, name: 'open-vault' }]
    await call(IPC.VAULT_OPEN_BY_PATH, vault)
  })

  it('opens a note inside the vault and the app config folder', async () => {
    writeFileSync(join(vault, 'note.md'), '# hi')
    await call(IPC.OPEN_PATH, join(vault, 'note.md'))
    await call(IPC.OPEN_PATH, mocks.paths.userData)
    expect(mocks.shell.openPath).toHaveBeenCalledTimes(2)
  })

  it('refuses documents with active content, not only programs', async () => {
    for (const f of [
      'x.html',
      'x.svg',
      'x.docm',
      'x.chm',
      'x.jnlp',
      'x.webloc',
      'x.iso',
      'x.unknown'
    ]) {
      writeFileSync(join(vault, f), 'payload')
      expect(await call(IPC.OPEN_PATH, join(vault, f))).toBe(false)
    }
    expect(mocks.shell.openPath).not.toHaveBeenCalled()
  })

  it('reports whether the path was opened', async () => {
    writeFileSync(join(vault, 'ok.md'), '# ok')
    expect(await call(IPC.OPEN_PATH, join(vault, 'ok.md'))).toBe(true)
    expect(await call(IPC.OPEN_PATH, join(vault, 'missing.md'))).toBe(false)
    expect(await call(IPC.OPEN_PATH, 42)).toBe(false)
  })

  it('still opens the app config folder when the open vault has become unreachable', async () => {
    const gone = makeDir('vanishing-vault')
    recent = [{ path: gone, name: 'vanishing-vault' }]
    await call(IPC.VAULT_OPEN_BY_PATH, gone)
    rmSync(gone, { recursive: true, force: true }) // folder moved or drive unplugged
    expect(await call(IPC.OPEN_PATH, mocks.paths.userData)).toBe(true)
    expect(mocks.shell.openPath).toHaveBeenCalledTimes(1)
  })

  it('refuses a program written into the vault', async () => {
    writeFileSync(join(vault, 'run.bat'), 'calc')
    writeFileSync(join(vault, 'run.command'), 'calc')
    writeFileSync(join(vault, 'noext'), 'calc')
    for (const f of ['run.bat', 'run.command', 'noext']) await call(IPC.OPEN_PATH, join(vault, f))
    expect(mocks.shell.openPath).not.toHaveBeenCalled()
  })

  it('refuses files outside the vault', async () => {
    writeFileSync(join(root, 'outside.md'), 'x')
    await call(IPC.OPEN_PATH, join(root, 'outside.md'))
    await call(IPC.OPEN_PATH, mocks.paths.home)
    await call(IPC.OPEN_PATH, join(vault, '..', 'outside.md'))
    expect(mocks.shell.openPath).not.toHaveBeenCalled()
  })

  it('does not follow a symlink inside the vault to a file outside it', async () => {
    writeFileSync(join(root, 'target.md'), 'secret')
    try {
      symlinkSync(join(root, 'target.md'), join(vault, 'link.md'))
    } catch {
      return // symlinks need privileges on some Windows setups
    }
    await call(IPC.OPEN_PATH, join(vault, 'link.md'))
    expect(mocks.shell.openPath).not.toHaveBeenCalled()
  })

  it('ignores paths that do not exist', async () => {
    await call(IPC.OPEN_PATH, join(vault, 'missing.md'))
    expect(mocks.shell.openPath).not.toHaveBeenCalled()
  })
})

describe('welcomeDownload', () => {
  it('refuses any destination except the welcome-vault folder, and deletes nothing', async () => {
    const precious = makeDir('precious')
    writeFileSync(join(precious, 'important.md'), 'do not delete')
    for (const dest of [
      precious,
      mocks.paths.home,
      mocks.paths.documents,
      '/',
      join(mocks.paths.documents, 'My Notes')
    ]) {
      await expect(call(IPC.WELCOME_DOWNLOAD, dest, 'macos/en')).rejects.toThrow(
        /Invalid destination/
      )
    }
    expect(existsSync(join(precious, 'important.md'))).toBe(true)
  })
})

describe('gitSetRemote', () => {
  const git = (vault: string, ...args: string[]): string =>
    execFileSync('git', args, { cwd: vault, encoding: 'utf-8' }).trim()

  it('never lets an unsafe remote into the repository config, and still accepts a normal one', async () => {
    const vault = makeDir('git-vault')
    git(vault, 'init', '-q')
    recent = [{ path: vault, name: 'git-vault' }]
    await call(IPC.VAULT_OPEN_BY_PATH, vault)

    for (const url of ['ext::sh -c id', '/tmp/evil.git', 'file:///tmp/evil.git', '--mirror=push']) {
      expect(await call(IPC.GIT_SET_REMOTE, url)).toMatchObject({ success: false })
    }
    expect(git(vault, 'remote')).toBe('')

    expect(await call(IPC.GIT_SET_REMOTE, 'https://github.com/me/notes.git')).toEqual({
      success: true
    })
    expect(git(vault, 'remote', 'get-url', 'origin')).toBe('https://github.com/me/notes.git')

    // changing it later goes through the same check
    expect(await call(IPC.GIT_SET_REMOTE, 'ext::sh -c id')).toMatchObject({ success: false })
    expect(git(vault, 'remote', 'get-url', 'origin')).toBe('https://github.com/me/notes.git')
  })
})
