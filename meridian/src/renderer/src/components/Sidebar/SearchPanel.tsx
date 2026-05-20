import React, { useState } from 'react'
import { useLinkStore } from '../../store/useLinkStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'

import { FileIcon } from '../Icons'

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
      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)' }}>
        <input
          value={query}
          onChange={handleChange}
          placeholder="Search vault..."
          style={{
            width: '100%',
            padding: '6px 10px',
            borderRadius: 6,
            background: 'var(--bg-surface)',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: 12
          }}
        />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {searchResults.map((result) => (
          <div
            key={result.path}
            onClick={() => openFile(result.path, result.name)}
            style={{
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: 13,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <FileIcon size={12} color="var(--accent-color)" />
            <span>{result.name.replace(/\.md$/, '')}</span>
          </div>
        ))}
        {query && searchResults.length === 0 && (
          <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12, opacity: 0.6 }}>
            No notes match "{query}"
          </div>
        )}
      </div>
    </div>
  )
}
