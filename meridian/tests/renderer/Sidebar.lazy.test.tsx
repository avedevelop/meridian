import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('../../src/renderer/src/components/Sidebar/FilesPanel', () => ({
  FilesPanel: () => <div>files-panel</div>
}))
vi.mock('../../src/renderer/src/components/Sidebar/TasksPanel', () => ({
  TasksPanel: () => <div>tasks-panel</div>
}))
vi.mock('../../src/renderer/src/components/Sidebar/ViewsPanel', () => ({
  ViewsPanel: () => <div>views-panel</div>
}))

import { Sidebar } from '../../src/renderer/src/components/Sidebar/Sidebar'
import { useVaultStore } from '../../src/renderer/src/store/useVaultStore'

describe('Sidebar lazy panels', () => {
  beforeEach(() => {
    useVaultStore.setState({ vault: { path: '/v', name: 'v' } as never })
  })

  it('renders nothing without a vault', () => {
    useVaultStore.setState({ vault: null })
    const { container } = render(<Sidebar activeTab="files" onTabChange={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows the file list immediately', () => {
    render(<Sidebar activeTab="files" onTabChange={vi.fn()} />)
    expect(screen.getByText('files-panel')).toBeInTheDocument()
  })

  it('loads another panel on demand', async () => {
    render(<Sidebar activeTab="tasks" onTabChange={vi.fn()} />)
    expect(await screen.findByText('tasks-panel')).toBeInTheDocument()
    expect(screen.queryByText('files-panel')).not.toBeInTheDocument()
  })
})
