import React from 'react'
import { useTranslation } from 'react-i18next'

export interface SetupWizardProps {
  isRepo: boolean
  ghConnected: boolean
  ghUsername: string
  hasRemote: boolean
  onInit: () => void
  onSetRemote: (url: string) => void
  loading: boolean
  error: string | null
}

export function SetupWizard({
  isRepo,
  ghConnected,
  ghUsername,
  hasRemote,
  onInit,
  onSetRemote,
  loading,
  error
}: SetupWizardProps) {
  const { t } = useTranslation()
  const [remoteUrl, setRemoteUrl] = React.useState('')

  const steps = [
    { done: isRepo, label: t('gitPanel.step1'), desc: t('gitPanel.step1Desc') },
    { done: ghConnected, label: t('gitPanel.step2'), desc: t('gitPanel.step2Desc') },
    { done: hasRemote, label: t('gitPanel.step3'), desc: t('gitPanel.step3Desc') }
  ]
  const currentStep = steps.findIndex((s) => !s.done)

  return (
    <div
      style={{
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        height: '100%',
        overflowY: 'auto'
      }}
    >
      <div>
        <div
          style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}
        >
          ☁️ {t('gitPanel.setupTitle')}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {t('gitPanel.setupDesc')}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map((step, i) => {
          const isActive = i === currentStep
          const isDone = step.done
          return (
            <div
              key={step.label}
              style={{
                display: 'flex',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 8,
                background: isActive ? 'var(--bg-surface)' : 'transparent',
                border: isActive ? '1px solid var(--border-color)' : '1px solid transparent',
                opacity: !isDone && !isActive ? 0.4 : 1
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: isDone
                    ? '#4ade80'
                    : isActive
                      ? 'var(--accent-color)'
                      : 'var(--bg-surface)',
                  color: isDone || isActive ? '#fff' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700
                }}
              >
                {isDone ? '✓' : i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {step.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
                  {step.desc}
                </div>

                {isActive && i === 0 && (
                  <button
                    onClick={onInit}
                    disabled={loading}
                    style={{
                      marginTop: 8,
                      padding: '6px 14px',
                      borderRadius: 6,
                      background: 'var(--accent-color)',
                      color: '#fff',
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    {loading ? t('common.loading') : t('gitPanel.initRepo')}
                  </button>
                )}

                {isActive && i === 1 && (
                  <button
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent('meridian:open-settings', { detail: 'sync' })
                      )
                    }}
                    style={{
                      marginTop: 8,
                      padding: '6px 14px',
                      borderRadius: 6,
                      background: '#24292e',
                      color: '#fff',
                      border: '1px solid #444',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                    </svg>
                    {t('gitPanel.connectGitHub')}
                  </button>
                )}

                {isActive && i === 2 && (
                  <div style={{ marginTop: 8 }}>
                    {ghUsername && (
                      <div style={{ fontSize: 11, color: '#4ade80', marginBottom: 6 }}>
                        {t('gitPanel.usernameStatus', { username: ghUsername })}
                      </div>
                    )}
                    <input
                      value={remoteUrl}
                      onChange={(e) => setRemoteUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && remoteUrl.trim()) onSetRemote(remoteUrl.trim())
                      }}
                      placeholder={t('gitPanel.repoUrlPlaceholder')}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: 5,
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        outline: 'none',
                        color: 'var(--text-primary)',
                        fontSize: 11,
                        boxSizing: 'border-box' as const,
                        marginBottom: 6
                      }}
                    />
                    <button
                      onClick={() => onSetRemote(remoteUrl.trim())}
                      disabled={!remoteUrl.trim()}
                      style={{
                        width: '100%',
                        padding: '6px 0',
                        borderRadius: 5,
                        background: 'var(--accent-color)',
                        color: '#fff',
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: remoteUrl.trim() ? 'pointer' : 'not-allowed',
                        opacity: remoteUrl.trim() ? 1 : 0.5
                      }}
                    >
                      {t('gitPanel.connectRepo')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <div
          style={{
            fontSize: 11,
            color: '#f87171',
            padding: '6px 10px',
            background: 'rgba(248,113,113,0.08)',
            borderRadius: 6
          }}
        >
          ⚠ {error}
        </div>
      )}
    </div>
  )
}
