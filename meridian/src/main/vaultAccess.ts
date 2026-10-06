import { isVaultPathAllowed } from './security'

interface VaultConfig {
  recentVaults: ReadonlyArray<{ path: string }>
  lastVault: string | null
}

/**
 * Which folders may be opened as a vault. The renderer, including community plugins, must not be
 * able to re-root the vault to an arbitrary folder, so only folders the user chose are allowed:
 * the ones picked in a dialog or created as the welcome vault during this session, and the
 * persisted recent list (which only ever receives approved folders).
 */
export class VaultAccess {
  private readonly approved = new Set<string>()

  constructor(
    private readonly getConfig: () => VaultConfig,
    private readonly platform: NodeJS.Platform = process.platform
  ) {}

  approve(path: string): void {
    this.approved.add(path)
  }

  isKnown(candidate: unknown): boolean {
    if (typeof candidate !== 'string') return false
    const config = this.getConfig()
    return isVaultPathAllowed(
      candidate,
      [...this.approved, ...config.recentVaults.map((v) => v.path), config.lastVault],
      this.platform
    )
  }
}
