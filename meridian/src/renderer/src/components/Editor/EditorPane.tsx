import React, { useEffect, useRef, useCallback } from 'react'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { useVaultStore } from '../../store/useVaultStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'
import { useLinkStore } from '../../store/useLinkStore'
import { createMarkdownExtensions } from './extensions/markdownExtensions'
import { TabBar } from './TabBar'
import { MarkdownPreview } from './MarkdownPreview'

function flattenVaultFiles(files: import('@shared/types').VaultFile[]): import('@shared/types').VaultFile[] {
  return files.flatMap(f => f.isDirectory ? flattenVaultFiles(f.children ?? []) : [f])
}

export function EditorArea() {
  const { openTabs, activeTabPath, markTabDirty, setTabContent, files: vaultFiles } = useVaultStore()
  const { saveFile, openFile } = useVaultBridge()
  const allFiles = useLinkStore(s => s.allFiles)
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const activeTab = openTabs.find(t => t.path === activeTabPath)

  const handleChange = useCallback((content: string) => {
    if (!activeTabPath) return
    setTabContent(activeTabPath, content)
    markTabDirty(activeTabPath, true)
  }, [activeTabPath, setTabContent, markTabDirty])

  const handleLinkClick = useCallback((linkText: string) => {
    // Use vault file tree (always fresh) + link index as fallback
    const flat = flattenVaultFiles(vaultFiles)
    const match = flat.find(f => {
      const name = f.name.replace(/\.md$/i, '')
      return name.toLowerCase() === linkText.toLowerCase()
    })
    if (match) openFile(match.path, match.name)
  }, [vaultFiles, openFile])

  const getFileNames = useCallback(() => {
    // Use vault file tree so newly created files always appear in autocomplete
    return flattenVaultFiles(vaultFiles)
      .filter(f => !f.isDirectory && f.name.endsWith('.md'))
      .map(f => f.name)
  }, [vaultFiles])

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

  useEffect(() => {
    if (!editorRef.current) return

    const view = new EditorView({
      state: EditorState.create({
        doc: activeTab?.content ?? '',
        extensions: createMarkdownExtensions(handleChange, handleLinkClick, getFileNames),
      }),
      parent: editorRef.current,
    })

    viewRef.current = view
    return () => { view.destroy(); viewRef.current = null }
  }, [activeTabPath])

  useEffect(() => {
    const view = viewRef.current
    if (!view || !activeTab) return
    const current = view.state.doc.toString()
    if (current !== activeTab.content) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: activeTab.content },
      })
    }
  }, [activeTab?.content])

  if (openTabs.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
          <p>Open a note from the sidebar</p>
          <p style={{ fontSize: 12, color: '#333' }}>⌘K to search</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <TabBar />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div ref={editorRef} style={{ flex: 1, overflow: 'auto', height: '100%' }} />
        {activeTab && (
          <>
            <div style={{ width: 1, background: '#2a2a2a' }} />
            <MarkdownPreview content={activeTab.content} />
          </>
        )}
      </div>
    </div>
  )
}
