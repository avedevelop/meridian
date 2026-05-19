import { useMemo } from 'react'
import { useLinkStore } from '../../store/useLinkStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'

export function TagsPanel() {
  const linkStore = useLinkStore()
  const indexVersion = useLinkStore(s => s.indexVersion)
  const { openFile } = useVaultBridge()

  const tags = useMemo(() => {
    const map = linkStore.allTags()
    return Array.from(map.entries())
      .sort((a, b) => b[1].length - a[1].length)
  }, [indexVersion])

  if (tags.length === 0) {
    return (
      <div style={{ padding: '12px', color: '#444', fontSize: 12 }}>
        No tags found. Use #tag in your notes.
      </div>
    )
  }

  return (
    <div style={{ padding: '8px 0', fontSize: 12 }}>
      {tags.map(([tag, files]) => (
        <details key={tag} style={{ borderBottom: '1px solid #222' }}>
          <summary
            style={{
              padding: '6px 12px', cursor: 'pointer', color: '#aaa',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              userSelect: 'none', listStyle: 'none',
            }}
            onFocus={e => (e.currentTarget.style.background = '#1a1a2a')}
            onBlur={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ color: '#7c6af7' }}>#{tag}</span>
            <span style={{ color: '#444', fontSize: 11 }}>{files.length}</span>
          </summary>
          <div style={{ paddingBottom: 4 }}>
            {files.map(filePath => {
              const name = filePath.split('/').pop() ?? ''
              return (
                <div
                  key={filePath}
                  onClick={() => openFile(filePath, name)}
                  style={{ padding: '3px 20px', cursor: 'pointer', color: '#777', fontSize: 11 }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#ccc')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#777')}
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
