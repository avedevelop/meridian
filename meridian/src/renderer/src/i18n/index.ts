import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

export async function initI18n(language: string): Promise<void> {
  // Bundled locales — loaded dynamically so new ones don't require code changes
  const bundled: Record<string, object> = {}
  const modules = import.meta.glob('./locales/*.json', { eager: true }) as Record<string, { default: object }>
  for (const [path, mod] of Object.entries(modules)) {
    const lang = path.replace('./locales/', '').replace('.json', '')
    bundled[lang] = mod.default
  }

  // User-installed locales from {userData}/locales/
  const userLocales = await loadUserLocales()

  const resources: Record<string, { translation: object }> = {}
  for (const [lang, msgs] of Object.entries({ ...bundled, ...userLocales })) {
    resources[lang] = { translation: msgs }
  }

  if (i18n.isInitialized) {
    await i18n.changeLanguage(language)
    return
  }

  await i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })
}

async function loadUserLocales(): Promise<Record<string, object>> {
  try {
    const files: { lang: string; content: object }[] = await (window.vault as any).listUserLocales?.() ?? []
    const result: Record<string, object> = {}
    for (const { lang, content } of files) result[lang] = content
    return result
  } catch {
    return {}
  }
}

export { i18n }
