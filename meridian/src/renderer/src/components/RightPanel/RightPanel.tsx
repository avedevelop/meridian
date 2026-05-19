import { useState } from 'react'
import { BacklinksPanel } from './BacklinksPanel'
import { TagsPanel } from './TagsPanel'
import { TocPanel } from './TocPanel'
import { LocalGraphView } from './LocalGraphView'
import { useSettingsStore } from '../../store/useSettingsStore'

type RightTab = 'backlinks' | 'tags' | 'toc' | 'local-graph'

export function RightPanel() {
  const [activeTab, setActiveTab] = useState<RightTab>('backlinks')
  const plugins = useSettingsStore((s) => s.pluginsEnabled)

  const tabs: { id: RightTab; label: string }[] = [
    plugins.backlinksPanel ? { id: 'backlinks', label: 'Links' } : null,
    plugins.tagsPanel ? { id: 'tags', label: 'Tags' } : null,
    plugins.tocPanel ? { id: 'toc', label: 'ToC' } : null,
    { id: 'local-graph', label: 'Local' }
  ].filter((t): t is { id: RightTab; label: string } => t !== null)

  const activeTabExists = tabs.some((t) => t.id === activeTab)
  const effectiveTab = activeTabExists ? activeTab : tabs[0]?.id || 'local-graph'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {tabs.length > 0 && (
        <div style={{ display: 'flex', borderBottom: '1px solid #2a2a2a', flexShrink: 0 }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '6px 0',
                border: 'none',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                background: effectiveTab === tab.id ? '#1a1a1a' : 'transparent',
                color: effectiveTab === tab.id ? '#fff' : '#555',
                borderBottom:
                  effectiveTab === tab.id ? '2px solid #7c6af7' : '2px solid transparent'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {effectiveTab === 'backlinks' && <BacklinksPanel />}
        {effectiveTab === 'tags' && <TagsPanel />}
        {effectiveTab === 'toc' && <TocPanel />}
        {effectiveTab === 'local-graph' && <LocalGraphView />}
      </div>
    </div>
  )
}
