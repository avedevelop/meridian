import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TabBar } from '../../src/renderer/src/components/Editor/TabBar'
import { useVaultStore } from '../../src/renderer/src/store/useVaultStore'

const PANE_ID = 'pane-main'

beforeEach(() => {
  useVaultStore.setState({
    panes: [
      {
        id: PANE_ID,
        openTabs: [
          { path: '/v/A.md', name: 'A.md', content: '', isDirty: false },
          { path: '/v/B.md', name: 'B.md', content: '', isDirty: true }
        ],
        activeTabPath: '/v/A.md'
      }
    ],
    activePaneId: PANE_ID,
    openTabs: [
      { path: '/v/A.md', name: 'A.md', content: '', isDirty: false },
      { path: '/v/B.md', name: 'B.md', content: '', isDirty: true }
    ],
    activeTabPath: '/v/A.md'
  })
})

describe('TabBar', () => {
  it('renders all open tab names', () => {
    render(<TabBar paneId={PANE_ID} />)
    expect(screen.getByText('A.md')).toBeInTheDocument()
    expect(screen.getByText('B.md')).toBeInTheDocument()
  })

  it('shows dirty indicator for unsaved tabs', () => {
    render(<TabBar paneId={PANE_ID} />)
    expect(screen.getByText('●')).toBeInTheDocument()
  })

  it('calls setActiveTab when tab is clicked', () => {
    render(<TabBar paneId={PANE_ID} />)
    fireEvent.click(screen.getByText('B.md'))
    const state = useVaultStore.getState()
    const pane = state.panes.find((p) => p.id === PANE_ID)
    expect(pane?.activeTabPath).toBe('/v/B.md')
  })

  it('has user-select: none on root element', () => {
    const { container } = render(<TabBar paneId={PANE_ID} />)
    const root = container.firstChild as HTMLElement
    expect(root.style.userSelect).toBe('none')
  })
})
