import { Suspense } from 'react'
import { useVaultStore } from '../../store/useVaultStore'
import { FilesPanel } from './FilesPanel'
import { lazyNamed } from '../../lib/lazyNamed'
import { ViewsPanel } from './ViewsPanel'

// Everything except the file list loads on first use, keeping startup light.
const SidebarGraphPanel = lazyNamed(() => import('./SidebarGraphPanel'), 'SidebarGraphPanel')
const CalendarPanel = lazyNamed(() => import('./CalendarPanel'), 'CalendarPanel')
const TasksPanel = lazyNamed(() => import('./TasksPanel'), 'TasksPanel')
const GitPanel = lazyNamed(() => import('./GitPanel'), 'GitPanel')
const InsightsPanel = lazyNamed(() => import('../Insights/InsightsPanel'), 'InsightsPanel')

type SidebarTab = 'files' | 'search' | 'graph' | 'calendar' | 'tasks' | 'views' | 'git' | 'insights'

interface SidebarProps {
  activeTab: SidebarTab
  onTabChange: (tab: SidebarTab) => void
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { vault } = useVaultStore()

  if (!vault) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
      >
        {activeTab === 'files' && <FilesPanel />}
        <Suspense fallback={null}>
          {activeTab === 'git' && <GitPanel />}
          {activeTab === 'graph' && <SidebarGraphPanel onTabChange={onTabChange} />}
          {activeTab === 'calendar' && <CalendarPanel />}
          {activeTab === 'tasks' && <TasksPanel />}
          {activeTab === 'views' && <ViewsPanel />}
          {activeTab === 'insights' && <InsightsPanel onTabChange={onTabChange} />}
        </Suspense>
      </div>
    </div>
  )
}
