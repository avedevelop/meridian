export type PlatformName = string | undefined
export type WelcomePlatform = 'macos' | 'windows'
export type WelcomeLanguage = 'en' | 'ru'

export function isMacPlatform(platform: PlatformName = globalThis.navigator?.platform): boolean {
  return /darwin|Mac|iPhone|iPad|iPod/i.test(platform ?? '')
}

export function getWelcomePlatform(platform: PlatformName = globalThis.navigator?.platform): WelcomePlatform {
  return isMacPlatform(platform) ? 'macos' : 'windows'
}

export function getWelcomeLanguage(language?: string): WelcomeLanguage {
  return /^ru\b/i.test(language ?? '') ? 'ru' : 'en'
}

export function getWelcomeVaultPath(homeDir: string, platform?: PlatformName): string {
  const vaultName = isMacPlatform(platform) ? 'Meridian Welcome' : 'Meridian Welcome (Windows)'
  return `${homeDir}/Documents/${vaultName}`
}

export function getWelcomeVaultSourcePath(platform?: PlatformName, language?: string): string {
  return `${getWelcomePlatform(platform)}/${getWelcomeLanguage(language)}`
}
