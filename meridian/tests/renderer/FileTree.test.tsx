import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FileTree } from '../../src/renderer/src/components/Sidebar/FileTree'
import { VaultFile } from '../../src/shared/types'

const mockFiles: VaultFile[] = [
  { name: 'Notes.md', path: '/v/Notes.md', relativePath: 'Notes.md', isDirectory: false, mtime: 0 },
  {
    name: 'Projects', path: '/v/Projects', relativePath: 'Projects', isDirectory: true, mtime: 0,
    children: [
      { name: 'Alpha.md', path: '/v/Projects/Alpha.md', relativePath: 'Projects/Alpha.md', isDirectory: false, mtime: 0 },
    ],
  },
]

describe('FileTree', () => {
  it('renders top-level files', () => {
    render(<FileTree files={mockFiles} onFileClick={vi.fn()} vaultPath="/v" />)
    expect(screen.getByText('Notes.md')).toBeInTheDocument()
    expect(screen.getByText('Projects')).toBeInTheDocument()
  })

  it('calls onFileClick with path when file is clicked', () => {
    const onClick = vi.fn()
    render(<FileTree files={mockFiles} onFileClick={onClick} vaultPath="/v" />)
    fireEvent.click(screen.getByText('Notes.md'))
    expect(onClick).toHaveBeenCalledWith('/v/Notes.md', 'Notes.md')
  })

  it('expands a directory on click', () => {
    render(<FileTree files={mockFiles} onFileClick={vi.fn()} vaultPath="/v" />)
    expect(screen.queryByText('Alpha.md')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Projects'))
    expect(screen.getByText('Alpha.md')).toBeInTheDocument()
  })
})
