import React, { useState, useRef, useEffect } from 'react'
import { VaultFile } from '@shared/types'
import { ContextMenu } from './ContextMenu'
import { FileIcon } from './FileIcon'
import { uniqueFileName } from '../../hooks/useVaultBridge'

interface FileTreeProps {
  files: VaultFile[]
  onFileClick: (path: string, name: string) => void
  onRename?: (oldPath: string, newName: string) => void
  onDelete?: (path: string) => void
  onNewFolder?: (parentDir: string) => void
  onCreateFile?: (dir: string, name: string) => void
  onMove?: (sourcePath: string, targetDir: string) => void
  onReveal?: (path: string) => void
  collapseKey?: number
  vaultPath: string
  depth?: number
  activePath?: string | null
}

function isAncestor(parentPath: string, childPath: string): boolean {
  const parentWithSlash =
    parentPath.endsWith('/') || parentPath.endsWith('\\') ? parentPath : parentPath + '/'
  const parentWithBackslash =
    parentPath.endsWith('/') || parentPath.endsWith('\\') ? parentPath : parentPath + '\\'
  return childPath.startsWith(parentWithSlash) || childPath.startsWith(parentWithBackslash)
}

export function FileTree({
  files,
  onFileClick,
  onRename,
  onDelete,
  onNewFolder,
  onCreateFile,
  onMove,
  onReveal,
  collapseKey = 0,
  vaultPath,
  depth = 0,
  activePath
}: FileTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: VaultFile } | null>(
    null
  )
  const inputRef = useRef<HTMLInputElement>(null)
  // Keep a ref to always read the latest editValue inside event handlers
  const editValueRef = useRef('')
  editValueRef.current = editValue

  // Auto-expand parents of the active file
  useEffect(() => {
    if (!activePath) return
    const currentActivePath = activePath
    const toExpand: string[] = []
    function walk(items: VaultFile[]) {
      for (const f of items) {
        if (f.isDirectory) {
          if (isAncestor(f.path, currentActivePath)) {
            toExpand.push(f.path)
            if (f.children) walk(f.children)
          }
        }
      }
    }
    walk(files)

    if (toExpand.length > 0) {
      setExpanded((prev) => {
        const next = new Set(prev)
        toExpand.forEach((p) => next.add(p))
        return next
      })
    }
  }, [activePath, files])

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
    setExpanded((prev) => {
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
    setTimeout(() => {
      committingRef.current = false
    }, 100)
  }

  const cancelEdit = () => setEditing(null)

  const handleContextMenu = (e: React.MouseEvent, file: VaultFile) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, file })
  }

  return (
    <div>
      {files.map((file) => {
        const isParentOfActive = activePath && isAncestor(file.path, activePath)
        const shouldRenderChildren =
          file.isDirectory && file.children && (expanded.has(file.path) || isParentOfActive)
        const childrenToRender = file.children
          ? expanded.has(file.path)
            ? file.children
            : file.children.filter(
                (child) =>
                  child.path === activePath ||
                  (child.isDirectory && activePath && isAncestor(child.path, activePath))
              )
          : []

        return (
          <div key={file.path}>
            <div
              onClick={() => {
                if (editing === file.path) return
                file.isDirectory ? toggle(file.path) : onFileClick(file.path, file.name)
              }}
              onDoubleClick={(e) => !file.isDirectory && startEdit(file, e)}
              onContextMenu={(e) => handleContextMenu(e, file)}
              draggable={true}
              onDragStart={(e) => {
                ;(window as any).__meridianDragPath = file.path
                ;(window as any).__meridianDragIsDir = file.isDirectory
                e.dataTransfer.effectAllowed = 'copyMove'
                e.dataTransfer.setData('text/plain', file.path)
                if (!file.isDirectory) {
                  e.dataTransfer.setData(
                    'application/meridian-file',
                    JSON.stringify({
                      path: file.path,
                      name: file.name,
                      relativePath: file.relativePath
                    })
                  )
                }
              }}
              onDragEnd={() => {
                ;(window as any).__meridianDragPath = null
                ;(window as any).__meridianDragIsDir = null
              }}
              onDragOver={(e) => {
                const dragPath = (window as any).__meridianDragPath
                if (!file.isDirectory || !dragPath) return
                // Prevent dropping onto self or into own subtree
                if (dragPath === file.path || file.path.startsWith(dragPath + '/')) return
                e.preventDefault()
                e.currentTarget.style.background = 'var(--accent-glow)'
              }}
              onDragLeave={(e) => {
                e.currentTarget.style.background = editing === file.path ? 'transparent' : ''
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.currentTarget.style.background = ''
                const dragPath = (window as any).__meridianDragPath
                if (!dragPath || dragPath === file.path) return
                // Prevent dropping folder into its own subtree
                if (file.isDirectory && file.path.startsWith(dragPath + '/')) return
                if (file.isDirectory) {
                  onMove?.(dragPath, file.path)
                }
                ;(window as any).__meridianDragPath = null
                ;(window as any).__meridianDragIsDir = null
              }}
              style={{
                paddingLeft: 12 + depth * 16,
                paddingRight: 12,
                paddingTop: 5,
                paddingBottom: 5,
                cursor: 'pointer',
                color: activePath === file.path ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: activePath === file.path ? '500' : 'normal',
                background:
                  activePath === file.path ? 'var(--accent-glow)' : editing === file.path ? 'transparent' : '',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 4,
                userSelect: 'none',
                borderLeft: activePath === file.path ? '3px solid var(--accent-color)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (editing !== file.path && activePath !== file.path) {
                  e.currentTarget.style.background = 'var(--bg-surface)'
                }
              }}
              onMouseLeave={(e) => {
                if (editing !== file.path && activePath !== file.path) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 12, flexShrink: 0 }}>
                {file.isDirectory ? (expanded.has(file.path) ? '▾' : '▸') : ''}
              </span>
              <FileIcon
                name={file.name}
                isDirectory={file.isDirectory}
                isOpen={file.isDirectory && expanded.has(file.path)}
              />
              {editing === file.path ? (
                <input
                  ref={inputRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      commitEdit(file.path, file.name)
                    }
                    if (e.key === 'Escape') cancelEdit()
                  }}
                  onBlur={() => commitEdit(file.path, file.name)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    flex: 1,
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--accent-color)',
                    borderRadius: 3,
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    padding: '3px 6px',
                    outline: 'none'
                  }}
                />
              ) : (
                <span
                  style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {file.name}
                </span>
              )}
            </div>
            {shouldRenderChildren && childrenToRender.length > 0 && (
              <FileTree
                files={childrenToRender}
                onFileClick={onFileClick}
                onRename={onRename}
                onDelete={onDelete}
                onNewFolder={onNewFolder}
                onCreateFile={onCreateFile}
                onMove={onMove}
                onReveal={onReveal}
                collapseKey={collapseKey}
                vaultPath={vaultPath}
                depth={depth + 1}
                activePath={activePath}
              />
            )}
          </div>
        )
      })}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={
            contextMenu.file.isDirectory
              ? [
                  {
                    label: 'New Note',
                    onClick: () =>
                      onCreateFile?.(contextMenu.file.path, uniqueFileName(contextMenu.file.path, 'Untitled', 'md', files))
                  },
                  {
                    label: 'New Folder',
                    onClick: () => onNewFolder?.(contextMenu.file.path)
                  },
                  { separator: true as const },
                  {
                    label: 'Rename',
                    onClick: () => {
                      setEditing(contextMenu.file.path)
                      setEditValue(contextMenu.file.name)
                    }
                  },
                  {
                    label: 'Delete',
                    danger: true,
                    onClick: () => {
                      if (
                        window.confirm(
                          `Delete folder "${contextMenu.file.name}" and all its contents? This cannot be undone.`
                        )
                      ) {
                        onDelete?.(contextMenu.file.path)
                      }
                    }
                  },
                  { separator: true as const },
                  {
                    label: 'Reveal in Finder',
                    onClick: () => onReveal?.(contextMenu.file.path)
                  },
                  {
                    label: 'Copy Path',
                    onClick: () => {
                      navigator.clipboard.writeText(contextMenu.file.path).catch(console.error)
                    }
                  },
                  {
                    label: 'Copy Relative Path',
                    onClick: () => {
                      navigator.clipboard
                        .writeText(contextMenu.file.relativePath)
                        .catch(console.error)
                    }
                  }
                ]
              : [
                  {
                    label: 'New Note Here',
                    onClick: () => {
                      const dir = contextMenu.file.path.split('/').slice(0, -1).join('/')
                      onCreateFile?.(dir, uniqueFileName(dir, 'Untitled', 'md', files))
                    }
                  },
                  { separator: true as const },
                  {
                    label: 'Rename',
                    onClick: () => {
                      setEditing(contextMenu.file.path)
                      setEditValue(contextMenu.file.name)
                    }
                  },
                  {
                    label: 'Delete',
                    danger: true,
                    onClick: () => {
                      if (
                        window.confirm(`Delete "${contextMenu.file.name}"? This cannot be undone.`)
                      ) {
                        onDelete?.(contextMenu.file.path)
                      }
                    }
                  },
                  { separator: true as const },
                  {
                    label: 'Reveal in Finder',
                    onClick: () => onReveal?.(contextMenu.file.path)
                  },
                  {
                    label: 'Copy Path',
                    onClick: () => {
                      navigator.clipboard.writeText(contextMenu.file.path).catch(console.error)
                    }
                  },
                  {
                    label: 'Copy Relative Path',
                    onClick: () => {
                      navigator.clipboard
                        .writeText(contextMenu.file.relativePath)
                        .catch(console.error)
                    }
                  }
                ]
          }
        />
      )}
    </div>
  )
}
