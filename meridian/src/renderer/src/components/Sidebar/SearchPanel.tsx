import React, { useState } from 'react'
import { useLinkStore } from '../../store/useLinkStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'

export function SearchPanel() {
  const [query, setQuery] = useState('')
  const { search, searchResults } = useLinkStore()
  const { openFile } = useVaultBridge()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    search(e.target.value)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px 10px', borderBottom: '1px solid #2a2a2a' }}>
        <input
          value={query}
          onChange={handleChange}
          placeholder="Search vault..."
          style={{
            width: '100%', padding: '6px 10px', borderRadius: 6,
            background: '#2a2a2a', border: 'none', outline: 'none',
            color: '#ccc', fontSize: 12,
          }}
        />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {searchResults.map(result => (
          <div
            key={result.path}
            onClick={() => openFile(result.path, result.name)}
            style={{
              padding: '6px 12px', cursor: 'pointer', fontSize: 13, color: '#ccc',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#2a2a2a')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontSize: 11 }}>📄</span>
            <span>{result.name.replace(/\.md$/, '')}</span>
          </div>
        ))}
        {query && searchResults.length === 0 && (
          <div style={{ padding: '8px 12px', color: '#555', fontSize: 12 }}>No results</div>
        )}
      </div>
    </div>
  )
}
