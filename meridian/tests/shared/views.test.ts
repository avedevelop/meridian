import { describe, expect, it } from 'vitest'
import {
  applySavedView,
  extractViewNote,
  getDefaultSavedViews,
  type SavedView
} from '../../src/shared/views'

const project = extractViewNote(
  '/vault/Projects/Alpha.md',
  'Alpha.md',
  '---\ntype: project\nstatus: active\ntags: [work]\nrelated: [Ada]\n---\n\n# Alpha\n- [ ] Plan'
)
const daily = extractViewNote(
  '/vault/Daily/2026-05-27.md',
  '2026-05-27.md',
  '---\ntype: daily\ndate: 2026-05-27\ntags: [daily]\n---\n\n- [x] Review'
)
const inbox = extractViewNote('/vault/Loose.md', 'Loose.md', '# Loose')

describe('saved view engine', () => {
  it('provides default workflow views', () => {
    expect(getDefaultSavedViews().map((view) => view.id)).toEqual([
      'inbox',
      'projects',
      'tasks',
      'daily'
    ])
  })

  it('extracts frontmatter metadata, tasks, tags, and relations', () => {
    expect(project).toMatchObject({
      type: 'project',
      tags: ['work'],
      taskCounts: { total: 1, completed: 0, pending: 1 }
    })
    expect(project.relations.map((relation) => relation.target)).toEqual(['Ada'])
  })

  it('detects daily dates from file path when frontmatter is absent', () => {
    const note = extractViewNote('/vault/Daily/2026-05-28.md', '2026-05-28.md', '# Day')
    expect(note.date).toBe('2026-05-28')
  })

  it('filters inbox notes without type, tags, tasks, or relations', () => {
    const view = getDefaultSavedViews().find((item) => item.id === 'inbox')
    expect(view).toBeDefined()
    if (!view) return
    expect(applySavedView([project, daily, inbox], view).map((note) => note.path)).toEqual([
      '/vault/Loose.md'
    ])
  })

  it('filters by type, tag, task status, and relation target', () => {
    const view: SavedView = {
      id: 'work-projects',
      name: 'Work projects',
      layout: 'list',
      filters: {
        type: 'project',
        tag: 'work',
        taskStatus: 'pending',
        relation: 'Ada'
      }
    }

    expect(applySavedView([project, daily, inbox], view).map((note) => note.path)).toEqual([
      '/vault/Projects/Alpha.md'
    ])
  })
})
