import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { SearchIcon, FileIcon } from './Icons'
import { useLinkStore } from '../store/useLinkStore'
import { useVaultBridge } from '../hooks/useVaultBridge'

export function HeaderSearch() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const { search, searchResults } = useLinkStore()
  const { openFile } = useVaultBridge()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Listen to Cmd/Ctrl + K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    search(e.target.value)
    setSelectedIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
        const item = searchResults[selectedIndex]
        openFile(item.path, item.name)
        setFocused(false)
        inputRef.current?.blur()
      } else if (searchResults.length > 0) {
        openFile(searchResults[0].path, searchResults[0].name)
        setFocused(false)
        inputRef.current?.blur()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setFocused(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: '50%',
        top: 5,
        transform: 'translateX(-50%)',
        width: 420,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        // @ts-ignore
        WebkitAppRegion: 'no-drag'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-surface)',
          border: focused ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
          borderRadius: 6,
          height: 28,
          padding: '0 10px',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          boxShadow: focused ? '0 0 0 2px var(--accent-glow)' : 'none',
          cursor: 'text'
        }}
        onClick={() => inputRef.current?.focus()}
      >
        <SearchIcon
          size={14}
          color="var(--text-secondary)"
          style={{ marginRight: 8, flexShrink: 0 }}
        />
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          placeholder={t('layout.searchPlaceholder')}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: 13,
            height: '100%',
            padding: 0
          }}
        />
        {query && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setQuery('')
              search('')
              setSelectedIndex(-1)
              inputRef.current?.focus()
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 11,
              padding: '0 4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            ✕
          </button>
        )}
      </div>

      {focused && query && (
        <div
          style={{
            marginTop: 8,
            background: 'var(--bg-secondary)',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--border-color)',
            borderRadius: 6,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            maxHeight: 280,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            padding: '4px 0'
          }}
        >
          {searchResults.map((result, idx) => {
            const isSelected = idx === selectedIndex
            return (
              <div
                key={result.path}
                onClick={() => {
                  openFile(result.path, result.name)
                  setFocused(false)
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isSelected ? 'var(--accent-glow)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  borderLeft: isSelected
                    ? '3px solid var(--accent-color)'
                    : '3px solid transparent',
                  transition: 'background 0.15s, color 0.15s'
                }}
              >
                <FileIcon
                  size={12}
                  color={isSelected ? 'var(--accent-color)' : 'var(--text-secondary)'}
                />
                <span style={{ fontWeight: isSelected ? 500 : 'normal' }}>
                  {result.name.replace(/\.md$/, '')}
                </span>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 10,
                    opacity: 0.5,
                    maxWidth: '45%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {result.path.split('/').slice(0, -1).join('/')}
                </span>
              </div>
            )
          })}
          {searchResults.length === 0 && (
            <div
              style={{
                padding: '8px 12px',
                color: 'var(--text-secondary)',
                fontSize: 11,
                textAlign: 'center'
              }}
            >
              {t('layout.noResults')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
