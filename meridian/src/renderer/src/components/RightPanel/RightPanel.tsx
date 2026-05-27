import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BacklinksPanel } from './BacklinksPanel'
import { TagsPanel } from './TagsPanel'
import { TocPanel } from './TocPanel'
import { LocalGraphView } from './LocalGraphView'
import { PropertiesPanel } from './PropertiesPanel'
import { RelationshipsPanel } from './RelationshipsPanel'
import { useSettingsStore } from '../../store/useSettingsStore'
import { SlidersIcon, LinkIcon, TagIcon, OutlineIcon, WebIcon } from '../Icons'

type RightTab = 'backlinks' | 'tags' | 'toc' | 'local-graph' | 'properties' | 'relationships'

export function RightPanel() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<RightTab>('properties')
  const plugins = useSettingsStore((s) => s.pluginsEnabled)

  const tabs = [
    {
      id: 'properties',
      label: t('rightPanel.properties'),
      Icon: (props: any) => <SlidersIcon size={15} {...props} />
    },
    {
      id: 'relationships',
      label: t('rightPanel.relationships'),
      Icon: (props: any) => <LinkIcon size={15} {...props} />
    },
    plugins.backlinksPanel
      ? {
          id: 'backlinks',
          label: t('rightPanel.backlinks'),
          Icon: (props: any) => <LinkIcon size={15} {...props} />
        }
      : null,
    plugins.tagsPanel
      ? {
          id: 'tags',
          label: t('rightPanel.tags'),
          Icon: (props: any) => <TagIcon size={15} {...props} />
        }
      : null,
    plugins.tocPanel
      ? {
          id: 'toc',
          label: t('rightPanel.toc'),
          Icon: (props: any) => <OutlineIcon size={15} {...props} />
        }
      : null,
    {
      id: 'local-graph',
      label: t('rightPanel.localGraph'),
      Icon: (props: any) => <WebIcon size={15} {...props} />
    }
  ].filter((t) => t !== null) as {
    id: RightTab
    label: string
    Icon: (props: any) => React.ReactElement
  }[]

  const activeTabExists = tabs.some((t) => t.id === activeTab)
  const effectiveTab = activeTabExists ? activeTab : tabs[0]?.id || 'local-graph'

  return (
    <div className="right-panel-shell">
      {tabs.length > 0 && (
        <div className="right-panel-tabs" role="tablist" aria-label={t('rightPanel.properties')}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className="right-panel-tab"
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
              role="tab"
              aria-selected={effectiveTab === tab.id}
            >
              <tab.Icon />
            </button>
          ))}
        </div>
      )}
      <div className="right-panel-content">
        {effectiveTab === 'properties' && <PropertiesPanel />}
        {effectiveTab === 'relationships' && <RelationshipsPanel />}
        {effectiveTab === 'backlinks' && <BacklinksPanel />}
        {effectiveTab === 'tags' && <TagsPanel />}
        {effectiveTab === 'toc' && <TocPanel />}
        {effectiveTab === 'local-graph' && <LocalGraphView />}
      </div>
    </div>
  )
}
