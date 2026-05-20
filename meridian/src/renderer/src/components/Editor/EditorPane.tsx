import { useEffect, useRef, useCallback, useMemo } from 'react'
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

function flattenVaultFiles(
  files: import('@shared/types').VaultFile[]
): import('@shared/types').VaultFile[] {
  return files.flatMap((f) => (f.isDirectory ? flattenVaultFiles(f.children ?? []) : [f]))
}

export function EditorArea() {
  const {
    openTabs,
    activeTabPath,
    markTabDirty,
    setTabContent,
    files: vaultFiles
  } = useVaultStore()
  const vault = useVaultStore((s) => s.vault)
  const { saveFile, openFile, saveImage } = useVaultBridge()
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
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
  // Flag to suppress dirty marking during programmatic content sync from store
  const isProgrammaticUpdate = useRef(false)

  const isCanvasFile = activeTabPath?.endsWith('.canvas') ?? false

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
      // Use vault file tree (always fresh) + link index as fallback
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

      // Create a clean wiki link format
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
          // Otherwise, append it to the end of the file
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

  // Stable ref so CodeMirror always gets latest file list even after re-renders
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
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && activeTab) {
        e.preventDefault()
        await saveFile(activeTab.path, activeTab.content)
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [activeTab, saveFile])

  // Only mount CodeMirror for non-canvas tabs
  useEffect(() => {
    if (!editorRef.current || isCanvasFile) return

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
            useEditorStore.getState().setCursorPos(cursorPos)
            useEditorStore.getState().setActiveHeading(activeHeading)
          })
        ]
      }),
      parent: editorRef.current
    })

    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
      useEditorStore.getState().setCursorPos(null)
      useEditorStore.getState().setActiveHeading(null)
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
    isCanvasFile
  ])

  useEffect(() => {
    if (isCanvasFile) return
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
  }, [activeTab?.content, isCanvasFile])

  if (openTabs.length === 0) {
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <TabBar />
      <Breadcrumb />
      {isCanvasFile && activeTab ? (
        <CanvasView
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
