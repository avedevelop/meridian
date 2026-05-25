export type PlatformName = string | undefined

export function isMacPlatform(platform: PlatformName = globalThis.navigator?.platform): boolean {
  return /Mac|iPhone|iPad|iPod/i.test(platform ?? '')
}

export function shortcutModifierLabel(platform?: PlatformName): string {
  return isMacPlatform(platform) ? '⌘' : 'Ctrl'
}

export function shortcutShiftLabel(platform?: PlatformName): string {
  return isMacPlatform(platform) ? '⇧' : 'Shift'
}

export function shortcutAltLabel(platform?: PlatformName): string {
  return isMacPlatform(platform) ? '⌥' : 'Alt'
}

export function formatShortcut(keys: readonly string[], platform?: PlatformName): string {
  const modifier = shortcutModifierLabel(platform)
  const shift = shortcutShiftLabel(platform)
  const alt = shortcutAltLabel(platform)

  return keys
    .map((key) => {
      if (key === 'mod') return modifier
      if (key === 'shift') return shift
      if (key === 'alt') return alt
      return key
    })
    .join(isMacPlatform(platform) ? '' : '+')
}

export function shortcutKeyLabels(keys: readonly string[], platform?: PlatformName): string[] {
  const modifier = shortcutModifierLabel(platform)
  const shift = shortcutShiftLabel(platform)
  const alt = shortcutAltLabel(platform)

  return keys.map((key) => {
    if (key === 'mod') return modifier
    if (key === 'shift') return shift
    if (key === 'alt') return alt
    return key
  })
}

export function getWelcomeVaultPath(homeDir: string, platform?: PlatformName): string {
  const welcomeVaultName = isMacPlatform(platform)
    ? 'Meridian Welcome'
    : 'Meridian Welcome (Windows)'

  return `${homeDir}/Documents/${welcomeVaultName}`
}
