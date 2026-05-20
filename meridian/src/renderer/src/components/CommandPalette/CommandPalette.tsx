import React, { useState, useEffect, useRef, useMemo } from 'react'
import { FileIcon } from '../Icons'

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
}

export function CommandPalette({ isOpen, onClose, files, onFileSelect, commands = [] }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isOpen])

  const isCommandMode = query.startsWith('>')
  const cleanQuery = isCommandMode ? query.slice(1).trim().toLowerCase() : query.toLowerCase()

  const filteredCommands = useMemo(() => {
    if (!isCommandMode) return []
    if (!cleanQuery) return commands
    return commands.filter((c) => c.label.toLowerCase().includes(cleanQuery))
  }, [isCommandMode, cleanQuery, commands])

  const filteredFiles = useMemo(() => {
    if (isCommandMode) return []
    if (!query.trim()) return files.slice(0, 10)
    return files.filter((f) => f.name.toLowerCase().replace(/\.md$/, '').includes(cleanQuery)).slice(0, 10)
  }, [isCommandMode, query, cleanQuery, files])

  const items = isCommandMode ? filteredCommands : filteredFiles

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
        const f = filteredFiles[activeIndex] as FileItem | undefined
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
          onChange={(e) => { setQuery(e.target.value); setActiveIndex(0) }}
          onKeyDown={handleKey}
          placeholder={isCommandMode ? 'Search commands...' : 'Search notes… (type > for commands)'}
          style={{
            width: '100%', padding: '14px 16px',
            background: 'transparent', border: 'none', outline: 'none',
            color: '#fff', fontSize: 15, borderBottom: '1px solid #2a2a2a'
          }}
        />
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {items.length === 0 ? (
            <div style={{ padding: '12px 16px', color: '#555', fontSize: 13 }}>No results</div>
          ) : isCommandMode ? (
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
          ) : (
            filteredFiles.map((f, i) => (
              <div
                key={f.path}
                onClick={() => { onFileSelect(f.path, f.name); onClose() }}
                style={{
                  padding: '10px 16px', cursor: 'pointer', fontSize: 14,
                  color: i === activeIndex ? '#fff' : '#aaa',
                  background: i === activeIndex ? '#2a2a3a' : 'transparent',
                  display: 'flex', alignItems: 'center', gap: 10
                }}
              >
                <FileIcon size={14} color="#7c6af7" />
                <span>{f.name.replace(/\.md$/, '')}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
