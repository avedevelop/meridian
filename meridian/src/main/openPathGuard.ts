import { realpath, stat } from 'fs/promises'
import { canOpenPath } from './security'

export interface OpenPathDeps {
  /** Root of the vault that is currently open, if any. */
  vaultRoot: () => string | null
  /** The app's own folder, which may be opened as is. */
  userDataDir: string
  open: (path: string) => Promise<unknown>
  platform?: NodeJS.Platform
}

/**
 * Open a path with the system's default app, but only if it is the app's own folder or a safe
 * document inside the current vault. Opening a file can run it, and a plugin can put any file in
 * the vault. Symlinks are resolved first. Returns whether the path was opened.
 */
export async function openIfAllowed(filePath: unknown, deps: OpenPathDeps): Promise<boolean> {
  if (typeof filePath !== 'string') return false
  const platform = deps.platform ?? process.platform
  try {
    const real = await realpath(filePath)
    const info = await stat(real)
    const ownFolder = await realpath(deps.userDataDir)

    // The vault root is only resolved when it is needed: an unreachable vault (moved folder,
    // unplugged drive) must not stop the app's own folder from opening.
    const exact = canOpenPath(
      real,
      { vaultRoot: null, exactAllowed: [ownFolder], isDirectory: info.isDirectory() },
      platform
    )
    let allowed = exact
    if (!allowed) {
      const root = deps.vaultRoot()
      const vaultRoot = root ? await realpath(root).catch(() => null) : null
      allowed = canOpenPath(
        real,
        { vaultRoot, exactAllowed: [], isDirectory: info.isDirectory() },
        platform
      )
    }
    if (!allowed) {
      console.warn('[IPC] Refused to open a path outside the vault or app folder:', filePath)
      return false
    }
    await deps.open(real)
    return true
  } catch (e) {
    console.warn('[IPC] openPath failed:', e)
    return false
  }
}
