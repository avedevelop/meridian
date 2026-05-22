import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface SettingsGitHubSectionProps {
  isOpen: boolean
}

export function SettingsGitHubSection({ isOpen }: SettingsGitHubSectionProps) {
  const { t } = useTranslation()
  const [ghConnected, setGhConnected] = useState(false)
  const [ghUsername, setGhUsername] = useState('')
  const [ghUserCode, setGhUserCode] = useState('')
  const [ghConnecting, setGhConnecting] = useState(false)
  const [ghError, setGhError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      window.vault.githubStatus().then((s) => {
        setGhConnected(s.connected)
        setGhUsername(s.username)
      }).catch(() => {})
    }
  }, [isOpen])

  const handleGhConnect = async () => {
    setGhConnecting(true)
    setGhError(null)
    try {
      const res = await window.vault.githubDeviceCode()
      if (!res.success) {
        setGhError(res.error ?? t('github.error'))
        setGhConnecting(false)
        return
      }
      setGhUserCode(res.user_code ?? '')
      await window.vault.openExternal(res.verification_uri ?? 'https://github.com/login/device')
      const interval = res.interval ?? 5
      const poll = async (): Promise<void> => {
        const r = await window.vault.githubPollToken(res.device_code ?? '')
        if (r.success) {
          setGhConnected(true)
          setGhUsername(r.username ?? '')
          setGhUserCode('')
          setGhConnecting(false)
          return
        }
        if (r.pending) {
          await new Promise((x) => setTimeout(x, interval * 1000))
          return poll()
        }
        setGhError(r.error ?? t('github.error'))
        setGhConnecting(false)
      }
      await poll()
    } catch (e: any) {
      setGhError(e.message)
      setGhConnecting(false)
    }
  }

  const handleGhLogout = async () => {
    await window.vault.githubLogout()
    setGhConnected(false)
    setGhUsername('')
  }

  return (
    <div style={{ background: '#161616', border: '1px solid #252525', borderRadius: 10, padding: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{t('github.account')}</div>
      <div style={{ fontSize: 12, color: '#777', marginBottom: 16 }}>
        {t('github.accountDesc')}
      </div>
      {ghConnected ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#0d1117', borderRadius: 8, border: '1px solid #30363d' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#4ade80"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
            <div>
              <div style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>@{ghUsername}</div>
              <div style={{ fontSize: 11, color: '#4ade80' }}>{t('github.connected')}</div>
            </div>
          </div>
          <button onClick={handleGhLogout} style={{ padding: '6px 14px', borderRadius: 6, background: 'transparent', border: '1px solid #3a3a3a', color: '#aaa', fontSize: 12, cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#f87171'; e.currentTarget.style.color = '#f87171' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#3a3a3a'; e.currentTarget.style.color = '#aaa' }}
          >{t('github.signOut')}</button>
        </div>
      ) : ghUserCode ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: 12, color: '#aaa', marginBottom: 12 }}>{t('github.enterCodeAt')} <span style={{ color: 'var(--accent-color)' }}>github.com/login/device</span></div>
          <div style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 700, letterSpacing: 6, color: '#fff', background: '#0d1117', border: '1px solid #30363d', borderRadius: 8, padding: '12px 24px', display: 'inline-block', marginBottom: 12 }}>{ghUserCode}</div>
          <div style={{ fontSize: 11, color: '#666' }}>{t('github.waitingAuth')}</div>
        </div>
      ) : (
        <div>
          <button onClick={handleGhConnect} disabled={ghConnecting} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', borderRadius: 8, background: '#24292e', border: '1px solid #444', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
            {ghConnecting ? t('github.connecting') : t('github.connect')}
          </button>
          {ghError && <div style={{ marginTop: 10, fontSize: 12, color: '#f87171' }}>{ghError}</div>}
        </div>
      )}
    </div>
  )
}
