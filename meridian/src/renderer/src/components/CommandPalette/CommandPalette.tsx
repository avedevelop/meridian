import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { FileIcon } from '../Icons'
import { useLinkStore } from '../../store/useLinkStore'

interface FileItem {
  path: string
  name: string
}

export interface CommandItem {
  id: string
  label: string
  icon?: string
  onSelect: () => void
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  files: FileItem[]
  onFileSelect: (path: string, name: string) => void
  commands?: CommandItem[]
  recentPaths?: string[]
}

export function CommandPalette({ isOpen, onClose, files, onFileSelect, commands = [], recentPaths = [] }: CommandPaletteProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const { search, searchResults } = useLinkStore()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setActiveIndex(0)
      search('')
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isOpen, search])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  const isCommandMode = query.startsWith('>')
  const cleanQuery = isCommandMode ? query.slice(1).trim().toLowerCase() : query.toLowerCase()

  const filteredCommands = useMemo(() => {
    if (!isCommandMode) return []
    if (!cleanQuery) return commands
    return commands.filter((c) => c.label.toLowerCase().includes(cleanQuery))
  }, [isCommandMode, cleanQuery, commands])

  const recentFiles = useMemo(() => {
    if (isCommandMode || query.trim()) return []
    return recentPaths
      .map((path) => files.find((f) => f.path === path))
      .filter((f): f is FileItem => f !== undefined)
      .slice(0, 5)
  }, [isCommandMode, query, recentPaths, files])

  const filteredFiles = useMemo(() => {
    if (isCommandMode) return []
    if (!query.trim()) {
      const recentSet = new Set(recentPaths)
      return files.filter((f) => !recentSet.has(f.path)).slice(0, 8).map((f) => ({ ...f, snippet: '' }))
    }
    return searchResults.slice(0, 12)
  }, [isCommandMode, query, searchResults, files, recentPaths])

  const items = isCommandMode ? filteredCommands : [...recentFiles, ...filteredFiles]

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setActiveIndex(0)
    if (!value.startsWith('>') && value.trim()) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => search(value), 150)
    }
  }

  if (!isOpen) return null

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { setActiveIndex((i) => Math.min(i + 1, items.length - 1)); return }
    if (e.key === 'ArrowUp') { setActiveIndex((i) => Math.max(i - 1, 0)); return }
    if (e.key === 'Enter') {
      if (isCommandMode) {
        const cmd = filteredCommands[activeIndex]
        if (cmd) { cmd.onSelect(); onClose() }
      } else {
        const f = items[activeIndex] as FileItem | undefined
        if (f) { onFileSelect(f.path, f.name); onClose() }
      }
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 120
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560, background: '#1e1e1e', borderRadius: 10,
          border: '1px solid #333', boxShadow: '0 24px 64px rgba(0,0,0,0.8)', overflow: 'hidden'
        }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={handleQueryChange}
          onKeyDown={handleKey}
          placeholder={isCommandMode ? t('commandPalette.searchCommandsPlaceholder') : t('commandPalette.searchNotesPlaceholder')}
          style={{
            width: '100%', padding: '14px 16px',
            background: 'transparent', border: 'none', outline: 'none',
            color: '#fff', fontSize: 15, borderBottom: '1px solid #2a2a2a'
          }}
        />
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {isCommandMode ? (
            filteredCommands.length === 0 ? (
              <div style={{ padding: '12px 16px', color: '#555', fontSize: 13 }}>{t('commandPalette.noResults')}</div>
            ) : (
              filteredCommands.map((cmd, i) => (
                <div
                  key={cmd.id}
                  onClick={() => { cmd.onSelect(); onClose() }}
                  style={{
                    padding: '10px 16px', cursor: 'pointer', fontSize: 14,
                    color: i === activeIndex ? '#fff' : '#aaa',
                    background: i === activeIndex ? '#2a2a3a' : 'transparent',
                    display: 'flex', alignItems: 'center', gap: 10
                  }}
                >
                  <span style={{ fontSize: 16 }}>{cmd.icon ?? '⚡'}</span>
                  <span>{cmd.label}</span>
                </div>
              ))
            )
          ) : (
            <>
              {recentFiles.length > 0 && !query.trim() && (
                <>
                  <div
                    style={{
                      padding: '6px 16px 2px',
                      fontSize: 10,
                      color: '#444',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase'
                    }}
                  >
                    {t('commandPalette.recent')}
                  </div>
                  {recentFiles.map((f, i) => (
                    <div
                      key={f.path}
                      onClick={() => {
                        onFileSelect(f.path, f.name)
                        onClose()
                      }}
                      style={{
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontSize: 14,
                        color: i === activeIndex ? '#fff' : '#ccc',
                        background: i === activeIndex ? '#2a2a3a' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10
                      }}
                    >
                      <span style={{ fontSize: 12 }}>🕐</span>
                      <span>{f.name.replace(/\.md$/, '')}</span>
                    </div>
                  ))}
                  {filteredFiles.length > 0 && (
                    <div
                      style={{
                        padding: '6px 16px 2px',
                        fontSize: 10,
                        color: '#444',
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase'
                      }}
                    >
                      {t('commandPalette.allNotes')}
                    </div>
                  )}
                </>
              )}
              {filteredFiles.map((f, i) => {
                const idx = recentFiles.length + i
                const snippet = (f as typeof f & { snippet?: string }).snippet
                return (
                  <div
                    key={f.path}
                    onClick={() => {
                      onFileSelect(f.path, f.name)
                      onClose()
                    }}
                    style={{
                      padding: snippet ? '8px 16px' : '10px 16px',
                      cursor: 'pointer',
                      background: idx === activeIndex ? '#2a2a3a' : 'transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <FileIcon size={14} color="#7c6af7" />
                      <span style={{ fontSize: 14, color: idx === activeIndex ? '#fff' : '#aaa' }}>
                        {f.name.replace(/\.md$/, '')}
                      </span>
                    </div>
                    {snippet && (
                      <div style={{
                        fontSize: 11,
                        color: idx === activeIndex ? 'rgba(255,255,255,0.55)' : '#555',
                        marginTop: 3,
                        marginLeft: 24,
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                      }}>
                        {snippet}
                      </div>
                    )}
                  </div>
                )
              })}
              {recentFiles.length === 0 && filteredFiles.length === 0 && (
                <div style={{ padding: '12px 16px', color: '#555', fontSize: 13 }}>{t('commandPalette.noResults')}</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
