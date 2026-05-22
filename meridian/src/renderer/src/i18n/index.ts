import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Bundled locales — loaded dynamically so new ones don't require code changes
const bundled: Record<string, object> = {}
const modules = import.meta.glob('./locales/*.json', { eager: true }) as Record<string, { default: object }>
for (const [path, mod] of Object.entries(modules)) {
  const lang = path.replace('./locales/', '').replace('.json', '')
  bundled[lang] = mod.default
}

const resources: Record<string, { translation: object }> = {}
for (const [lang, msgs] of Object.entries(bundled)) {
  resources[lang] = { translation: msgs }
}

// Synchronously initialize with bundled locales to avoid NO_I18NEXT_INSTANCE race condition
i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export async function initI18n(language: string): Promise<void> {
  // User-installed locales from {userData}/locales/
  const userLocales = await loadUserLocales()
  for (const [lang, msgs] of Object.entries(userLocales)) {
    i18n.addResourceBundle(lang, 'translation', msgs, true, true)
  }

  await i18n.changeLanguage(language)
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
