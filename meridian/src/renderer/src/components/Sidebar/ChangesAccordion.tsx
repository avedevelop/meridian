import { useTranslation } from 'react-i18next'
import { FileIcon } from '../Icons'

export interface GitChange {
  path: string
  status: 'modified' | 'added' | 'deleted' | 'untracked' | 'unknown'
}

export interface ChangesAccordionProps {
  expanded: boolean
  onToggle: () => void
  changes: GitChange[]
  onOpenDiff: (path: string, name: string) => void
}

export function ChangesAccordion({
  expanded,
  onToggle,
  changes,
  onOpenDiff
}: ChangesAccordionProps) {
  const { t } = useTranslation()

  return (
    <>
      {/* Changes Accordion Header */}
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
          <span>{t('gitPanel.unsavedChanges')}</span>
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
          {changes.length}
        </span>
      </div>

      {expanded && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            borderBottom: '1px solid var(--border-color)'
          }}
        >
          {changes.length === 0 ? (
            <div
              style={{
                padding: '16px 20px',
                color: 'var(--text-secondary)',
                fontSize: 12,
                textAlign: 'center',
                fontStyle: 'italic'
              }}
            >
              {t('gitPanel.upToDate')}
            </div>
          ) : (
            changes.map((change) => {
              const name = change.path.split(/[/\\]/).pop() || change.path
              const relativeDir =
                change.path.includes('/') || change.path.includes('\\')
                  ? change.path.slice(
                      0,
                      change.path.lastIndexOf(change.path.includes('/') ? '/' : '\\')
                    )
                  : ''

              let badgeText = 'M'
              let badgeColor = '#dcb67a'
              let badgeBg = 'rgba(220, 182, 122, 0.15)'
              if (change.status === 'added') {
                badgeText = 'A'
                badgeColor = '#2ea44f'
                badgeBg = 'rgba(46, 164, 79, 0.15)'
              } else if (change.status === 'untracked') {
                badgeText = 'U'
                badgeColor = '#2ea44f'
                badgeBg = 'rgba(46, 164, 79, 0.15)'
              } else if (change.status === 'deleted') {
                badgeText = 'D'
                badgeColor = '#cf222e'
                badgeBg = 'rgba(207, 34, 46, 0.15)'
              }

              const isDeleted = change.status === 'deleted'

              return (
                <div
                  key={change.path}
                  onClick={() => {
                    if (!isDeleted) {
                      onOpenDiff(change.path, name)
                    }
                  }}
                  style={{
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: isDeleted ? 'default' : 'pointer',
                    gap: 12
                  }}
                  onMouseEnter={(e) => {
                    if (!isDeleted) e.currentTarget.style.background = 'var(--bg-surface)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isDeleted) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      overflow: 'hidden',
                      flex: 1
                    }}
                  >
                    <FileIcon
                      size={14}
                      color={isDeleted ? 'var(--text-secondary)' : 'var(--accent-color)'}
                      style={{ flexShrink: 0 }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: isDeleted ? 'var(--text-secondary)' : 'var(--text-primary)',
                          textDecoration: isDeleted ? 'line-through' : 'none',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {name}
                      </span>
                      {relativeDir && (
                        <span
                          style={{
                            fontSize: 10,
                            color: 'var(--text-secondary)',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {relativeDir}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 'bold',
                      width: 16,
                      height: 16,
                      borderRadius: 3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: badgeColor,
                      backgroundColor: badgeBg,
                      flexShrink: 0
                    }}
                  >
                    {badgeText}
                  </span>
                </div>
              )
            })
          )}
        </div>
      )}
    </>
  )
}
