import React, { useState } from 'react'
import { useLinkStore } from '../../store/useLinkStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'
import { FileIcon, SearchIcon } from '../Icons'

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return <span>{text}</span>

  const escapedTerms = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi')
  const parts = text.split(regex)

  return (
    <span>
      {parts.map((part, i) => {
        const isMatch = terms.some((t) => part.toLowerCase() === t)
        return isMatch ? (
          <mark
            key={i}
            style={{
              background: 'rgba(137, 180, 250, 0.25)',
              color: 'var(--accent-color)',
              fontWeight: 600,
              padding: '0 2px',
              borderRadius: 3
            }}
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      })}
    </span>
  )
}

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
      {/* Search Input Box */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', background: 'rgba(0, 0, 0, 0.1)' }}>
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            padding: '6px 10px',
            gap: 8,
            boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.2)',
            transition: 'border-color 0.2s ease'
          }}
        >
          <SearchIcon size={14} color="var(--text-secondary)" style={{ opacity: 0.6 }} />
          <input
            value={query}
            onChange={handleChange}
            placeholder="Search filenames & contents..."
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 12
            }}
          />
          {query && (
            <button
              onClick={() => {
                setQuery('')
                search('')
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 11,
                padding: '0 4px'
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Results Container */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {searchResults.map((result) => {
          const pathParts = result.path.replace(/\\/g, '/').split('/')
          const parentFolder = pathParts.length > 2 ? pathParts[pathParts.length - 2] : ''

          return (
            <div
              key={result.path}
              onClick={() => openFile(result.path, result.name)}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.04)'
              }}
            >
              {/* Title & Icon Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                  <FileIcon size={12} color="var(--accent-color)" style={{ flexShrink: 0 }} />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden'
                    }}
                  >
                    <HighlightedText text={result.name.replace(/\.md$/, '')} query={query} />
                  </span>
                </div>
                {parentFolder && (
                  <span
                    style={{
                      fontSize: 10,
                      color: 'var(--text-secondary)',
                      opacity: 0.6,
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '2px 6px',
                      borderRadius: 4,
                      maxWidth: '40%',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden'
                    }}
                  >
                    {parentFolder}
                  </span>
                )}
              </div>

              {/* Snippet Body */}
              {result.snippet && (
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                    opacity: 0.8,
                    lineHeight: '1.4em',
                    wordBreak: 'break-word',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  <HighlightedText text={result.snippet} query={query} />
                </div>
              )}
            </div>
          )
        })}

        {query && searchResults.length === 0 && (
          <div style={{ padding: '36px 12px', textAlign: 'center', color: 'var(--text-secondary)', opacity: 0.6, fontSize: 12 }}>
            No notes match "{query}"
          </div>
        )}
      </div>
    </div>
  )
}
