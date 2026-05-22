import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '../../store/useSettingsStore'
import { SettingCategory, SettingDefinition } from './settingsTypes'
import { SettingsGitHubSection } from './SettingsGitHubSection'
import { buildSettingsDefinitions } from './settingsDefinitions'
import { SettingsPluginsSection } from './SettingsPluginsSection'
import { SettingsHotkeysSection } from './SettingsHotkeysSection'
import { SettingsAboutSection } from './SettingsAboutSection'

interface SettingsContentProps {
  activeCategory: SettingCategory
  searchQuery: string
  isOpen: boolean
}

export function SettingsContent({ activeCategory, searchQuery, isOpen }: SettingsContentProps) {
  const { t } = useTranslation()
  const store = useSettingsStore()

  // Definitions for all settings for search and tab rendering
  const settingsDefinitions = useMemo<SettingDefinition[]>(
    () => buildSettingsDefinitions(t),
    [t]
  )

  // Filtered settings based on search query
  const filteredSettings = useMemo(() => {
    if (!searchQuery) return []
    const query = searchQuery.toLowerCase().trim()
    return settingsDefinitions.filter(
      (s) =>
        s.label.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.category.toLowerCase().includes(query)
    )
  }, [searchQuery, settingsDefinitions])

  return (
    <div
      style={{
        flex: 1,
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Scroll Container */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        {/* SEARCH RESULTS MODE */}
        {searchQuery ? (
          <div>
            <div style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
              {t('settings.searchResults')}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginBottom: 20 }}>
              {t('settings.searchResultsFor', { query: searchQuery })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {filteredSettings.length > 0 ? (
                filteredSettings.map((item) => (
                  <div key={item.id}>
                    <div
                      style={{
                        color: 'var(--text-secondary)',
                        fontSize: 9,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: 4
                      }}
                    >
                      {t('settings.nav.' + item.category)}
                    </div>
                    {item.render(store)}
                  </div>
                ))
              ) : (
                <div
                  style={{
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                    padding: '48px 0',
                    fontSize: 13
                  }}
                >
                  {t('settings.noResults')}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* CATEGORY TAB MODE */
          <div>
            {activeCategory === 'editor' && (
              <div>
                <h3
                  style={{
                    margin: '0 0 4px 0',
                    color: 'var(--text-primary)',
                    fontSize: 16,
                    fontWeight: 600
                  }}
                >
                  {t('settings.editor.title')}
                </h3>
                <p style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)', fontSize: 12 }}>
                  {t('settings.editor.description')}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {settingsDefinitions
                    .filter((s) => s.category === 'editor')
                    .map((s) => (
                      <div key={s.id}>{s.render(store)}</div>
                    ))}
                </div>
              </div>
            )}

            {activeCategory === 'files' && (
              <div>
                <h3
                  style={{
                    margin: '0 0 4px 0',
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 600
                  }}
                >
                  {t('settings.files.title')}
                </h3>
                <p style={{ margin: '0 0 20px 0', color: '#777', fontSize: 12 }}>
                  {t('settings.files.description')}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {settingsDefinitions
                    .filter((s) => s.category === 'files')
                    .map((s) => (
                      <div key={s.id}>{s.render(store)}</div>
                    ))}
                </div>
              </div>
            )}

            {activeCategory === 'appearance' && (
              <div>
                <h3
                  style={{
                    margin: '0 0 4px 0',
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 600
                  }}
                >
                  {t('settings.appearance.title')}
                </h3>
                <p style={{ margin: '0 0 20px 0', color: '#777', fontSize: 12 }}>
                  {t('settings.appearance.description')}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {settingsDefinitions
                    .filter((s) => s.category === 'appearance')
                    .map((s) => (
                      <div key={s.id}>{s.render(store)}</div>
                    ))}
                </div>
              </div>
            )}

            {activeCategory === 'canvas' && (
              <div>
                <h3
                  style={{
                    margin: '0 0 4px 0',
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 600
                  }}
                >
                  {t('settings.canvas.title')}
                </h3>
                <p style={{ margin: '0 0 20px 0', color: '#777', fontSize: 12 }}>
                  {t('settings.canvas.description')}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {settingsDefinitions
                    .filter((s) => s.category === 'canvas')
                    .map((s) => (
                      <div key={s.id}>{s.render(store)}</div>
                    ))}
                </div>
              </div>
            )}

            {activeCategory === 'plugins' && <SettingsPluginsSection />}

            {activeCategory === 'hotkeys' && <SettingsHotkeysSection />}

            {activeCategory === 'export' && (
              <div>
                <h3
                  style={{
                    margin: '0 0 4px 0',
                    color: 'var(--text-primary)',
                    fontSize: 16,
                    fontWeight: 600
                  }}
                >
                  {t('settings.export.title')}
                </h3>
                <p style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)', fontSize: 12 }}>
                  {t('settings.export.description')}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {settingsDefinitions
                    .filter((s) => s.category === 'export')
                    .map((s) => (
                      <div key={s.id}>{s.render(store)}</div>
                    ))}
                </div>
              </div>
            )}

            {activeCategory === 'sync' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                  </svg>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: 16, fontWeight: 600 }}>
                    {t('settings.sync.title')}
                  </h3>
                </div>
                <p style={{ margin: '0 0 24px 0', color: '#777', fontSize: 12 }}>
                  {t('settings.sync.description')}
                </p>
                <SettingsGitHubSection isOpen={isOpen} />
              </div>
            )}

            {activeCategory === 'about' && <SettingsAboutSection />}
          </div>
        )}
      </div>
    </div>
  )
}
