import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '../../store/useSettingsStore'

export function SettingsPluginsSection() {
  const { t } = useTranslation()
  const store = useSettingsStore()

  const handleOpenLink = (url: string) => {
    if (window.vault?.openExternal) {
      window.vault.openExternal(url)
    } else {
      window.open(url, '_blank')
    }
  }

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
  )
}
