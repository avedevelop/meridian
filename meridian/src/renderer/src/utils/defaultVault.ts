export type PlatformName = string | undefined

export function isMacPlatform(platform: PlatformName = globalThis.navigator?.platform): boolean {
  return /Mac|iPhone|iPad|iPod/i.test(platform ?? '')
}

export function getWelcomeVaultPath(homeDir: string, platform?: PlatformName): string {
  const vaultName = isMacPlatform(platform) ? 'Meridian Welcome' : 'Meridian Welcome (Windows)'
  return `${homeDir}/Documents/${vaultName}`
}
