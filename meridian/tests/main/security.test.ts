// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  canOpenPath,
  extensionOf,
  isLocalHostname,
  isPrivateAddress,
  isRiskyToOpen,
  isSafeGitRemote,
  isSameOrInside,
  isVaultPathAllowed,
  isWelcomeDestAllowed,
  normalizePath
} from '../../src/main/security'

describe('normalizePath / isSameOrInside', () => {
  it('rejects relative paths, empty input and NUL bytes', () => {
    expect(normalizePath('notes/a.md', 'linux')).toBeNull()
    expect(normalizePath('', 'linux')).toBeNull()
    expect(normalizePath('/a\0b', 'linux')).toBeNull()
    expect(normalizePath('..\\a', 'win32')).toBeNull()
  })

  it('is case-insensitive on Windows and macOS, case-sensitive on Linux', () => {
    expect(isSameOrInside('C:\\Vault', 'c:\\vault\\Notes\\A.md', 'win32')).toBe(true)
    expect(isSameOrInside('/Users/me/Vault', '/users/me/vault/a.md', 'darwin')).toBe(true)
    expect(isSameOrInside('/home/me/Vault', '/home/me/vault/a.md', 'linux')).toBe(false)
  })

  it('does not treat a sibling with the same prefix as inside', () => {
    expect(isSameOrInside('/home/me/vault', '/home/me/vault2/a.md', 'linux')).toBe(false)
    expect(isSameOrInside('C:\\Vault', 'C:\\Vault2\\a.md', 'win32')).toBe(false)
  })

  it('resolves .. segments before comparing', () => {
    expect(isSameOrInside('/home/me/vault', '/home/me/vault/../.ssh/id_rsa', 'linux')).toBe(false)
    expect(isSameOrInside('C:\\Vault', 'C:\\Vault\\..\\Windows\\system32', 'win32')).toBe(false)
    expect(isSameOrInside('/home/me/vault', '/home/me/vault/sub/../a.md', 'linux')).toBe(true)
  })

  it('handles the root and trailing separators', () => {
    expect(isSameOrInside('/', '/etc/passwd', 'linux')).toBe(true)
    expect(isSameOrInside('/home/me/vault/', '/home/me/vault', 'linux')).toBe(true)
  })
})

describe('isVaultPathAllowed', () => {
  const approved = ['/home/me/Notes', null, undefined, 'C:\\Vault']
  it('allows only previously approved vaults', () => {
    expect(isVaultPathAllowed('/home/me/Notes', approved, 'linux')).toBe(true)
    expect(isVaultPathAllowed('/home/me/Notes/', approved, 'linux')).toBe(true)
    expect(isVaultPathAllowed('c:\\vault', approved, 'win32')).toBe(true)
  })

  it('refuses everything else, including parents and children of approved vaults', () => {
    expect(isVaultPathAllowed('/home/me', approved, 'linux')).toBe(false)
    expect(isVaultPathAllowed('/home/me/Notes/sub', approved, 'linux')).toBe(false)
    expect(isVaultPathAllowed('/', approved, 'linux')).toBe(false)
    expect(isVaultPathAllowed('', approved, 'linux')).toBe(false)
    expect(isVaultPathAllowed('relative', approved, 'linux')).toBe(false)
  })
})

describe('executable detection', () => {
  it('knows the extension, ignoring trailing dots and spaces', () => {
    expect(extensionOf('/a/b/Note.MD')).toBe('md')
    expect(extensionOf('C:\\a\\run.bat. ')).toBe('bat')
    expect(extensionOf('.gitignore')).toBe('')
    expect(extensionOf('noext')).toBe('')
  })

  it.each([
    'x.exe',
    'x.BAT',
    'x.cmd',
    'x.ps1',
    'x.command',
    'x.app',
    'x.sh',
    'x.desktop',
    'x.lnk',
    'x.js',
    'x.jar',
    'noext',
    'x.bat.',
    'x.cmd '
  ])('treats %s as risky', (name) => expect(isRiskyToOpen(name)).toBe(true))

  it.each(['note.md', 'photo.png', 'doc.pdf', 'data.json', 'board.canvas', 'sketch.excalidraw'])(
    'treats %s as safe',
    (name) => expect(isRiskyToOpen(name)).toBe(false)
  )
})

describe('canOpenPath', () => {
  const ctx = {
    vaultRoot: '/home/me/vault',
    exactAllowed: ['/home/me/.config/Meridian'],
    isDirectory: false
  }

  it('opens the app config folder exactly', () => {
    expect(canOpenPath('/home/me/.config/Meridian', { ...ctx, isDirectory: true }, 'linux')).toBe(
      true
    )
    expect(canOpenPath('/home/me/.config/Meridian/secret.json', ctx, 'linux')).toBe(false)
  })

  it('opens documents and folders inside the vault', () => {
    expect(canOpenPath('/home/me/vault/a.md', ctx, 'linux')).toBe(true)
    expect(canOpenPath('/home/me/vault/img.png', ctx, 'linux')).toBe(true)
    expect(canOpenPath('/home/me/vault/sub', { ...ctx, isDirectory: true }, 'linux')).toBe(true)
  })

  it('refuses programs and extension-less files inside the vault', () => {
    expect(canOpenPath('/home/me/vault/run.sh', ctx, 'linux')).toBe(false)
    expect(canOpenPath('C:\\Vault\\x.bat', { ...ctx, vaultRoot: 'C:\\Vault' }, 'win32')).toBe(false)
    expect(canOpenPath('/home/me/vault/script', ctx, 'linux')).toBe(false)
  })

  it('refuses anything outside the vault, and everything when no vault is open', () => {
    expect(canOpenPath('/etc/passwd', ctx, 'linux')).toBe(false)
    expect(canOpenPath('/home/me/vault/../.ssh/config', ctx, 'linux')).toBe(false)
    expect(canOpenPath('/home/me/vault/a.md', { ...ctx, vaultRoot: null }, 'linux')).toBe(false)
  })
})

