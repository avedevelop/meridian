import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { CommandPalette } from '../../src/renderer/src/components/CommandPalette/CommandPalette'
import { useLinkStore } from '../../src/renderer/src/store/useLinkStore'

const mockFiles = [
  { path: '/v/Alpha.md', name: 'Alpha.md' },
  { path: '/v/Beta.md', name: 'Beta.md' },
  { path: '/v/Gamma.md', name: 'Gamma.md' }
]

describe('CommandPalette', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useLinkStore.getState().reset()
    mockFiles.forEach((f) => {
      useLinkStore.getState().indexFile(f.path, f.name, '', '/v')
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing when closed', () => {
    const { container } = render(
      <CommandPalette isOpen={false} onClose={vi.fn()} files={mockFiles} onFileSelect={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders search input when open', () => {
    render(
      <CommandPalette isOpen={true} onClose={vi.fn()} files={mockFiles} onFileSelect={vi.fn()} />
    )
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })

  it('filters files by query', () => {
    render(
      <CommandPalette isOpen={true} onClose={vi.fn()} files={mockFiles} onFileSelect={vi.fn()} />
    )
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'alph' } })
    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.queryByText('Beta')).not.toBeInTheDocument()
  })

  it('calls onFileSelect when item is clicked', () => {
    const onFileSelect = vi.fn()
    render(
      <CommandPalette
        isOpen={true}
        onClose={vi.fn()}
        files={mockFiles}
        onFileSelect={onFileSelect}
      />
    )
    fireEvent.click(screen.getByText('Alpha'))
    expect(onFileSelect).toHaveBeenCalledWith('/v/Alpha.md', 'Alpha.md')
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    render(
      <CommandPalette isOpen={true} onClose={onClose} files={mockFiles} onFileSelect={vi.fn()} />
    )
    fireEvent.keyDown(screen.getByPlaceholderText(/search/i), { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
