import React, { useEffect, useRef, useCallback, useMemo } from 'react'
import { FileIcon } from '../Icons'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { useVaultStore } from '../../store/useVaultStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'
import { createMarkdownExtensions } from './extensions/markdownExtensions'
import { useSettingsStore } from '../../store/useSettingsStore'
import { TabBar } from './TabBar'
import { MarkdownPreview } from './MarkdownPreview'
import { Breadcrumb } from './Breadcrumb'
import { useEditorStore } from '../../store/useEditorStore'
import { CanvasView } from '../Canvas/CanvasView'
import { SketchpadView } from './SketchpadView'
import { DiffPane } from './DiffPane'

function flattenVaultFiles(
  files: import('@shared/types').VaultFile[]
): import('@shared/types').VaultFile[] {
  return files.flatMap((f) => (f.isDirectory ? flattenVaultFiles(f.children ?? []) : [f]))
}

interface EditorContextMenuProps {
  x: number
  y: number
  onClose: () => void
  view: EditorView | null
  containerEl: HTMLDivElement | null
}

function EditorContextMenu({ x, y, onClose, view, containerEl }: EditorContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    window.addEventListener('mousedown', handleOutsideClick)
    return () => window.removeEventListener('mousedown', handleOutsideClick)
  }, [onClose])

  if (!view) return null

  const selection = view.state.selection.main
  const hasSelection = selection.from !== selection.to

  const executeAction = async (action: string) => {
    onClose()
    view.focus()

    switch (action) {
      case 'cut': {
        if (!hasSelection) return
        const text = view.state.sliceDoc(selection.from, selection.to)
        await navigator.clipboard.writeText(text)
        view.dispatch({
          changes: { from: selection.from, to: selection.to, insert: '' }
        })
        break
      }
      case 'copy': {
        if (!hasSelection) return
        const text = view.state.sliceDoc(selection.from, selection.to)
        await navigator.clipboard.writeText(text)
        break
      }
      case 'paste': {
        try {
          const clipboardText = await navigator.clipboard.readText()
          view.dispatch({
            changes: { from: selection.from, to: selection.to, insert: clipboardText },
            selection: { anchor: selection.from + clipboardText.length }
          })
        } catch (err) {
          console.error('Clipboard paste failed:', err)
        }
        break
      }
      case 'select-all': {
        view.dispatch({
          selection: { anchor: 0, head: view.state.doc.length }
        })
        break
      }
      case 'bold': {
        const text = view.state.sliceDoc(selection.from, selection.to)
        const insertText = `**${text}**`
        view.dispatch({
          changes: { from: selection.from, to: selection.to, insert: insertText },
          selection: { anchor: selection.from + insertText.length }
        })
        break
      }
      case 'italic': {
        const text = view.state.sliceDoc(selection.from, selection.to)
        const insertText = `*${text}*`
        view.dispatch({
          changes: { from: selection.from, to: selection.to, insert: insertText },
          selection: { anchor: selection.from + insertText.length }
        })
        break
      }
      case 'code': {
        const text = view.state.sliceDoc(selection.from, selection.to)
        const insertText = `\`${text || 'code'}\``
        view.dispatch({
          changes: { from: selection.from, to: selection.to, insert: insertText },
          selection: { anchor: selection.from + insertText.length }
        })
        break
      }
      case 'link': {
        const text = view.state.sliceDoc(selection.from, selection.to)
        const insertText = `[[${text || 'Note'}]]`
        view.dispatch({
          changes: { from: selection.from, to: selection.to, insert: insertText },
          selection: { anchor: selection.from + insertText.length }
        })
        break
      }
      case 'checklist': {
        const line = view.state.doc.lineAt(selection.from)
        const insertText = `- [ ] `
        view.dispatch({
          changes: { from: line.from, to: line.from, insert: insertText },
          selection: { anchor: selection.from + insertText.length }
        })
        break
      }
      case 'clear': {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: '' }
        })
        break
      }
    }
  }

  // Adjust coordinates to not overflow container edges
  const menuWidth = 190
  const menuHeight = 350
  const containerRect = containerEl?.getBoundingClientRect()
  const limitX = containerRect ? containerRect.width - menuWidth : 800
  const limitY = containerRect ? containerRect.height - menuHeight : 600
  
  const adjustedX = Math.min(x, limitX - 10)
  const adjustedY = Math.min(y, limitY - 10)

  return (
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        left: Math.max(10, adjustedX),
        top: Math.max(10, adjustedY),
        zIndex: 2000,
        width: menuWidth,
        background: 'rgba(22, 22, 22, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 8,
        padding: '6px 0',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
        animation: 'menuFadeIn 0.12s ease-out',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none'
      }}
    >
      <style>{`
        @keyframes menuFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .menu-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          color: var(--text-primary);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.12s ease;
          background: transparent;
          border: none;
          text-align: left;
          width: 100%;
        }
        .menu-item:hover:not(.disabled) {
          background: var(--accent-color);
          color: #ffffff;
        }
        .menu-item.disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .menu-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.06);
          margin: 4px 0;
        }
      `}</style>

      <button className={`menu-item \${!hasSelection ? 'disabled' : ''}`} onClick={() => executeAction('cut')} disabled={!hasSelection}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>
        <span>Cut</span>
      </button>

      <button className={`menu-item \${!hasSelection ? 'disabled' : ''}`} onClick={() => executeAction('copy')} disabled={!hasSelection}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        <span>Copy</span>
      </button>

      <button className="menu-item" onClick={() => executeAction('paste')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
        <span>Paste</span>
      </button>

      <button className="menu-item" onClick={() => executeAction('select-all')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4"></rect><path d="M9 12h6M12 9v6"></path></svg>
        <span>Select All</span>
      </button>

      <div className="menu-divider" />

      <button className="menu-item" onClick={() => executeAction('bold')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path></svg>
        <span>Bold</span>
      </button>

      <button className="menu-item" onClick={() => executeAction('italic')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"></line><line x1="14" y1="20" x2="5" y2="20"></line><line x1="15" y1="4" x2="9" y2="20"></line></svg>
        <span>Italic</span>
      </button>

      <button className="menu-item" onClick={() => executeAction('code')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
        <span>Code Inline</span>
      </button>

      <div className="menu-divider" />

      <button className="menu-item" onClick={() => executeAction('link')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
        <span>Wiki Link</span>
      </button>

      <button className="menu-item" onClick={() => executeAction('checklist')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M9 12l2 2 4-4"></path></svg>
        <span>Todo Item</span>
      </button>

      <div className="menu-divider" />

      <button className="menu-item" onClick={() => executeAction('clear')} style={{ color: '#ef4444' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        <span>Clear Document</span>
      </button>
    </div>
  )
}

interface SinglePaneAreaProps {
  paneId: string
  isActive: boolean
}

function SinglePaneArea({ paneId, isActive }: SinglePaneAreaProps) {
  const {
    panes,
    setActivePane,
    setTabContent,
    markTabDirty,
    files: vaultFiles
  } = useVaultStore()
  const vault = useVaultStore((s) => s.vault)
  const { saveFile, openFile, saveImage } = useVaultBridge()
  
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number } | null>(null)

  const lastPathRef = useRef<string | null>(null)
  const selectionRef = useRef<{ anchor: number; head: number } | null>(null)
  const scrollRef = useRef<number | null>(null)

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      setContextMenu({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    },
    []
  )

  const pane = panes.find((p) => p.id === paneId) || panes[0]
  const { openTabs, activeTabPath } = pane
  const activeTab = openTabs.find((t) => t.path === activeTabPath)

  useEffect(() => {
    setContextMenu(null)
  }, [activeTabPath])

  const {
    fontSize,
    lineWidth,
    readableLineLength,
    lineWrapping,
    lineNumbers,
    bracketMatching,
    closeBrackets,
    fontFamily,
    fontWeight,
    lineHeight,
    pluginsEnabled,
    showPreviewPane
  } = useSettingsStore()
  const defaultViewMode = useSettingsStore((s) => s.defaultViewMode)

  const isProgrammaticUpdate = useRef(false)

  const isCanvasFile = activeTabPath?.endsWith('.canvas') ?? false
  const isDrawingFile = activeTabPath?.endsWith('.excalidraw') ?? false
  const isDiffFile = activeTabPath?.startsWith('git-diff://') ?? false
  const actualPath = isDiffFile ? activeTabPath!.slice('git-diff://'.length) : activeTabPath

  const handleChange = useCallback(
    (content: string) => {
      if (!activeTabPath || isProgrammaticUpdate.current) return
      setTabContent(activeTabPath, content)
      markTabDirty(activeTabPath, true)
    },
    [activeTabPath, setTabContent, markTabDirty]
  )

  const handleLinkClick = useCallback(
    (linkText: string) => {
      const flat = flattenVaultFiles(vaultFiles)
      const match = flat.find((f) => {
        const relPathWithoutExt = f.relativePath.replace(/\.md$/i, '')
        const nameWithoutExt = f.name.replace(/\.md$/i, '')
        return (
          relPathWithoutExt.toLowerCase() === linkText.toLowerCase() ||
          nameWithoutExt.toLowerCase() === linkText.toLowerCase()
        )
      })
      if (match) openFile(match.path, match.name)
    },
    [vaultFiles, openFile]
  )

  const handleImagePaste = useCallback(
    async (base64: string, ext: string) => {
      return saveImage(base64, ext)
    },
    [saveImage]
  )

  const handleEditorDragOver = useCallback((e: React.DragEvent) => {
    const types = e.dataTransfer.types
    if (types.includes('application/meridian-file') || types.includes('text/plain')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
  }, [])

  const handleEditorDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const raw = e.dataTransfer.getData('application/meridian-file')
      const plainText = e.dataTransfer.getData('text/plain')

      let path = ''
      let relativePath = ''

      if (raw) {
        try {
          const fileInfo = JSON.parse(raw) as { path: string; name: string; relativePath: string }
          path = fileInfo.path
          relativePath = fileInfo.relativePath
        } catch {
          /* ignore */
        }
      }

      if (!relativePath && plainText) {
        path = plainText
        if (vault) {
          if (path.startsWith(vault.path)) {
            relativePath = path.slice(vault.path.length).replace(/^\/+/, '')
          } else {
            relativePath = path.split('/').pop() ?? ''
          }
        } else {
          relativePath = path.split('/').pop() ?? ''
        }
      }

      if (!relativePath) return

      const wikiLink = `[[${relativePath.replace(/\.md$/i, '')}]]`
      const view = viewRef.current
      if (view) {
        const state = view.state
        if (view.hasFocus) {
          const selection = state.selection.main
          view.dispatch({
            changes: { from: selection.from, to: selection.to, insert: wikiLink },
            selection: { anchor: selection.from + wikiLink.length }
          })
        } else {
          const docLength = state.doc.length
          const insertText =
            docLength === 0 || state.doc.toString().endsWith('\n') ? wikiLink : `\n${wikiLink}`
          view.dispatch({
            changes: { from: docLength, to: docLength, insert: insertText },
            selection: { anchor: docLength + insertText.length }
          })
        }
        view.focus()
      }
    },
    [vault]
  )

  const fileNamesRef = useRef<string[]>([])
  fileNamesRef.current = useMemo(
    () =>
      flattenVaultFiles(vaultFiles)
        .filter((f) => !f.isDirectory && f.name.endsWith('.md'))
        .map((f) => {
          if (vault && f.path.startsWith(vault.path)) {
            return f.path.slice(vault.path.length).replace(/^\/+/, '')
          }
          return f.name
        }),
    [vaultFiles, vault]
  )
  const stableGetFileNames = useCallback(() => fileNamesRef.current, [])

  useEffect(() => {
    const handleKeydown = async (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && activeTab && isActive) {
        e.preventDefault()
        await saveFile(activeTab.path, activeTab.content)
        markTabDirty(activeTab.path, false)
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [activeTab, saveFile, isActive, markTabDirty])

  // CodeMirror Initialization
  useEffect(() => {
    if (!editorRef.current || isCanvasFile || isDrawingFile || isDiffFile) return

    const initialSelection = (lastPathRef.current === activeTabPath && selectionRef.current)
      ? { anchor: selectionRef.current.anchor, head: selectionRef.current.head }
      : undefined

    const view = new EditorView({
      state: EditorState.create({
        doc: activeTab?.content ?? '',
        selection: initialSelection,
        extensions: [
          createMarkdownExtensions(
            handleChange,
            handleLinkClick,
            stableGetFileNames,
            fontSize,
            lineWidth,
            readableLineLength,
            handleImagePaste,
            lineWrapping,
            lineNumbers,
            bracketMatching,
            closeBrackets,
            fontFamily,
            fontWeight,
            lineHeight,
            pluginsEnabled.slashCommands,
            defaultViewMode === 'live-preview'
          ),
          EditorView.updateListener.of((update) => {
            if (!update.selectionSet && !update.docChanged) return
            const head = update.state.selection.main.head
            const line = update.state.doc.lineAt(head)
            const cursorPos = { line: line.number, col: head - line.from + 1 }
            let activeHeading: string | null = null
            for (let i = line.number; i >= 1; i--) {
              const text = update.state.doc.line(i).text
              const match = text.match(/^#{1,6}\s+(.+)/)
              if (match) {
                activeHeading = match[1].trim()
                break
              }
            }
            if (isActive) {
              useEditorStore.getState().setCursorPos(cursorPos)
              useEditorStore.getState().setActiveHeading(activeHeading)
            }
          })
        ]
      }),
      parent: editorRef.current
    })

    viewRef.current = view

    if (lastPathRef.current === activeTabPath && scrollRef.current !== null) {
      view.scrollDOM.scrollTop = scrollRef.current
    }

    // Reset temporary selection and scroll states
    selectionRef.current = null
    scrollRef.current = null
    lastPathRef.current = activeTabPath

    return () => {
      if (viewRef.current) {
        const sel = viewRef.current.state.selection.main
        selectionRef.current = { anchor: sel.anchor, head: sel.head }
        scrollRef.current = viewRef.current.scrollDOM.scrollTop
      }
      view.destroy()
      viewRef.current = null
      if (isActive) {
        useEditorStore.getState().setCursorPos(null)
        useEditorStore.getState().setActiveHeading(null)
      }
    }
  }, [
    activeTabPath,
    fontSize,
    lineWidth,
    readableLineLength,
    lineWrapping,
    lineNumbers,
    bracketMatching,
    closeBrackets,
    fontFamily,
    fontWeight,
    lineHeight,
    pluginsEnabled,
    isCanvasFile,
    isDrawingFile,
    isDiffFile,
    isActive,
    defaultViewMode
  ])

  // Sync content programmatically
  useEffect(() => {
    if (isCanvasFile || isDrawingFile || isDiffFile) return
    const view = viewRef.current
    if (!view || !activeTab) return
    const current = view.state.doc.toString()
    if (current !== activeTab.content) {
      isProgrammaticUpdate.current = true
      view.dispatch({
        changes: { from: 0, to: current.length, insert: activeTab.content }
      })
      isProgrammaticUpdate.current = false
    }
  }, [activeTab?.content, isCanvasFile, isDrawingFile, isDiffFile])

  // Show empty pane placeholder
  if (openTabs.length === 0) {
    return (
      <div
        onClick={() => {
          if (!isActive) setActivePane(paneId)
        }}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-tertiary)',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ textAlign: 'center', userSelect: 'none' }}>
          <div style={{ marginBottom: 12, opacity: 0.2 }}>
            <FileIcon size={40} color="var(--text-primary)" />
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '0 0 6px', fontWeight: 500 }}>
            No file open
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: 0, opacity: 0.6 }}>
            Open a file from the sidebar or press ⌘K
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={() => {
        if (!isActive) setActivePane(paneId)
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflow: 'hidden',
        
        boxSizing: 'border-box'
      }}
    >
      <TabBar paneId={paneId} />
      <Breadcrumb paneId={paneId} />
      {isDiffFile && activeTab ? (
        <DiffPane filePath={actualPath!} fileName={activeTab.name} />
      ) : isCanvasFile && activeTab ? (
        <CanvasView
          filePath={activeTab.path}
          content={activeTab.content}
          onSave={(path, content) => {
            setTabContent(path, content)
            saveFile(path, content)
          }}
        />
      ) : isDrawingFile && activeTab ? (
        <SketchpadView
          filePath={activeTab.path}
          content={activeTab.content}
          onSave={(path, content) => {
            setTabContent(path, content)
            saveFile(path, content)
          }}
        />
      ) : (
        <div
          ref={containerRef}
          onDragOver={handleEditorDragOver}
          onDrop={handleEditorDrop}
          style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}
        >
          <div
            ref={editorRef}
            onContextMenu={handleContextMenu}
            style={{ flex: 1, overflow: 'auto', height: '100%', background: 'var(--bg-tertiary)' }}
          />
          {activeTab && showPreviewPane && (
            <>
              <div style={{ width: 1, background: 'var(--border-color)' }} />
              <MarkdownPreview
                content={activeTab.content}
                onLinkClick={handleLinkClick}
                fontSize={fontSize}
                lineWidth={lineWidth}
                readableLineLength={readableLineLength}
                vaultPath={vault?.path}
              />
            </>
          )}
          {contextMenu && (
            <EditorContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              onClose={() => setContextMenu(null)}
              view={viewRef.current}
              containerEl={containerRef.current}
            />
          )}
        </div>
      )}
    </div>
  )
}

export function EditorArea() {
  const { panes, activePaneId, mergeAllPanes } = useVaultStore()
  const paneRefs = useRef<{ [paneId: string]: HTMLDivElement | null }>({})

  // Reset Layout also merges all split panes into one
  useEffect(() => {
    const handler = () => mergeAllPanes()
    window.addEventListener('layout:reset', handler)
    return () => window.removeEventListener('layout:reset', handler)
  }, [mergeAllPanes])

  const totalOpenTabs = useMemo(() => {
    return panes.reduce((acc, p) => acc + p.openTabs.length, 0)
  }, [panes])

  if (panes.length === 0 || (panes.length === 1 && totalOpenTabs === 0)) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
            <FileIcon size={48} color="var(--border-color)" />
          </div>
          <p>Open a note from the sidebar</p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>⌘K to search</p>
        </div>
      </div>
    )
  }

  // Handle panel resizing
  const startResize = (e: React.MouseEvent, index: number) => {
    e.preventDefault()
    const startX = e.clientX
    const leftPaneId = panes[index].id
    const rightPaneId = panes[index + 1].id
    
    const leftEl = paneRefs.current[leftPaneId]
    const rightEl = paneRefs.current[rightPaneId]
    if (!leftEl || !rightEl) return

    const startLeftWidth = leftEl.getBoundingClientRect().width
    const startRightWidth = rightEl.getBoundingClientRect().width

    const doDrag = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const newLeftWidth = Math.max(150, startLeftWidth + deltaX)
      const newRightWidth = Math.max(150, startRightWidth - deltaX)

      leftEl.style.flex = 'none'
      leftEl.style.width = `${newLeftWidth}px`
      rightEl.style.flex = 'none'
      rightEl.style.width = `${newRightWidth}px`
    }

    const stopDrag = () => {
      window.removeEventListener('mousemove', doDrag)
      window.removeEventListener('mouseup', stopDrag)
    }

    window.addEventListener('mousemove', doDrag)
    window.addEventListener('mouseup', stopDrag)
  }

  // Detect general layout splits direction
  const isVertical = panes.every((p) => p.direction !== 'horizontal')

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isVertical ? 'row' : 'column',
        flex: 1,
        overflow: 'hidden',
        background: 'var(--bg-primary)'
      }}
    >
      {panes.map((pane, index) => {
        const isActive = pane.id === activePaneId
        return (
          <React.Fragment key={pane.id}>
            {index > 0 && (
              <div
                onMouseDown={(e) => startResize(e, index - 1)}
                style={{
                  width: isVertical ? 4 : '100%',
                  height: isVertical ? '100%' : 4,
                  background: 'var(--border-color)',
                  cursor: isVertical ? 'col-resize' : 'row-resize',
                  zIndex: 20,
                  flexShrink: 0,
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--accent-color)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--border-color)'
                }}
              />
            )}
            <div
              ref={(el) => {
                paneRefs.current[pane.id] = el
              }}
              style={{
                flex: 1,
                display: 'flex',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              <SinglePaneArea paneId={pane.id} isActive={isActive} />
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}
