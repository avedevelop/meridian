import { useVaultStore } from '../../store/useVaultStore'
import { FilesPanel } from './FilesPanel'
import { SidebarGraphPanel } from './SidebarGraphPanel'
import { CalendarPanel } from './CalendarPanel'
import { TasksPanel } from './TasksPanel'
import { GitPanel } from './GitPanel'

interface SidebarProps {
  activeTab: 'files' | 'search' | 'graph' | 'calendar' | 'tasks' | 'git'
  onTabChange: (tab: 'files' | 'search' | 'graph' | 'calendar' | 'tasks' | 'git') => void
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { vault } = useVaultStore()

  if (!vault) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {activeTab === 'files' && <FilesPanel />}
        {activeTab === 'git' && <GitPanel />}
        {activeTab === 'graph' && <SidebarGraphPanel onTabChange={onTabChange} />}
        {activeTab === 'calendar' && <CalendarPanel />}
        {activeTab === 'tasks' && <TasksPanel />}
      </div>
    </div>
  )
}
