import React, { useState, useRef, useEffect } from 'react'
import { VaultFile } from '@shared/types'
import { ContextMenu } from './ContextMenu'
import { FileIcon } from './FileIcon'

interface FileTreeProps {
  files: VaultFile[]
  onFileClick: (path: string, name: string) => void
  onRename?: (oldPath: string, newName: string) => void
  onDelete?: (path: string) => void
  onNewFolder?: (parentDir: string) => void
  onMove?: (sourcePath: string, targetDir: string) => void
  onReveal?: (path: string) => void
  collapseKey?: number
  vaultPath: string
  depth?: number
}

let dragSourcePath: string | null = null

export function FileTree({ files, onFileClick, onRename, onDelete, onNewFolder, onMove, onReveal, collapseKey = 0, vaultPath, depth = 0 }: FileTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: VaultFile } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // Keep a ref to always read the latest editValue inside event handlers
  const editValueRef = useRef('')
  editValueRef.current = editValue

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      const dotIndex = editValueRef.current.lastIndexOf('.')
      inputRef.current.setSelectionRange(0, dotIndex > 0 ? dotIndex : editValueRef.current.length)
    }
  }, [editing])

  useEffect(() => {
    setExpanded(new Set())
  }, [collapseKey])

  const toggle = (path: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(path) ? next.delete(path) : next.add(path)
      return next
    })
  }

  const startEdit = (file: VaultFile, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditing(file.path)
    setEditValue(file.name)
  }

  const committingRef = useRef(false)

  const commitEdit = (filePath: string, originalName: string) => {
    if (committingRef.current) return
    committingRef.current = true
    setEditing(null)
    const newName = editValueRef.current.trim()
    if (newName && newName !== originalName && onRename) {
      onRename(filePath, newName)
    }
    setTimeout(() => { committingRef.current = false }, 100)
  }

  const cancelEdit = () => setEditing(null)

  const handleContextMenu = (e: React.MouseEvent, file: VaultFile) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, file })
  }

  return (
    <div>
      {files.map(file => (
        <div key={file.path}>
          <div
            onClick={() => {
              if (editing === file.path) return
              file.isDirectory ? toggle(file.path) : onFileClick(file.path, file.name)
            }}
            onDoubleClick={e => !file.isDirectory && startEdit(file, e)}
            onContextMenu={e => handleContextMenu(e, file)}
            draggable={!file.isDirectory}
            onDragStart={e => {
              dragSourcePath = file.path
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData('text/plain', file.path)
            }}
            onDragEnd={() => { dragSourcePath = null }}
            onDragOver={e => {
              if (!file.isDirectory || !dragSourcePath || dragSourcePath === file.path) return
              e.preventDefault()
              e.currentTarget.style.background = '#2a2050'
            }}
            onDragLeave={e => {
              e.currentTarget.style.background = editing === file.path ? 'transparent' : ''
            }}
            onDrop={e => {
              e.preventDefault()
              e.currentTarget.style.background = ''
              if (!dragSourcePath || dragSourcePath === file.path) return
              if (file.isDirectory) {
                onMove?.(dragSourcePath, file.path)
              }
              dragSourcePath = null
            }}
            style={{
              paddingLeft: 12 + depth * 16, paddingRight: 12,
              paddingTop: 3, paddingBottom: 3,
              cursor: 'pointer', color: '#ccc', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 6,
              borderRadius: 4, userSelect: 'none',
            }}
            onMouseEnter={e => { if (editing !== file.path) e.currentTarget.style.background = '#2a2a2a' }}
            onMouseLeave={e => { if (editing !== file.path) e.currentTarget.style.background = 'transparent' }}
          >
            <span style={{ fontSize: 11, color: '#555', width: 10, flexShrink: 0 }}>
              {file.isDirectory ? (expanded.has(file.path) ? '▾' : '▸') : ''}
            </span>
            <FileIcon name={file.name} isDirectory={file.isDirectory} isOpen={file.isDirectory && expanded.has(file.path)} />
            {editing === file.path ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); commitEdit(file.path, file.name) }
                  if (e.key === 'Escape') cancelEdit()
                }}
                onBlur={() => commitEdit(file.path, file.name)}
                onClick={e => e.stopPropagation()}
                style={{
                  flex: 1, background: '#1a1a2a', border: '1px solid #7c6af7',
                  borderRadius: 3, color: '#fff', fontSize: 13,
                  padding: '1px 4px', outline: 'none',
                }}
              />
            ) : (
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file.name}
              </span>
            )}
          </div>
          {file.isDirectory && expanded.has(file.path) && file.children && (
            <FileTree
              files={file.children}
              onFileClick={onFileClick}
              onRename={onRename}
              onDelete={onDelete}
              onNewFolder={onNewFolder}
              onMove={onMove}
              onReveal={onReveal}
              collapseKey={collapseKey}
              vaultPath={vaultPath}
              depth={depth + 1}
            />
          )}
        </div>
      ))}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={
            contextMenu.file.isDirectory
              ? [
                  {
                    label: 'New Folder',
                    onClick: () => onNewFolder?.(contextMenu.file.path),
                  },
                ]
              : [
                  {
                    label: 'Rename',
                    onClick: () => {
                      setEditing(contextMenu.file.path)
                      setEditValue(contextMenu.file.name)
                    },
                  },
                  {
                    label: 'Delete',
                    danger: true,
                    onClick: () => {
                      if (window.confirm(`Delete "${contextMenu.file.name}"? This cannot be undone.`)) {
                        onDelete?.(contextMenu.file.path)
                      }
                    },
                  },
                  {
                    label: 'Reveal in Finder',
                    onClick: () => onReveal?.(contextMenu.file.path),
                  },
                  {
                    label: 'Copy Path',
                    onClick: () => {
                      navigator.clipboard.writeText(contextMenu.file.path).catch(console.error)
                    },
                  },
                  {
                    label: 'Copy Relative Path',
                    onClick: () => {
                      navigator.clipboard.writeText(contextMenu.file.relativePath).catch(console.error)
                    },
                  },
                ]
          }
        />
      )}
    </div>
  )
}
