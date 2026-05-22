import React, { useEffect, useRef, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
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

import { flattenVaultFiles } from './markdownUtils'
import { EditorContextMenu } from './EditorContextMenu'
import { useEditorDnd } from './useEditorDnd'

const SPLIT_KEY = 'meridian-split-ratio'

interface SinglePaneAreaProps {
  paneId: string
  isActive: boolean
}

export function SinglePaneArea({ paneId, isActive }: SinglePaneAreaProps) {
  const { t } = useTranslation()
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
  const previewScrollRef = useRef<HTMLDivElement>(null)
  const scrollSyncRef = useRef(false)
  const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number } | null>(null)
  const [splitRatio, setSplitRatio] = React.useState<number>(() => {
    try {
      const v = localStorage.getItem(SPLIT_KEY)
      const parsed = v ? parseFloat(v) : NaN
      return !isNaN(parsed) ? Math.max(0.2, Math.min(0.8, parsed)) : 0.5
    } catch {
      return 0.5
    }
  })

  const startSplitDrag = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const container = containerRef.current
    if (!container) return
    const onMove = (mv: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      const newRatio = Math.max(0.2, Math.min(0.8, (mv.clientX - rect.left) / rect.width))
      setSplitRatio(newRatio)
      try { localStorage.setItem(SPLIT_KEY, String(newRatio)) } catch { /* ignore */ }
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

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
    pluginsEnabled
  } = useSettingsStore()

  const paragraphSpacing = useSettingsStore((s) => s.paragraphSpacing)
  const showInvisibles = useSettingsStore((s) => s.showInvisibles)
  const indentWithTabs = useSettingsStore((s) => s.indentWithTabs)
  const tabSize = useSettingsStore((s) => s.tabSize)
  const typingMode = useSettingsStore((s) => s.typingMode)
  const spellCheck = useSettingsStore((s) => s.spellCheck)
  const spellCheckLanguage = useSettingsStore((s) => s.spellCheckLanguage)

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

  const { handleImagePaste, handleEditorDragOver, handleEditorDrop } = useEditorDnd(
    viewRef,
    vault,
    saveImage
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
            lineHeight,
            pluginsEnabled.slashCommands,
            pluginsEnabled.vimMode,
            showInvisibles,
            indentWithTabs,
            tabSize
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
          }),
          ...(typingMode !== 'normal' ? [
            EditorView.updateListener.of((update) => {
              if (!update.selectionSet && !update.docChanged) return
              const view = update.view
              if (typingMode === 'typewriter') {
                const { head } = update.state.selection.main
                const line = view.lineBlockAt(head)
                const target = line.top - view.scrollDOM.clientHeight / 2 + line.height / 2
                view.scrollDOM.scrollTop = Math.max(0, target)
              }
              if (typingMode === 'focus') {
                const { head } = update.state.selection.main
                const activeLine = update.state.doc.lineAt(head).number
                view.dom.querySelectorAll('.cm-line').forEach((el, i) => {
                  ;(el as HTMLElement).style.opacity = i + 1 === activeLine ? '1' : '0.25'
                  ;(el as HTMLElement).style.transition = 'opacity 0.15s'
                })
              }
            })
          ] : [])
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
    pluginsEnabled,
    isCanvasFile,
    isDrawingFile,
    isDiffFile,
    isActive,
    showInvisibles,
    indentWithTabs,
    tabSize,
    typingMode
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

  // Scroll sync between editor and preview
  useEffect(() => {
    const view = viewRef.current
    const preview = previewScrollRef.current
    if (!view || !preview || isCanvasFile || isDrawingFile || isDiffFile) return

    let rafId: number

    const onEditorScroll = () => {
      if (scrollSyncRef.current) return
      const el = view.scrollDOM
      const ratio = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight)
      scrollSyncRef.current = true
      preview.scrollTop = ratio * Math.max(1, preview.scrollHeight - preview.clientHeight)
      rafId = requestAnimationFrame(() => { scrollSyncRef.current = false })
    }

    const onPreviewScroll = () => {
      if (scrollSyncRef.current) return
      const ratio = preview.scrollTop / Math.max(1, preview.scrollHeight - preview.clientHeight)
      scrollSyncRef.current = true
      view.scrollDOM.scrollTop = ratio * Math.max(1, view.scrollDOM.scrollHeight - view.scrollDOM.clientHeight)
      rafId = requestAnimationFrame(() => { scrollSyncRef.current = false })
    }

    view.scrollDOM.addEventListener('scroll', onEditorScroll, { passive: true })
    preview.addEventListener('scroll', onPreviewScroll, { passive: true })

    return () => {
      view.scrollDOM.removeEventListener('scroll', onEditorScroll)
      preview.removeEventListener('scroll', onPreviewScroll)
      cancelAnimationFrame(rafId)
      scrollSyncRef.current = false
    }
  }, [activeTabPath, isCanvasFile, isDrawingFile, isDiffFile])

  // Reset focus mode opacity when typingMode changes away from 'focus'
  useEffect(() => {
    if (typingMode !== 'focus') {
      viewRef.current?.dom.querySelectorAll('.cm-line').forEach((el) => {
        ;(el as HTMLElement).style.opacity = ''
      })
    }
  }, [typingMode])

  // Spell check: toggle spellcheck attribute and set language via IPC
  useEffect(() => {
    const content = viewRef.current?.dom.querySelector('.cm-content') as HTMLElement | null
    if (content) {
      content.setAttribute('spellcheck', spellCheck ? 'true' : 'false')
    }
    if (spellCheck) {
      ;(window.vault as any)?.setSpellLanguage?.(spellCheckLanguage)?.catch?.(() => {})
    }
  }, [spellCheck, spellCheckLanguage])

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
            {t('editor.noFileOpen')}
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: 0, opacity: 0.6 }}>
            {t('editor.openFileInstructions')}
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
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <TabBar paneId={paneId} />
      </div>
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
            style={{
              '--paragraph-spacing': `${paragraphSpacing}em`,
              width: activeTab ? `${splitRatio * 100}%` : '100%',
              flexShrink: 0,
              overflow: 'auto',
              height: '100%',
              background: 'var(--bg-tertiary)'
            } as React.CSSProperties}
          />
          {activeTab && (
            <>
              <div
                onMouseDown={startSplitDrag}
                style={{
                  width: 5,
                  flexShrink: 0,
                  cursor: 'col-resize',
                  background: 'var(--border-color)',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-color)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--border-color)')}
              />
              <MarkdownPreview
                ref={previewScrollRef}
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
