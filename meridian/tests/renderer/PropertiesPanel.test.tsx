import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PropertiesPanel } from '../../src/renderer/src/components/RightPanel/PropertiesPanel'
import { useVaultStore } from '../../src/renderer/src/store/useVaultStore'
import { parseMarkdownFrontmatter } from '../../src/shared/frontmatter'

const PATH = '/vault/note.md'
const PANE_ID = 'pane-main'

function openNote(content: string) {
  useVaultStore.setState({
    panes: [
      {
        id: PANE_ID,
        openTabs: [{ path: PATH, name: 'note.md', content, isDirty: false }],
        activeTabPath: PATH
      }
    ],
    activePaneId: PANE_ID,
    openTabs: [{ path: PATH, name: 'note.md', content, isDirty: false }],
    activeTabPath: PATH
  })
}

function activeTab() {
  return useVaultStore.getState().panes[0].openTabs[0]
}

beforeEach(() => {
  useVaultStore.setState({
    panes: [{ id: PANE_ID, openTabs: [], activeTabPath: null }],
    activePaneId: PANE_ID,
    openTabs: [],
    activeTabPath: null
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('PropertiesPanel', () => {
  it('shows an empty state when no file is open', () => {
    render(<PropertiesPanel />)

    expect(screen.getByText('properties.noFileOpen')).toBeInTheDocument()
  })

  it('shows an empty properties state without frontmatter', () => {
    openNote('# Note\n\nBody')

    render(<PropertiesPanel />)

    expect(screen.getByText('properties.empty')).toBeInTheDocument()
  })

  it('adds a property inline without opening a browser prompt', () => {
    const prompt = vi.fn()
    vi.stubGlobal('prompt', prompt)
    openNote('# Note\n\nBody')

    render(<PropertiesPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'properties.addProperty' }))
    fireEvent.change(screen.getByLabelText('properties.propertyName'), {
      target: { value: 'priority' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'properties.createProperty' }))

    expect(prompt).not.toHaveBeenCalled()
    expect(parseMarkdownFrontmatter(activeTab().content).properties.priority).toBe('')
    expect(activeTab().isDirty).toBe(true)
  })

  it('edits a text property and marks its tab dirty', () => {
    openNote('---\ntitle: Old title\n---\n\nBody')

    render(<PropertiesPanel />)
    const title = screen.getByLabelText('title')
    fireEvent.change(title, { target: { value: 'New title' } })
    fireEvent.blur(title)

    expect(parseMarkdownFrontmatter(activeTab().content).properties.title).toBe('New title')
    expect(activeTab().isDirty).toBe(true)
  })

  it('toggles a checkbox property', () => {
    openNote('---\ndone: false\n---\n\nBody')

    render(<PropertiesPanel />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'done' }))

    expect(parseMarkdownFrontmatter(activeTab().content).properties.done).toBe(true)
    expect(activeTab().isDirty).toBe(true)
  })

  it('renders number, date, tag, and relation values through typed controls', () => {
    openNote(
      [
        '---',
        'priority: 3',
        'due: 2026-05-28',
        'tags: [work, ideas]',
        'related: [Roadmap, Journal]',
        '---',
        '',
        'Body'
      ].join('\n')
    )

    render(<PropertiesPanel />)

    expect(screen.getByLabelText('priority')).toHaveAttribute('type', 'number')
    expect(screen.getByLabelText('due')).toHaveAttribute('type', 'date')
    fireEvent.change(screen.getByLabelText('tags'), { target: { value: 'work, shipped' } })
    fireEvent.blur(screen.getByLabelText('tags'))
    fireEvent.change(screen.getByLabelText('related'), { target: { value: 'Roadmap, Archive' } })
    fireEvent.blur(screen.getByLabelText('related'))

    const properties = parseMarkdownFrontmatter(activeTab().content).properties
    expect(properties.tags).toEqual(['work', 'shipped'])
    expect(properties.related).toEqual(['Roadmap', 'Archive'])
  })

  it('deletes a property', () => {
    openNote('---\ntitle: Keep or delete\n---\n\nBody')

    render(<PropertiesPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'properties.deleteProperty' }))

    expect(parseMarkdownFrontmatter(activeTab().content).properties).toEqual({})
    expect(activeTab().isDirty).toBe(true)
  })

  it('reports malformed YAML and prevents mutation', () => {
    const content = '---\ntitle: [unterminated\n---\n\nBody'
    openNote(content)

    render(<PropertiesPanel />)

    expect(screen.getByRole('alert')).toHaveTextContent('properties.invalidYaml')
    expect(screen.getByRole('button', { name: 'properties.addProperty' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'properties.addProperty' }))
    expect(activeTab().content).toBe(content)
    expect(activeTab().isDirty).toBe(false)
  })
})
