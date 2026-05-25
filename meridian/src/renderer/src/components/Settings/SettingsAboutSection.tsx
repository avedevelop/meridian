import { useTranslation } from 'react-i18next'
import { useVaultStore } from '../../store/useVaultStore'

export function SettingsAboutSection() {
  const { t } = useTranslation()
  const vault = useVaultStore((s) => s.vault)

  const handleOpenLink = (url: string) => {
    if (window.vault?.openExternal) {
      window.vault.openExternal(url)
    } else {
      window.open(url, '_blank')
    }
  }

  return (
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
            <span style={{ color: '#eee' }}>v{(window as any).appInfo?.version ?? '1.0.0'}</span>
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
              onClick={() => handleOpenLink('https://github.com/avedevelop')}
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
            onClick={() => handleOpenLink('https://github.com/avedevelop/meridian/releases')}
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
  )
}
