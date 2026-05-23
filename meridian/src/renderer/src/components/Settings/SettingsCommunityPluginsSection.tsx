import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useVaultStore } from '../../store/useVaultStore'

export function SettingsCommunityPluginsSection() {
  const { t } = useTranslation()
  const store = useSettingsStore()
  const vault = useVaultStore((s) => s.vault)
  const [plugins, setPlugins] = useState<any[]>([])

  useEffect(() => {
    let active = true
    async function fetchPlugins() {
      try {
        const list = await window.vault.listPlugins()
        if (active) {
          setPlugins(list)
        }
      } catch (err) {
        console.error('Failed to list plugins:', err)
      }
    }
    fetchPlugins()
    return () => {
      active = false
    }
  }, [])

  const handleOpenFolder = () => {
    if (!vault) return
    const path = `${vault.path.replace(/[/\\]$/, '')}/.meridian/plugins`
    window.vault.openPath(path)
  }

  const handleOpenLink = (url: string) => {
    if (window.vault?.openExternal) {
      window.vault.openExternal(url)
    } else {
      window.open(url, '_blank')
    }
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h3
            style={{
              margin: 0,
              color: '#fff',
              fontSize: 16,
              fontWeight: 600
            }}
          >
            {t('settings.plugins.community.title')}
          </h3>
          <p style={{ margin: 0, color: '#777', fontSize: 12 }}>
            {t('settings.plugins.community.description')}
          </p>
        </div>
        <button
          onClick={handleOpenFolder}
          style={{
            background: '#222',
            color: '#eee',
            border: '1px solid #333',
            padding: '6px 12px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.2s ease, border-color 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#2a2a2a'
            e.currentTarget.style.borderColor = '#444'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#222'
            e.currentTarget.style.borderColor = '#333'
          }}
        >
          📁 {t('settings.plugins.community.openFolder')}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
        {plugins.length > 0 ? (
          plugins.map((p) => {
            const isEnabled = !!store.pluginsEnabled[p.id]
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
                    <span style={{ color: '#eee', fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                    <span
                      style={{
                        fontSize: 9,
                        color: '#888',
                        background: '#222',
                        padding: '1px 5px',
                        borderRadius: 4
                      }}
                    >
                      v{p.version}
                    </span>
                    <span
                      style={{
                        fontSize: 8,
                        color: '#666',
                        border: '1px solid #333',
                        padding: '0 4px',
                        borderRadius: 3,
                        textTransform: 'uppercase'
                      }}
                    >
                      {p.id}
                    </span>
                  </div>
                  <span style={{ color: '#777', fontSize: 11, lineHeight: '1.4' }}>
                    {p.description}
                  </span>
                  {p.author && (
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
                      <span style={{ color: '#aaa' }}>{p.author}</span>
                    </div>
                  )}
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
          })
        ) : (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              color: '#555',
              fontSize: 12,
              background: '#111',
              borderRadius: 8,
              border: '1px dashed #222'
            }}
          >
            {t('settings.plugins.community.noPlugins')}
          </div>
        )}
      </div>

      <div style={{ marginTop: 24, padding: '12px 0', borderTop: '1px solid #222' }}>
        <span
          onClick={() =>
            handleOpenLink(
              'https://github.com/bvsmma/meridian/blob/main/meridian/PLUGIN_DEVELOPMENT.md'
            )
          }
          style={{
            fontSize: 11,
            color: '#7c6af7',
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          ✦ {t('settings.plugins.community.developerLink')}
        </span>
      </div>
    </div>
  )
}
