import { useTranslation } from 'react-i18next'

export function ClipboardOnboarding({ onEnable }: { onEnable: () => void }): React.ReactElement {
  const { t } = useTranslation()
  return (
    <div style={{ padding: '28px 32px', textAlign: 'center' }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary, #ccc)' }}>
        {t('clipboard.onboard.title')}
      </div>
      <p
        style={{
          fontSize: 12.5,
          lineHeight: 1.55,
          margin: '10px 0 14px',
          color: 'var(--text-secondary, #888)'
        }}
      >
        {t('clipboard.onboard.body')}
      </p>
      <button
        onClick={onEnable}
        autoFocus
        style={{
          padding: '7px 16px',
          borderRadius: 6,
          border: '1px solid var(--accent-color, #7c6af7)',
          background: 'var(--accent-color, #7c6af7)',
          color: '#fff',
          fontSize: 13,
          cursor: 'pointer'
        }}
      >
        {t('clipboard.onboard.enable')}
      </button>
    </div>
  )
}
