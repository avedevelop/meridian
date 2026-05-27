import { useVaultStore } from '../../store/useVaultStore'
import { FilesPanel } from './FilesPanel'
import { SidebarGraphPanel } from './SidebarGraphPanel'
import { CalendarPanel } from './CalendarPanel'
import { TasksPanel } from './TasksPanel'
import { GitPanel } from './GitPanel'
import { ViewsPanel } from './ViewsPanel'

type SidebarTab = 'files' | 'search' | 'graph' | 'calendar' | 'tasks' | 'views' | 'git'

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
        {activeTab === 'git' && <GitPanel />}
        {activeTab === 'graph' && <SidebarGraphPanel onTabChange={onTabChange} />}
        {activeTab === 'calendar' && <CalendarPanel />}
        {activeTab === 'tasks' && <TasksPanel />}
        {activeTab === 'views' && <ViewsPanel />}
      </div>
    </div>
  )
}
