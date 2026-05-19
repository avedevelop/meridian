import React, { useState, useEffect, useRef, useMemo } from 'react'

interface FileItem {
  path: string
  name: string
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  files: FileItem[]
  onFileSelect: (path: string, name: string) => void
}

export function CommandPalette({ isOpen, onClose, files, onFileSelect }: CommandPaletteProps) {
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

  const filtered = useMemo(() => {
    if (!query.trim()) return files.slice(0, 10)
    const q = query.toLowerCase()
    return files
      .filter(f => f.name.toLowerCase().replace(/\.md$/, '').includes(q))
      .slice(0, 10)
  }, [query, files])

  if (!isOpen) return null

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { setActiveIndex(i => Math.min(i + 1, filtered.length - 1)); return }
    if (e.key === 'ArrowUp') { setActiveIndex(i => Math.max(i - 1, 0)); return }
    if (e.key === 'Enter' && filtered[activeIndex]) {
      const f = filtered[activeIndex]
      onFileSelect(f.path, f.name)
      onClose()
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 120,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 560, background: '#1e1e1e', borderRadius: 10,
          border: '1px solid #333', boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
          overflow: 'hidden',
        }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setActiveIndex(0) }}
          onKeyDown={handleKey}
          placeholder="Search notes..."
          style={{
            width: '100%', padding: '14px 16px', background: 'transparent',
            border: 'none', outline: 'none', color: '#fff', fontSize: 15,
            borderBottom: '1px solid #2a2a2a',
          }}
        />
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '12px 16px', color: '#555', fontSize: 13 }}>No results</div>
          ) : (
            filtered.map((f, i) => {
              const displayName = f.name.replace(/\.md$/, '')
              return (
                <div
                  key={f.path}
                  onClick={() => { onFileSelect(f.path, f.name); onClose() }}
                  style={{
                    padding: '10px 16px', cursor: 'pointer', fontSize: 14,
                    color: i === activeIndex ? '#fff' : '#aaa',
                    background: i === activeIndex ? '#2a2a3a' : 'transparent',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}
                >
                  <span style={{ fontSize: 12 }}>📄</span>
                  <span>{displayName}</span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
