import { useState } from 'react'
import { BacklinksPanel } from './BacklinksPanel'
import { TagsPanel } from './TagsPanel'
import { TocPanel } from './TocPanel'
import { LocalGraphView } from './LocalGraphView'
import { PropertiesPanel } from './PropertiesPanel'
import { useSettingsStore } from '../../store/useSettingsStore'
import { SlidersIcon, LinkIcon, TagIcon, OutlineIcon, WebIcon } from '../Icons'

type RightTab = 'backlinks' | 'tags' | 'toc' | 'local-graph' | 'properties'

export function RightPanel() {
  const [activeTab, setActiveTab] = useState<RightTab>('properties')
  const plugins = useSettingsStore((s) => s.pluginsEnabled)

  const tabs = ([
    { id: 'properties', label: 'Properties', Icon: (props: any) => <SlidersIcon size={15} {...props} /> },
    plugins.backlinksPanel ? { id: 'backlinks', label: 'Backlinks & Tags', Icon: (props: any) => <LinkIcon size={15} {...props} /> } : null,
    plugins.tagsPanel ? { id: 'tags', label: 'Tags List', Icon: (props: any) => <TagIcon size={15} {...props} /> } : null,
    plugins.tocPanel ? { id: 'toc', label: 'Outline (ToC)', Icon: (props: any) => <OutlineIcon size={15} {...props} /> } : null,
    { id: 'local-graph', label: 'Local Graph', Icon: (props: any) => <WebIcon size={15} {...props} /> }
  ].filter((t) => t !== null) as { id: RightTab; label: string; Icon: (props: any) => React.ReactElement }[])

  const activeTabExists = tabs.some((t) => t.id === activeTab)
  const effectiveTab = activeTabExists ? activeTab : tabs[0]?.id || 'local-graph'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {tabs.length > 0 && (
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
              onMouseEnter={(e) => {
                if (effectiveTab !== tab.id) {
                  e.currentTarget.style.color = 'var(--text-primary)'
                  e.currentTarget.style.background = 'var(--bg-surface)'
                }
              }}
              onMouseLeave={(e) => {
                if (effectiveTab !== tab.id) {
                  e.currentTarget.style.color = 'var(--text-secondary)'
                  e.currentTarget.style.background = 'transparent'
                }
              }}
              style={{
                flex: 1,
                padding: '12px 0',
                border: 'none',
                cursor: 'pointer',
                background: effectiveTab === tab.id ? 'var(--bg-primary)' : 'transparent',
                color: effectiveTab === tab.id ? 'var(--accent-color)' : 'var(--text-secondary)',
                borderBottom:
                  effectiveTab === tab.id ? '3px solid var(--accent-color)' : '3px solid transparent',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <tab.Icon />
            </button>
          ))}
        </div>
      )}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {effectiveTab === 'properties' && <PropertiesPanel />}
        {effectiveTab === 'backlinks' && <BacklinksPanel />}
        {effectiveTab === 'tags' && <TagsPanel />}
        {effectiveTab === 'toc' && <TocPanel />}
        {effectiveTab === 'local-graph' && <LocalGraphView />}
      </div>
    </div>
  )
}
