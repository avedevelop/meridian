import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLinkStore } from '../../store/useLinkStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'
import { FileIcon } from '../Icons'

export function SearchPanel() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [hoveredPath, setHoveredPath] = React.useState<string | null>(null)
  const { search, searchResults } = useLinkStore()
  const { openFile } = useVaultBridge()
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      search(value)
    }, 200)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)' }}>
        <input
          value={query}
          onChange={handleChange}
          placeholder={t('search.placeholder')}
          autoFocus
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
            onMouseEnter={() => setHoveredPath(result.path)}
            onMouseLeave={() => setHoveredPath(null)}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              borderBottom: '1px solid var(--border-color)',
              background: hoveredPath === result.path ? 'var(--bg-surface)' : 'transparent'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <FileIcon size={12} color="var(--accent-color)" />
              <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                {result.name.replace(/\.md$/, '')}
              </span>
            </div>
            {result.snippet && (
              <div
                style={
                  {
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  } as React.CSSProperties
                }
              >
                {result.snippet}
              </div>
            )}
          </div>
        ))}
        {query && searchResults.length === 0 && (
          <div
            style={{
              padding: '24px 12px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: 12,
              opacity: 0.6
            }}
          >
            {t('search.noMatch', { query })}
          </div>
        )}
      </div>
    </div>
  )
}
