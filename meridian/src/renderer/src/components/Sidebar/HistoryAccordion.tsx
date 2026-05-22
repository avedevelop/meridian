import { useTranslation } from 'react-i18next'
import { timeAgo } from './gitUtils'
import { GitCommit } from './useGit'

export interface HistoryAccordionProps {
  expanded: boolean
  onToggle: () => void
  commits: GitCommit[]
  onCopyHash: (hash: string) => void
}

export function HistoryAccordion({
  expanded,
  onToggle,
  commits,
  onCopyHash
}: HistoryAccordionProps) {
  const { t } = useTranslation()

  return (
    <>
      {/* Commit History Accordion Header */}
      <div
        onClick={onToggle}
        style={{
          padding: '8px 16px',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease',
              display: 'inline-block',
              fontSize: 8
            }}
          >
            ▶
          </span>
          <span>{t('gitPanel.snapshotHistory')}</span>
        </div>
        <span
          style={{
            background: 'var(--bg-surface)',
            padding: '2px 6px',
            borderRadius: 10,
            fontSize: 9,
            color: 'var(--text-secondary)'
          }}
        >
          {commits.length}
        </span>
      </div>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {commits.length === 0 ? (
            <div
              style={{
                padding: '16px 20px',
                color: 'var(--text-secondary)',
                fontSize: 12,
                textAlign: 'center',
                fontStyle: 'italic'
              }}
            >
              {t('gitPanel.noCommits')}
            </div>
          ) : (
            commits.map((commit) => (
              <div
                key={commit.hash}
                onClick={() => onCopyHash(commit.hash)}
                title={t('gitPanel.copyHash')}
                style={{
                  padding: '8px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  gap: 3,
                  borderBottom: '1px solid var(--border-color-light, rgba(255,255,255,0.03))'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 8
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1
                    }}
                  >
                    {commit.subject}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontFamily: 'monospace',
                      color: 'var(--accent-color)',
                      background: 'var(--accent-glow)',
                      padding: '1px 4px',
                      borderRadius: 4,
                      flexShrink: 0
                    }}
                  >
                    {commit.shortHash}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 10,
                    color: 'var(--text-secondary)'
                  }}
                >
                  <span>{commit.author}</span>
                  <span>{timeAgo(commit.date, t)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </>
  )
}
