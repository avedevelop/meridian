import { useTranslation } from 'react-i18next'
import type { GroupMode } from './graphGroups'

interface Props {
  groupMode: GroupMode
  setGroupMode: (v: GroupMode) => void
}

const OPTIONS: Array<{ mode: GroupMode; labelKey: string }> = [
  { mode: 'type', labelKey: 'graph.groupByType' },
  { mode: 'folder', labelKey: 'graph.groupByFolder' },
  { mode: 'tag', labelKey: 'graph.groupByTag' }
]

export function GraphSidebarGrouping({ groupMode, setGroupMode }: Props) {
  const { t } = useTranslation()
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        paddingTop: 14
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--text-secondary)',
          opacity: 0.6,
          letterSpacing: '0.04em'
        }}
      >
        {t('graph.groupBy')}
      </span>
      <div style={{ display: 'flex', gap: 6 }}>
        {OPTIONS.map(({ mode, labelKey }) => (
          <button
            key={mode}
            onClick={() => setGroupMode(mode)}
            aria-pressed={groupMode === mode}
            style={{
              flex: 1,
              padding: '6px 0',
              borderRadius: 6,
              fontSize: 11,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: groupMode === mode ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>
      <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.7 }}>
        {t('graph.groupByHint')}
      </span>
    </div>
  )
}
