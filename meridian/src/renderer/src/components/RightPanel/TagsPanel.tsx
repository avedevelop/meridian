import { useMemo } from 'react'
import { useLinkStore } from '../../store/useLinkStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'

export function TagsPanel() {
  const linkStore = useLinkStore()
  const indexVersion = useLinkStore((s) => s.indexVersion)
  const { openFile } = useVaultBridge()

  const tags = useMemo(() => {
    const map = linkStore.allTags()
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length)
  }, [indexVersion])

  if (tags.length === 0) {
    return (
      <div style={{ padding: '16px', color: 'var(--text-secondary)', opacity: 0.5, fontSize: 13 }}>
        No tags found. Use #tag in your notes.
      </div>
    )
  }

  return (
    <div style={{ padding: '12px 0', fontSize: 13 }}>
      {tags.map(([tag, files]) => (
        <details key={tag} style={{ borderBottom: '1px solid var(--border-color)' }}>
          <summary
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              userSelect: 'none',
              listStyle: 'none',
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ color: 'var(--accent-color)', fontWeight: 500 }}>#{tag}</span>
            <span style={{ color: 'var(--text-secondary)', opacity: 0.7, fontSize: 12 }}>{files.length}</span>
          </summary>
          <div style={{ paddingBottom: 6 }}>
            {files.map((filePath) => {
              const name = filePath.split('/').pop() ?? ''
              return (
                <div
                  key={filePath}
                  onClick={() => openFile(filePath, name)}
                  style={{
                    padding: '6px 24px',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    fontSize: 12,
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--text-primary)'
                    e.currentTarget.style.background = 'var(--bg-surface)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-secondary)'
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  {name.replace(/\.md$/, '')}
                </div>
              )
            })}
          </div>
        </details>
      ))}
    </div>
  )
}
