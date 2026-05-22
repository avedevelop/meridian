import { useTranslation } from 'react-i18next'
import { LinkIcon } from '../Icons'

interface GraphSidebarAnalyticsProps {
  graphStats: {
    totalNodes: number
    totalLinks: number
    orphans: number
    density: string
    hubs: Array<{ id: string; name: string; degree: number }>
  }
  focusNode: (id: string) => void
}

export function GraphSidebarAnalytics({ graphStats, focusNode }: GraphSidebarAnalyticsProps) {
  const { t } = useTranslation()

  return (
    <>
      {/* Network Stats Card */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--text-secondary)',
            opacity: 0.6,
            letterSpacing: '0.04em'
          }}
        >
          {t('graph.metrics')}
        </span>
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10,
            padding: 14,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.7 }}>
              {t('graph.totalNodes')}
            </span>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              {graphStats.totalNodes}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.7 }}>
              {t('graph.totalLinks')}
            </span>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              {graphStats.totalLinks}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.7 }}>
              {t('graph.orphanNodes')}
            </span>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              {graphStats.orphans}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.7 }}>
              {t('graph.density')}
            </span>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              {graphStats.density}
            </span>
          </div>
        </div>
      </div>

      {/* Top Hubs List */}
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
          {t('graph.topHubs')}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {graphStats.hubs.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', opacity: 0.6, padding: 8 }}>
              {t('graph.noConnections')}
            </div>
          ) : (
            graphStats.hubs.map((hub, index) => (
              <button
                key={hub.id}
                onClick={() => focusNode(hub.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                  e.currentTarget.style.borderColor = 'var(--accent-color)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: '80%' }}>
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      color: 'var(--text-secondary)'
                    }}
                  >
                    {index + 1}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {hub.name}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <LinkIcon size={11} color="var(--accent-color)" />
                  <span style={{ fontSize: 11, color: 'var(--accent-color)', fontWeight: 600 }}>
                    {hub.degree}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  )
}
