import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TabBar } from '../../src/renderer/src/components/Editor/TabBar'
import { useVaultStore } from '../../src/renderer/src/store/useVaultStore'

beforeEach(() => {
  useVaultStore.setState({
    openTabs: [
      { path: '/v/A.md', name: 'A.md', content: '', isDirty: false },
      { path: '/v/B.md', name: 'B.md', content: '', isDirty: true },
    ],
    activeTabPath: '/v/A.md',
  })
})

describe('TabBar', () => {
  it('renders all open tab names', () => {
    render(<TabBar />)
    expect(screen.getByText('A.md')).toBeInTheDocument()
    expect(screen.getByText('B.md')).toBeInTheDocument()
  })

  it('shows dirty indicator for unsaved tabs', () => {
    render(<TabBar />)
    expect(screen.getByText('●')).toBeInTheDocument()
  })

  it('calls setActiveTab when tab is clicked', () => {
    render(<TabBar />)
    fireEvent.click(screen.getByText('B.md'))
    expect(useVaultStore.getState().activeTabPath).toBe('/v/B.md')
  })
})
