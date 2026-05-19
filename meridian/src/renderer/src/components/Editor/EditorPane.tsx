import React, { useEffect, useRef, useCallback } from 'react'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { useVaultStore } from '../../store/useVaultStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'
import { createMarkdownExtensions } from './extensions/markdownExtensions'
import { TabBar } from './TabBar'
import { MarkdownPreview } from './MarkdownPreview'

export function EditorArea() {
  const { openTabs, activeTabPath, markTabDirty, setTabContent } = useVaultStore()
  const { saveFile } = useVaultBridge()
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const activeTab = openTabs.find(t => t.path === activeTabPath)

  const handleChange = useCallback((content: string) => {
    if (!activeTabPath) return
    setTabContent(activeTabPath, content)
    markTabDirty(activeTabPath, true)
  }, [activeTabPath, setTabContent, markTabDirty])

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
        extensions: createMarkdownExtensions(handleChange),
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
