import { useMemo } from 'react'
import { useVaultStore } from '../store/useVaultStore'
import { useEditorStore } from '../store/useEditorStore'

export function StatusBar() {
  const { openTabs, activeTabPath } = useVaultStore()
  const activeTab = openTabs.find(t => t.path === activeTabPath)
  const cursorPos = useEditorStore(s => s.cursorPos)

  const wordCount = useMemo(() => {
    if (!activeTab?.content) return 0
    return activeTab.content.trim().split(/\s+/).filter(Boolean).length
  }, [activeTab?.content])

  return (
    <div style={{
      height: 22, background: '#161616', borderTop: '1px solid #2a2a2a',
      display: 'flex', alignItems: 'center', padding: '0 12px',
      color: '#555', fontSize: 11, gap: 16, flexShrink: 0,
    }}>
      <span>{wordCount} words</span>
      {cursorPos && <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>}
      <span>Markdown</span>
      {activeTab?.isDirty && <span style={{ color: '#7c6af7' }}>Unsaved</span>}
      <span style={{ marginLeft: 'auto' }}>Meridian</span>
    </div>
  )
}
