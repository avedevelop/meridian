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
    <div style={{ padding: '12px 0', fontSize: 12, color: '#aaa' }}>
      <div
        style={{
          padding: '0 12px 8px',
          color: '#666',
          fontWeight: 600,
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}
      >
        Backlinks
      </div>
      {backlinks.length === 0 ? (
        <div style={{ padding: '0 12px', color: '#444' }}>No backlinks</div>
      ) : (
        backlinks.map((path) => {
          const name = path.split('/').pop() ?? ''
          return (
            <div
              key={path}
              onClick={() => openFile(path, name)}
              style={{ padding: '4px 12px', cursor: 'pointer', color: '#7c6af7', borderRadius: 4 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#1e1e1e')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {name.replace(/\.md$/, '')}
            </div>
          )
        })
      )}

      {tags.length > 0 && (
        <>
          <div
            style={{
              padding: '12px 12px 8px',
              color: '#666',
              fontWeight: 600,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            Tags
          </div>
          <div style={{ padding: '0 12px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {tags.map((tag) => (
              <span
                key={tag}
                style={{
                  background: '#2a2a2a',
                  color: '#888',
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 11
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
