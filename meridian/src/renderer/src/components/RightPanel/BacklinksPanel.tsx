import { useVaultStore } from '../../store/useVaultStore'
import { useLinkStore } from '../../store/useLinkStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'

export function BacklinksPanel() {
  const activeTabPath = useVaultStore((s) => s.activeTabPath)
  const linkStore = useLinkStore()
  const { openFile } = useVaultBridge()

  const backlinks = activeTabPath ? linkStore.backlinks(activeTabPath) : []
  const tags = activeTabPath ? linkStore.tagsForFile(activeTabPath) : []

  return (
    <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--text-secondary)' }}>
      <div
        style={{
          padding: '0 16px 10px',
          color: 'var(--text-secondary)',
          fontWeight: 600,
          fontSize: 12,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          opacity: 0.8
        }}
      >
        Backlinks
      </div>
      {backlinks.length === 0 ? (
        <div style={{ padding: '0 16px', color: 'var(--text-secondary)', opacity: 0.5 }}>
          No backlinks
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {backlinks.map((path) => {
            const name = path.split('/').pop() ?? ''
            return (
              <div
                key={path}
                onClick={() => openFile(path, name)}
                style={{
                  padding: '6px 16px',
                  cursor: 'pointer',
                  color: 'var(--accent-color)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-surface)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--accent-color)'
                }}
              >
                {name.replace(/\.md$/, '')}
              </div>
            )
          })}
        </div>
      )}

      {tags.length > 0 && (
        <>
          <div
            style={{
              padding: '20px 16px 10px',
              color: 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              opacity: 0.8
            }}
          >
            Tags
          </div>
          <div style={{ padding: '0 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {tags.map((tag) => (
              <span
                key={tag}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '4px 10px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 500
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
