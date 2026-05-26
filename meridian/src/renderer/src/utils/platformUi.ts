export type PlatformName = string | undefined
export type ShortcutToken = 'mod' | 'shift' | 'alt' | string

function currentPlatform(): PlatformName {
  return (globalThis as any).window?.appInfo?.platform ?? globalThis.navigator?.platform
}

export function isMacPlatform(platform: PlatformName = currentPlatform()): boolean {
  return /darwin|Mac|iPhone|iPad|iPod/i.test(platform ?? '')
}

export function getPlatformFileManagerName(platform: PlatformName = currentPlatform()): string {
  return isMacPlatform(platform) ? 'Finder' : 'File Explorer'
}

export function getPlatformModifierKeys(
  tokens: readonly ShortcutToken[],
  platform: PlatformName = currentPlatform()
): string[] {
  const mac = isMacPlatform(platform)
  return tokens.map((token) => {
    const normalized = token.toLowerCase()
    if (normalized === 'mod') return mac ? '⌘' : 'Ctrl'
    if (normalized === 'shift') return mac ? '⇧' : 'Shift'
    if (normalized === 'alt') return mac ? '⌥' : 'Alt'
    return token.length === 1 ? token.toUpperCase() : token
  })
}

export function formatPlatformShortcut(
  shortcut: string,
  platform: PlatformName = currentPlatform()
): string {
  const keys = getPlatformModifierKeys(shortcut.split('+'), platform)
  return isMacPlatform(platform) ? keys.join('') : keys.join('+')
}

export function getPlatformInterpolation(platform: PlatformName = currentPlatform()) {
  return {
    mod: isMacPlatform(platform) ? '⌘' : 'Ctrl+',
    shift: isMacPlatform(platform) ? '⇧' : 'Shift+',
    alt: isMacPlatform(platform) ? '⌥' : 'Alt+',
    fileManager: getPlatformFileManagerName(platform)
  }
}

export function interpolatePlatformTokens(
  text: string,
  platform: PlatformName = currentPlatform()
): string {
  const values = getPlatformInterpolation(platform)
  return text.replace(
    /\{\{(mod|shift|alt|fileManager)\}\}/g,
    (_match, key: keyof typeof values) => values[key]
  )
}

export function dirnameForDisplay(filePath: string): string {
  const parts = filePath.split(/[/\\]/)
  parts.pop()
  return parts.join('/')
}
