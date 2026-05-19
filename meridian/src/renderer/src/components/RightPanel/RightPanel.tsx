import { useState } from 'react'
import { BacklinksPanel } from './BacklinksPanel'
import { TagsPanel } from './TagsPanel'
import { TocPanel } from './TocPanel'

type RightTab = 'backlinks' | 'tags' | 'toc'

export function RightPanel() {
  const [activeTab, setActiveTab] = useState<RightTab>('backlinks')

  const tabs: { id: RightTab; label: string }[] = [
    { id: 'backlinks', label: 'Links' },
    { id: 'tags', label: 'Tags' },
    { id: 'toc', label: 'ToC' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #2a2a2a', flexShrink: 0 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '6px 0', border: 'none', cursor: 'pointer', fontSize: 11,
              fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
              background: activeTab === tab.id ? '#1a1a1a' : 'transparent',
              color: activeTab === tab.id ? '#fff' : '#555',
              borderBottom: activeTab === tab.id ? '2px solid #7c6af7' : '2px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'backlinks' && <BacklinksPanel />}
        {activeTab === 'tags' && <TagsPanel />}
        {activeTab === 'toc' && <TocPanel />}
      </div>
    </div>
  )
}
