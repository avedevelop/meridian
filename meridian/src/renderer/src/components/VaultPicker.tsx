import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useVaultBridge } from '../hooks/useVaultBridge'
import type { VaultConfig } from '@shared/types'

const WELCOME_DEST = `${(window as any).__homeDir || ''}/Documents/Meridian Welcome`
const WELCOME_REPO = 'https://github.com/bvsmma/meridian-welcome'

export function VaultPicker() {
  const { t } = useTranslation()
  const { openVault, openVaultByPath, createNewVault } = useVaultBridge()
  const [recents, setRecents] = useState<VaultConfig[]>([])
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  useEffect(() => {
    window.settings
      .get()
      .then((config) => setRecents(config.recentVaults ?? []))
      .catch(() => setRecents([]))
  }, [])

  const handleOpenWelcome = async () => {
    setDownloading(true)
    setDownloadError(null)
    try {
      const dest = await (window.vault as any).downloadWelcomeVault(WELCOME_DEST)
      await openVaultByPath(dest)
    } catch (e: any) {
      setDownloadError(e.message || t('vaultPicker.downloadError'))
    } finally {
      setDownloading(false)
    }
  }

  const isFirstStart = recents.length === 0

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: 24,
        background: '#1a1a1a',
        color: '#ccc'
      }}
    >
      <div style={{ fontSize: 48 }}>📓</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: 0 }}>{t('vaultPicker.title')}</h1>
      <p style={{ color: '#666', margin: 0 }}>{t('vaultPicker.tagline')}</p>

      {/* Welcome vault — prominent on first start */}
      {isFirstStart && (
        <div
          style={{
            background: 'rgba(124,106,247,0.08)',
            border: '1px solid rgba(124,106,247,0.3)',
            borderRadius: 12,
            padding: '20px 28px',
            width: 380,
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: 13, color: '#7c6af7', fontWeight: 600, marginBottom: 6 }}>
            {t('vaultPicker.welcomeHeading')}
          </div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 16, lineHeight: '1.5' }}>
            {t('vaultPicker.welcomeDesc')}
          </div>
          <button
            onClick={handleOpenWelcome}
            disabled={downloading}
            style={{
              width: '100%',
              padding: '12px 0',
              borderRadius: 8,
              background: downloading ? '#333' : '#7c6af7',
              color: '#fff',
              border: 'none',
              fontSize: 14,
              cursor: downloading ? 'default' : 'pointer',
              fontWeight: 600,
              transition: 'opacity 0.15s'
            }}
          >
            {downloading ? t('common.downloading') : t('vaultPicker.openSampleVault')}
          </button>
          {downloadError && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#f87171' }}>
              {downloadError} —{' '}
              <span
                onClick={() => (window.vault as any).openExternal(WELCOME_REPO)}
                style={{ textDecoration: 'underline', cursor: 'pointer' }}
              >
                {t('vaultPicker.openOnGitHub')}
              </span>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: isFirstStart ? 0 : 8 }}>
        <button
          onClick={createNewVault}
          style={{
            padding: '12px 24px',
            borderRadius: 8,
            background: 'transparent',
            color: '#7c6af7',
            border: '2px solid #7c6af7',
            fontSize: 15,
            cursor: 'pointer',
            fontWeight: 600
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(124,106,247,0.1)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          {t('vaultPicker.newVault')}
        </button>
        <button
          onClick={openVault}
          style={{
            padding: '12px 24px',
            borderRadius: 8,
            background: '#7c6af7',
            color: '#fff',
            border: 'none',
            fontSize: 15,
            cursor: 'pointer',
            fontWeight: 600
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          {t('vaultPicker.openVault')}
        </button>
      </div>

      {recents.length > 0 && (
        <div style={{ width: 380 }}>
          <div
            style={{
              color: '#444',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 10,
              textAlign: 'center'
            }}
          >
            {t('vaultPicker.recent')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {recents.map((vault) => (
              <button
                key={vault.path}
                onClick={() => openVaultByPath(vault.path)}
                style={{
                  background: '#222',
                  border: '1px solid #2a2a2a',
                  borderRadius: 8,
                  padding: '10px 16px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  width: '100%'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#7c6af7')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2a2a2a')}
              >
                <span style={{ color: '#ccc', fontSize: 14, fontWeight: 600 }}>{vault.name}</span>
                <span style={{ color: '#555', fontSize: 11 }}>{vault.path}</span>
              </button>
            ))}
          </div>

          {/* Reset welcome vault — always accessible */}
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <button
              onClick={handleOpenWelcome}
              disabled={downloading}
              style={{
                background: 'none',
                border: 'none',
                color: downloading ? '#555' : '#555',
                fontSize: 12,
                cursor: downloading ? 'default' : 'pointer',
                textDecoration: 'underline'
              }}
              onMouseEnter={(e) => { if (!downloading) e.currentTarget.style.color = '#888' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#555' }}
            >
              {downloading ? t('common.downloading') : t('vaultPicker.resetSampleVault')}
            </button>
          </div>
        </div>
      )}

      <p style={{ color: '#444', fontSize: 13, marginTop: 4 }}>
        {t('vaultPicker.vaultHint')}
      </p>
    </div>
  )
}
