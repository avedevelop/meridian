import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FileTree } from '../../src/renderer/src/components/Sidebar/FileTree'
import { VaultFile } from '../../src/shared/types'

const file: VaultFile = {
  name: 'Note.md',
  path: '/vault/Note.md',
  relativePath: 'Note.md',
  isDirectory: false,
  mtime: 0
}

describe('FileTree keyboard deletion', () => {
  it('deletes the selected file when Delete is pressed', () => {
    const onDelete = vi.fn()
    render(<FileTree files={[file]} onFileClick={vi.fn()} onDelete={onDelete} vaultPath="/vault" />)

    fireEvent.click(screen.getByText('Note.md'))
    fireEvent.keyDown(window, { key: 'Delete' })

    expect(onDelete).toHaveBeenCalledWith('/vault/Note.md')
  })

  it('deletes the selected file when Backspace is pressed', () => {
    const onDelete = vi.fn()
    render(<FileTree files={[file]} onFileClick={vi.fn()} onDelete={onDelete} vaultPath="/vault" />)

    fireEvent.click(screen.getByText('Note.md'))
    fireEvent.keyDown(window, { key: 'Backspace' })

    expect(onDelete).toHaveBeenCalledWith('/vault/Note.md')
  })

  it('does not delete while inline rename input is focused', () => {
    const onDelete = vi.fn()
    render(<FileTree files={[file]} onFileClick={vi.fn()} onDelete={onDelete} vaultPath="/vault" />)

    fireEvent.contextMenu(screen.getByText('Note.md'))
    fireEvent.click(screen.getByText('common.rename'))
    fireEvent.keyDown(window, { key: 'Delete' })

    expect(onDelete).not.toHaveBeenCalled()
  })
})
