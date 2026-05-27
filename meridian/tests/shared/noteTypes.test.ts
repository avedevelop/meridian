import { describe, expect, it } from 'vitest'
import {
  buildTypedNoteContent,
  getDefaultNoteTypes,
  normalizeNoteTypes,
  renderTemplatePlaceholders,
  sanitizeNoteFileName
} from '../../src/shared/noteTypes'

describe('note type helpers', () => {
  it('provides built-in note types', () => {
    const types = getDefaultNoteTypes()

    expect(types.map((type) => type.id)).toEqual(['project', 'person', 'daily', 'task'])
    expect(types.every((type) => type.builtIn)).toBe(true)
  })

  it('renders supported template placeholders', () => {
    const rendered = renderTemplatePlaceholders('# {{title}}\n{{date}}\n{{type}}', {
      title: 'Alpha',
      date: '2026-05-27',
      type: 'Project'
    })

    expect(rendered).toBe('# Alpha\n2026-05-27\nProject')
  })

  it('sanitizes note filenames while preserving spaces and Cyrillic letters', () => {
    expect(sanitizeNoteFileName('Проект Альфа / Phase: 1')).toBe('Проект Альфа Phase 1.md')
    expect(sanitizeNoteFileName('')).toBe('Untitled.md')
    expect(sanitizeNoteFileName('Already.md')).toBe('Already.md')
  })

  it('builds a typed note with default frontmatter and rendered body', () => {
    const project = getDefaultNoteTypes().find((type) => type.id === 'project')
    expect(project).toBeDefined()
    if (!project) return

    const content = buildTypedNoteContent(project, {
      title: 'Project Alpha',
      date: '2026-05-27'
    })

    expect(content).toContain('type: project')
    expect(content).toContain('title: Project Alpha')
    expect(content).toContain('status: active')
    expect(content).toContain('# Project Alpha')
  })

  it('normalizes custom note types after built-ins without duplicating ids', () => {
    const types = normalizeNoteTypes({
      version: 1,
      noteTypes: [
        {
          id: 'project',
          label: 'Overridden Project',
          properties: [],
          template: '# {{title}}'
        },
        {
          id: 'meeting',
          label: 'Meeting',
          properties: [{ key: 'date', label: 'Date', kind: 'date', defaultValue: 'today' }],
          template: '# {{title}}'
        }
      ]
    })

    expect(types.find((type) => type.id === 'project')?.label).toBe('Overridden Project')
    expect(types.find((type) => type.id === 'meeting')?.builtIn).toBe(false)
    expect(types.filter((type) => type.id === 'project')).toHaveLength(1)
  })
})
