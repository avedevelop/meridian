import { useTranslation } from 'react-i18next'
import { FileIcon } from '../Icons'

interface EmptyPaneProps {
  onActivate: () => void
}

export function EmptyPane({ onActivate }: EmptyPaneProps) {
  const { t } = useTranslation()

  return (
    <div
      onClick={onActivate}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-tertiary)',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ textAlign: 'center', userSelect: 'none' }}>
        <div style={{ marginBottom: 12, opacity: 0.2 }}>
          <FileIcon size={40} color="var(--text-primary)" />
        </div>
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: 14,
            margin: '0 0 6px',
            fontWeight: 500
          }}
        >
          {t('editor.noFileOpen')}
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: 0, opacity: 0.6 }}>
          {t('editor.openFileInstructions')}
        </p>
      </div>
    </div>
  )
}
