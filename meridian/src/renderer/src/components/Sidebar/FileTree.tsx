import React, { useState } from 'react'
import { VaultFile } from '@shared/types'

interface FileTreeProps {
  files: VaultFile[]
  onFileClick: (path: string, name: string) => void
  vaultPath: string
  depth?: number
}

export function FileTree({ files, onFileClick, vaultPath, depth = 0 }: FileTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (path: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(path) ? next.delete(path) : next.add(path)
      return next
    })
  }

  return (
    <div>
      {files.map(file => (
        <div key={file.path}>
          <div
            onClick={() => file.isDirectory ? toggle(file.path) : onFileClick(file.path, file.name)}
            style={{
              paddingLeft: 12 + depth * 16,
              paddingRight: 12,
              paddingTop: 3,
              paddingBottom: 3,
              cursor: 'pointer',
              color: '#ccc',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: 4,
              userSelect: 'none',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#2a2a2a')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontSize: 11, color: '#555', width: 10 }}>
              {file.isDirectory ? (expanded.has(file.path) ? '▾' : '▸') : ''}
            </span>
            <span>{file.isDirectory ? '📁' : '📄'}</span>
            <span>{file.name}</span>
          </div>
          {file.isDirectory && expanded.has(file.path) && file.children && (
            <FileTree
              files={file.children}
              onFileClick={onFileClick}
              vaultPath={vaultPath}
              depth={depth + 1}
            />
          )}
        </div>
      ))}
    </div>
  )
}