describe('isWelcomeDestAllowed', () => {
  const roots = { home: '/Users/me', documents: '/Users/me/Documents' }
  it('allows the two known folders directly inside Documents', () => {
    expect(isWelcomeDestAllowed('/Users/me/Documents/Meridian Welcome', roots, 'darwin')).toBe(true)
    expect(
      isWelcomeDestAllowed('/Users/me/Documents/Meridian Welcome (Windows)', roots, 'darwin')
    ).toBe(true)
  })

  it('follows a redirected Documents folder on Windows', () => {
    const win = { home: 'C:\\Users\\me', documents: 'D:\\OneDrive\\Documents' }
    expect(
      isWelcomeDestAllowed('D:\\OneDrive\\Documents\\Meridian Welcome (Windows)', win, 'win32')
    ).toBe(true)
    expect(
      isWelcomeDestAllowed('C:\\Users\\me\\Documents\\Meridian Welcome (Windows)', win, 'win32')
    ).toBe(true)
  })

  it('refuses any other folder: the handler deletes the destination first', () => {
    for (const bad of [
      '/Users/me',
      '/Users/me/Documents',
      '/Users/me/Documents/MyNotes',
      '/Users/me/Documents/Meridian Welcome/..',
      '/Users/me/Documents/Meridian Welcome/sub',
      '/',
      '',
      'Documents/Meridian Welcome'
    ]) {
      expect(isWelcomeDestAllowed(bad, roots, 'darwin')).toBe(false)
    }
  })
})

describe('isSafeGitRemote', () => {
  it.each([
    'https://github.com/me/notes.git',
    'https://user:token@gitlab.example.com/group/repo.git',
    'https://git.example.com:8443/me/repo',
    'ssh://git@github.com/me/notes.git',
    'ssh://git@host.example.com:2222/me/notes.git',
    'git@github.com:me/notes.git'
  ])('accepts %s', (url) => expect(isSafeGitRemote(url)).toBe(true))

  it.each([
    '--upload-pack=touch /tmp/x',
    '-oProxyCommand=evil',
    'ext::sh -c "touch /tmp/x"',
    'fd::17/foo',
    'file:///tmp/evil.git',
    '/tmp/evil.git',
    'C:\\evil.git',
    '../evil.git',
    'http://insecure.example.com/me/repo.git',
    'https://github.com/me/repo.git --mirror',
    'https://github.com/me/repo.git\nhttps://evil.example.com/x',
    'git@github.com:me/repo.git; rm -rf ~',
    'git@:me/repo',
    'https:///nohost/x',
    '',
    'x'.repeat(600)
  ])('refuses %j', (url) => expect(isSafeGitRemote(url)).toBe(false))

  it('refuses non-strings', () => {
    expect(isSafeGitRemote(undefined)).toBe(false)
    expect(isSafeGitRemote(42)).toBe(false)
    expect(isSafeGitRemote(['https://github.com/a/b'])).toBe(false)
  })
})

describe('isPrivateAddress', () => {
  it.each([
    '127.0.0.1',
    '127.8.8.8',
    '10.0.0.5',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '224.0.0.1',
    '255.255.255.255',
    '198.18.0.1',
    '::',
    '::1',
    'fc00::1',
    'fd12:3456::1',
    'fe80::1',
    'ff02::1',
    '::ffff:127.0.0.1',
    '::ffff:10.0.0.1',
    '::ffff:7f00:1',
    '64:ff9b::7f00:1',
    '2001:db8::1',
    'not-an-ip',
    '999.1.1.1'
  ])('treats %s as private', (ip) => expect(isPrivateAddress(ip)).toBe(true))

  it.each([
    '8.8.8.8',
    '1.1.1.1',
    '93.184.216.34',
    '172.15.0.1',
    '172.32.0.1',
    '192.169.0.1',
    '2606:4700:4700::1111',
    '::ffff:8.8.8.8',
    '64:ff9b::808:808'
  ])('treats %s as public', (ip) => expect(isPrivateAddress(ip)).toBe(false))
})

describe('isLocalHostname', () => {
  it.each([
    'localhost',
    'LOCALHOST',
    'app.localhost',
    'printer.local',
    'db.internal',
    'nas.lan',
    'router',
    'x.home.arpa',
    'intranet'
  ])('%s is local', (h) => expect(isLocalHostname(h)).toBe(true))
  it.each(['example.com', 'sub.example.co.uk', 'github.com.'])('%s is public', (h) =>
    expect(isLocalHostname(h)).toBe(false)
  )
})
