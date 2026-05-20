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

function flattenVaultFiles(
  files: import('@shared/types').VaultFile[]
): import('@shared/types').VaultFile[] {
  return files.flatMap((f) => (f.isDirectory ? flattenVaultFiles(f.children ?? []) : [f]))
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

  const pane = panes.find((p) => p.id === paneId) || panes[0]
  const { openTabs, activeTabPath } = pane
  const activeTab = openTabs.find((t) => t.path === activeTabPath)

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
    lineHeight
  } = useSettingsStore()

  const isProgrammaticUpdate = useRef(false)

  const isCanvasFile = activeTabPath?.endsWith('.canvas') ?? false
  const isDrawingFile = activeTabPath?.endsWith('.excalidraw') ?? false

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
        .map((f) => f.name),
    [vaultFiles]
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
    if (!editorRef.current || isCanvasFile || isDrawingFile) return

    const view = new EditorView({
      state: EditorState.create({
        doc: activeTab?.content ?? '',
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
            lineHeight
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
    return () => {
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
    isCanvasFile,
    isDrawingFile,
    isActive
  ])

  // Sync content programmatically
  useEffect(() => {
    if (isCanvasFile || isDrawingFile) return
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
  }, [activeTab?.content, isCanvasFile, isDrawingFile])

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
          color: 'var(--text-secondary)',
          background: 'var(--bg-tertiary)',
          border: isActive ? '1px solid var(--accent-color)' : '1px solid transparent',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
            <FileIcon size={48} color="var(--border-color)" />
          </div>
          <p>Pane is empty</p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Open a file or split screen</p>
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
        border: isActive ? '1px solid var(--accent-color)' : '1px solid transparent',
        boxSizing: 'border-box'
      }}
    >
      <TabBar paneId={paneId} />
      <Breadcrumb paneId={paneId} />
      {isCanvasFile && activeTab ? (
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
          onDragOver={handleEditorDragOver}
          onDrop={handleEditorDrop}
          style={{ flex: 1, display: 'flex', overflow: 'hidden' }}
        >
          <div
            ref={editorRef}
            style={{ flex: 1, overflow: 'auto', height: '100%', background: 'var(--bg-tertiary)' }}
          />
          {activeTab && (
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
        </div>
      )}
    </div>
  )
}

export function EditorArea() {
  const { panes, activePaneId } = useVaultStore()
  const paneRefs = useRef<{ [paneId: string]: HTMLDivElement | null }>({})

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
