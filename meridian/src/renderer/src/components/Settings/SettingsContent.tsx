import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useVaultStore } from '../../store/useVaultStore'
import { SettingCategory, SettingDefinition } from './settingsTypes'
import { SettingsGitHubSection } from './SettingsGitHubSection'
import { buildSettingsDefinitions } from './settingsDefinitions'

interface SettingsContentProps {
  activeCategory: SettingCategory
  searchQuery: string
  isOpen: boolean
}

export function SettingsContent({ activeCategory, searchQuery, isOpen }: SettingsContentProps) {
  const { t } = useTranslation()
  const store = useSettingsStore()
  const vault = useVaultStore((s) => s.vault)

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

  // Custom link opener using window.vault.openExternal
  const handleOpenLink = (url: string) => {
    if (window.vault?.openExternal) {
      window.vault.openExternal(url)
    } else {
      window.open(url, '_blank')
    }
  }

  // Plugins list
  const pluginsList = [
    {
      id: 'dailyNotes',
      name: 'Daily Notes',
      desc: 'Create and open a daily note based on current date automatically.',
      author: 'ave'
    },
    {
      id: 'wordCounter',
      name: 'Word Counter',
      desc: 'Count and display the total number of words in the status bar.',
      author: 'ave'
    },
    {
      id: 'slashCommands',
      name: 'Slash Commands',
      desc: 'Trigger formatting actions and note insertions using / key triggers.',
      author: 'ave'
    },
    {
      id: 'tagsPanel',
      name: 'Tag Index Panel',
      desc: 'Show an index of all hashtag elements parsed in note contents.',
      author: 'ave'
    },
    {
      id: 'backlinksPanel',
      name: 'Backlinks Explorer',
      desc: 'List notes referencing the current active tab note.',
      author: 'ave'
    },
    {
      id: 'tocPanel',
      name: 'Table of Contents',
      desc: 'Generate dynamic layout heading navigators for markdown documents.',
      author: 'ave'
    },
    {
      id: 'gitBackup',
      name: 'Git Autocommit Backups',
      desc: 'Periodically git commit changes inside the vault automatically.',
      author: 'ave'
    },
    {
      id: 'excalidraw',
      name: 'Excalidraw Sketchpad',
      desc: 'Integrate dynamic hand-drawn diagrams inside notes.',
      author: 'ave'
    },
    {
      id: 'vimMode',
      name: 'Vim Mode',
      desc: 'Enable Vim keybindings in the markdown editor (Normal, Insert, Visual modes).',
      author: 'ave'
    }
  ] as const

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

            {activeCategory === 'plugins' && (
              <div>
                <h3
                  style={{
                    margin: '0 0 4px 0',
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 600
                  }}
                >
                  {t('settings.plugins.title')}
                </h3>
                <p style={{ margin: '0 0 20px 0', color: '#777', fontSize: 12 }}>
                  {t('settings.plugins.description')}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {pluginsList.map((p) => {
                    const isEnabled = store.pluginsEnabled[p.id]
                    return (
                      <div
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '14px 18px',
                          background: '#161616',
                          borderRadius: 8,
                          border: '1px solid #252525'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 3,
                            paddingRight: 16
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: '#eee', fontSize: 13, fontWeight: 600 }}>
                              {t('settings.plugins.' + p.id + '.name')}
                            </span>
                            <span
                              style={{
                                fontSize: 9,
                                color: '#555',
                                background: '#222',
                                padding: '1px 5px',
                                borderRadius: 4
                              }}
                            >
                              v{(window as any).appInfo?.version ?? '1.0.0'}
                            </span>
                          </div>
                          <span style={{ color: '#777', fontSize: 11, lineHeight: '1.4' }}>
                            {t('settings.plugins.' + p.id + '.desc')}
                          </span>
                          <div
                            style={{
                              display: 'flex',
                              gap: 4,
                              fontSize: 10,
                              color: '#555',
                              marginTop: 4
                            }}
                          >
                            <span>{t('settings.plugins.by')}</span>
                            <span
                              onClick={() => handleOpenLink('https://github.com/bvsmma')}
                              style={{
                                color: '#7c6af7',
                                cursor: 'pointer',
                                textDecoration: 'underline'
                              }}
                            >
                              {p.author}
                            </span>
                          </div>
                        </div>
                        <div
                          onClick={() => store.togglePlugin(p.id)}
                          style={{
                            width: 38,
                            height: 20,
                            borderRadius: 10,
                            background: isEnabled ? '#7c6af7' : '#333',
                            position: 'relative',
                            cursor: 'pointer',
                            transition: 'background 0.2s ease',
                            flexShrink: 0
                          }}
                        >
                          <div
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: '50%',
                              background: '#fff',
                              position: 'absolute',
                              top: 3,
                              left: isEnabled ? 21 : 3,
                              transition: 'left 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {activeCategory === 'hotkeys' && (
              <div>
                <h3
                  style={{
                    margin: '0 0 4px 0',
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 600
                  }}
                >
                  {t('settings.hotkeys.title')}
                </h3>
                <p style={{ margin: '0 0 20px 0', color: '#777', fontSize: 12 }}>
                  {t('settings.hotkeys.description')}
                </p>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    background: '#252525',
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: '1px solid #252525'
                  }}
                >
                  {[
                    { group: 'general' },
                    { actionId: 'commandPalette', keys: ['⌘', 'K'] },
                    { actionId: 'settings', keys: ['⌘', ','] },
                    { actionId: 'openVault', keys: ['⌘', 'O'] },
                    { group: 'files' },
                    { actionId: 'newNote', keys: ['⌘', 'N'] },
                    { actionId: 'newDailyNote', keys: ['⌘', 'D'] },
                    { actionId: 'save', keys: ['⌘', 'S'] },
                    { actionId: 'exportHtml', keys: ['⌘', 'E'] },
                    { actionId: 'closeTab', keys: ['⌘', 'W'] },
                    { group: 'view' },
                    { actionId: 'graphView', keys: ['⌘', '⇧', 'G'] },
                    { group: 'sketchpad' },
                    { actionId: 'undoStroke', keys: ['⌘', 'Z'] },
                    { actionId: 'redoStroke', keys: ['⌘', '⇧', 'Z'] }
                  ].map((hk, idx) => {
                    if ('group' in hk) {
                      return (
                        <div
                          key={idx}
                          style={{
                            padding: '8px 16px 4px',
                            background: '#161616',
                            color: '#555',
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            borderTop: idx > 0 ? '1px solid #252525' : 'none'
                          }}
                        >
                          {t('settings.hotkeys.group.' + hk.group)}
                        </div>
                      )
                    }
                    return (
                      <div
                        key={hk.actionId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 16px',
                          background: '#161616'
                        }}
                      >
                        <span style={{ color: '#ddd', fontSize: 13 }}>
                          {t('settings.hotkeys.action.' + hk.actionId)}
                        </span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {hk.keys.map((k, i) => (
                            <kbd
                              key={i}
                              style={{
                                background: '#222',
                                border: '1px solid #3c3c3c',
                                borderRadius: 4,
                                color: '#aaa',
                                fontSize: 11,
                                padding: '2px 6px',
                                fontFamily: 'monospace',
                                boxShadow: '0 2px 0 #111'
                              }}
                            >
                              {k}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

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

            {activeCategory === 'about' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                  <h3
                    style={{
                      margin: '0 0 4px 0',
                      color: '#fff',
                      fontSize: 16,
                      fontWeight: 600
                    }}
                  >
                    {t('settings.about.activeVault')}
                  </h3>
                  <p style={{ margin: '0 0 16px 0', color: '#777', fontSize: 12 }}>
                    {t('settings.about.activeVaultDesc')}
                  </p>
                  <div
                    style={{
                      padding: '16px',
                      background: '#161616',
                      borderRadius: 8,
                      border: '1px solid #252525',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      fontSize: 12
                    }}
                  >
                    <div style={{ display: 'flex' }}>
                      <span style={{ color: '#555', width: 100, fontWeight: 600 }}>
                        {t('settings.about.vaultName')}
                      </span>
                      <span style={{ color: '#eee', fontFamily: 'monospace' }}>
                        {vault?.name || t('settings.about.noVault')}
                      </span>
                    </div>
                    <div style={{ display: 'flex' }}>
                      <span style={{ color: '#555', width: 100, fontWeight: 600 }}>
                        {t('settings.about.vaultPath')}
                      </span>
                      <span
                        style={{
                          color: '#aaa',
                          fontFamily: 'monospace',
                          wordBreak: 'break-all'
                        }}
                      >
                        {vault?.path || t('settings.about.noPath')}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3
                    style={{
                      margin: '0 0 4px 0',
                      color: '#fff',
                      fontSize: 16,
                      fontWeight: 600
                    }}
                  >
                    {t('settings.about.title')}
                  </h3>
                  <p style={{ margin: '0 0 16px 0', color: '#777', fontSize: 12 }}>
                    {t('settings.about.titleDesc')}
                  </p>
                  <div
                    style={{
                      padding: '16px',
                      background: '#161616',
                      borderRadius: 8,
                      border: '1px solid #252525',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      fontSize: 12
                    }}
                  >
                    <div style={{ display: 'flex' }}>
                      <span style={{ color: '#555', width: 100, fontWeight: 600 }}>
                        {t('settings.about.version')}
                      </span>
                      <span style={{ color: '#eee' }}>
                        v{(window as any).appInfo?.version ?? '1.0.0'}
                      </span>
                    </div>
                    <div style={{ display: 'flex' }}>
                      <span style={{ color: '#555', width: 100, fontWeight: 600 }}>
                        {t('settings.about.engine')}
                      </span>
                      <span style={{ color: '#aaa' }}>Electron / React / TypeScript</span>
                    </div>
                    <div style={{ display: 'flex' }}>
                      <span style={{ color: '#555', width: 100, fontWeight: 600 }}>
                        {t('settings.about.developer')}
                      </span>
                      <span
                        onClick={() => handleOpenLink('https://github.com/bvsmma')}
                        style={{
                          color: '#7c6af7',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        ave
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: 16, fontWeight: 600 }}>
                    {t('settings.about.actions')}
                  </h3>
                  <p style={{ margin: '0 0 16px 0', color: '#777', fontSize: 12 }}>
                    {t('settings.about.actionsDesc')}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button
                      onClick={() => handleOpenLink('https://github.com/bvsmma/meridian/releases')}
                      style={{
                        padding: '10px 16px',
                        background: '#161616',
                        border: '1px solid #252525',
                        borderRadius: 8,
                        color: '#eee',
                        fontSize: 13,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      {t('settings.about.checkUpdates')}
                    </button>
                    <button
                      onClick={async () => {
                        const vault = window.vault as any
                        if (vault?.getConfigPath) {
                          const p = await vault.getConfigPath()
                          if (p) vault.openPath(p)
                        }
                      }}
                      style={{
                        padding: '10px 16px',
                        background: '#161616',
                        border: '1px solid #252525',
                        borderRadius: 8,
                        color: '#eee',
                        fontSize: 13,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      {t('settings.about.openConfig')}
                    </button>
                    <button
                      onClick={() => {
                        const raw = localStorage.getItem('meridian-settings') ?? '{}'
                        const blob = new Blob([raw], { type: 'application/json' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = 'meridian-settings.json'
                        a.click()
                        URL.revokeObjectURL(url)
                      }}
                      style={{
                        padding: '10px 16px',
                        background: '#161616',
                        border: '1px solid #252525',
                        borderRadius: 8,
                        color: '#eee',
                        fontSize: 13,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      {t('settings.about.exportSettings')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
