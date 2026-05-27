import { act, fireEvent, render, screen } from '@testing-library/react'
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

function addProperty(name: string) {
  fireEvent.click(screen.getByRole('button', { name: 'properties.addProperty' }))
  fireEvent.change(screen.getByLabelText('properties.propertyName'), {
    target: { value: name }
  })
  fireEvent.click(screen.getByRole('button', { name: 'properties.createProperty' }))
}

function addTypedProperty(name: string, type: string, initialDate?: string) {
  fireEvent.click(screen.getByRole('button', { name: 'properties.addProperty' }))
  fireEvent.change(screen.getByLabelText('properties.propertyName'), {
    target: { value: name }
  })
  fireEvent.change(screen.getByLabelText('properties.newPropertyType'), {
    target: { value: type }
  })
  if (initialDate) {
    fireEvent.change(screen.getByLabelText('properties.initialDate'), {
      target: { value: initialDate }
    })
  }
  fireEvent.click(screen.getByRole('button', { name: 'properties.createProperty' }))
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
    addProperty('priority')

    expect(prompt).not.toHaveBeenCalled()
    expect(parseMarkdownFrontmatter(activeTab().content).properties.priority).toBe('')
    expect(activeTab().isDirty).toBe(true)
  })

  it('creates number and checkbox properties that remount as typed controls', () => {
    openNote('# Note\n\nBody')

    const { unmount } = render(<PropertiesPanel />)
    addTypedProperty('priority', 'number')
    addTypedProperty('done', 'checkbox')

    expect(parseMarkdownFrontmatter(activeTab().content).properties).toMatchObject({
      priority: 0,
      done: false
    })
    unmount()
    render(<PropertiesPanel />)
    expect(screen.getByLabelText('priority')).toHaveAttribute('type', 'number')
    expect(screen.getByRole('checkbox', { name: 'done' })).not.toBeChecked()
  })

  it('creates date, tags, and relation properties with recoverable controls', () => {
    openNote('# Note\n\nBody')

    const { unmount } = render(<PropertiesPanel />)
    addTypedProperty('due', 'date', '2026-06-10')
    addTypedProperty('tags', 'tags')
    addTypedProperty('related', 'relation')

    expect(parseMarkdownFrontmatter(activeTab().content).properties).toMatchObject({
      due: '2026-06-10',
      tags: [],
      related: []
    })
    unmount()
    render(<PropertiesPanel />)
    expect(screen.getByLabelText('due')).toHaveAttribute('type', 'date')
    expect(screen.getByLabelText('tags')).toHaveAttribute(
      'placeholder',
      'properties.tagsPlaceholder'
    )
    expect(screen.getByLabelText('related')).toHaveAttribute(
      'placeholder',
      'properties.relationPlaceholder'
    )
  })

  it('requires a recognizable relation name during typed creation', () => {
    openNote('# Note\n\nBody')

    render(<PropertiesPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'properties.addProperty' }))
    fireEvent.change(screen.getByLabelText('properties.propertyName'), {
      target: { value: 'connections' }
    })
    fireEvent.change(screen.getByLabelText('properties.newPropertyType'), {
      target: { value: 'relation' }
    })

    expect(screen.getByText('properties.relationNameHint')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'properties.createProperty' })).toBeDisabled()
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

  it('keeps number properties typed when a cleared value is committed', () => {
    openNote('---\npriority: 3\n---\n\nBody')

    const { unmount } = render(<PropertiesPanel />)
    const priority = screen.getByLabelText('priority')
    fireEvent.change(priority, { target: { value: '' } })
    fireEvent.blur(priority)

    expect(parseMarkdownFrontmatter(activeTab().content).properties.priority).toBe(3)
    unmount()
    render(<PropertiesPanel />)
    expect(screen.getByLabelText('priority')).toHaveAttribute('type', 'number')
    expect(screen.getByLabelText('priority')).toHaveValue(3)
  })

  it('keeps date properties typed when a cleared value is committed', () => {
    openNote('---\ndue: 2026-05-28\n---\n\nBody')

    const { unmount } = render(<PropertiesPanel />)
    const due = screen.getByLabelText('due')
    fireEvent.change(due, { target: { value: '' } })
    fireEvent.blur(due)

    expect(parseMarkdownFrontmatter(activeTab().content).properties.due).toBe('2026-05-28')
    unmount()
    render(<PropertiesPanel />)
    expect(screen.getByLabelText('due')).toHaveAttribute('type', 'date')
    expect(screen.getByLabelText('due')).toHaveValue('2026-05-28')
  })

  it('keeps non-ISO date-key content visible until it is edited to a valid ISO date', () => {
    openNote('---\ndue: next Friday\n---\n\nBody')

    render(<PropertiesPanel />)
    const due = screen.getByLabelText('due')

    expect(due).toHaveAttribute('type', 'text')
    expect(due).toHaveValue('next Friday')
    fireEvent.change(due, { target: { value: '2026-06-05' } })
    fireEvent.blur(due)

    expect(parseMarkdownFrontmatter(activeTab().content).properties.due).toBe('2026-06-05')
    expect(screen.getByLabelText('due')).toHaveAttribute('type', 'date')
    expect(screen.getByLabelText('due')).toHaveValue('2026-06-05')
  })

  it('blocks date properties that use a reserved tags name', () => {
    openNote('# Note\n\nBody')

    render(<PropertiesPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'properties.addProperty' }))
    fireEvent.change(screen.getByLabelText('properties.propertyName'), {
      target: { value: 'tags' }
    })
    fireEvent.change(screen.getByLabelText('properties.newPropertyType'), {
      target: { value: 'date' }
    })
    fireEvent.change(screen.getByLabelText('properties.initialDate'), {
      target: { value: '2026-06-10' }
    })

    expect(screen.getByText('properties.reservedTagsNameError')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'properties.createProperty' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'properties.createProperty' }))
    expect(parseMarkdownFrontmatter(activeTab().content).properties).toEqual({})
  })

  it('blocks text properties that use a reserved relation name', () => {
    openNote('# Note\n\nBody')

    render(<PropertiesPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'properties.addProperty' }))
    fireEvent.change(screen.getByLabelText('properties.propertyName'), {
      target: { value: 'related' }
    })

    expect(screen.getByText('properties.reservedRelationNameError')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'properties.createProperty' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'properties.createProperty' }))
    expect(parseMarkdownFrontmatter(activeTab().content).properties).toEqual({})
  })

  it('reconstructs created property controls after note navigation and remount', () => {
    openNote('# Note\n\nBody')

    const { unmount } = render(<PropertiesPanel />)
    addTypedProperty('tags', 'tags')
    expect(screen.getByLabelText('tags')).toHaveAttribute(
      'placeholder',
      'properties.tagsPlaceholder'
    )
    fireEvent.change(screen.getByLabelText('tags'), { target: { value: 'work, ideas' } })
    fireEvent.blur(screen.getByLabelText('tags'))

    addTypedProperty('related', 'relation')
    expect(screen.getByLabelText('related')).toHaveAttribute(
      'placeholder',
      'properties.relationPlaceholder'
    )
    fireEvent.change(screen.getByLabelText('related'), { target: { value: 'Roadmap, Journal' } })
    fireEvent.blur(screen.getByLabelText('related'))

    addProperty('due')
    fireEvent.change(screen.getByLabelText('due'), { target: { value: '2026-06-10' } })
    fireEvent.blur(screen.getByLabelText('due'))
    expect(screen.getByLabelText('due')).toHaveAttribute('type', 'date')

    act(() => {
      useVaultStore.getState().openTab('/vault/other.md', 'other.md')
    })
    expect(screen.queryByLabelText('tags')).not.toBeInTheDocument()
    act(() => {
      useVaultStore.getState().setActiveTab(PATH)
    })
    expect(screen.getByLabelText('tags')).toHaveAttribute(
      'placeholder',
      'properties.tagsPlaceholder'
    )
    expect(screen.getByLabelText('related')).toHaveAttribute(
      'placeholder',
      'properties.relationPlaceholder'
    )
    expect(screen.getByLabelText('due')).toHaveAttribute('type', 'date')

    unmount()
    render(<PropertiesPanel />)
    expect(screen.getByLabelText('tags')).toHaveValue('work, ideas')
    expect(screen.getByLabelText('related')).toHaveValue('Roadmap, Journal')
    expect(screen.getByLabelText('due')).toHaveAttribute('type', 'date')
  })

  it('does not expose transient type changes for existing properties', () => {
    openNote('---\ntitle: Note\n---\n\nBody')

    render(<PropertiesPanel />)

    expect(screen.queryByLabelText('properties.propertyType')).not.toBeInTheDocument()
  })

  it('deletes a property', () => {
    openNote('---\ntitle: Keep or delete\n---\n\nBody')

    render(<PropertiesPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'properties.deleteProperty title' }))

    expect(parseMarkdownFrontmatter(activeTab().content).properties).toEqual({})
    expect(activeTab().isDirty).toBe(true)
  })

  it('provides a distinct accessible delete label for each property row', () => {
    openNote('---\ntitle: Note\nsummary: Brief\n---\n\nBody')

    render(<PropertiesPanel />)

    expect(
      screen.getByRole('button', { name: 'properties.deleteProperty title' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'properties.deleteProperty summary' })
    ).toBeInTheDocument()
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
