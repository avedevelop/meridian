import { parseMarkdownFrontmatter, type FrontmatterProperties } from './frontmatter'
import { extractRelationReferences, type RelationReference } from './relationships'

export type SavedViewLayout = 'list' | 'table'
export type TaskStatusFilter = 'pending' | 'completed' | 'any'

export interface SavedViewFilters {
  type?: string
  tag?: string
  date?: string
  taskStatus?: TaskStatusFilter
  relation?: string
  inbox?: boolean
}

export interface SavedView {
  id: string
  name: string
  layout: SavedViewLayout
  filters: SavedViewFilters
  builtIn?: boolean
}

export interface ViewNote {
  path: string
  name: string
  type: string | null
  date: string | null
  tags: string[]
  properties: FrontmatterProperties
  relations: RelationReference[]
  taskCounts: {
    total: number
    completed: number
    pending: number
  }
}

const datePattern = /\b(\d{4}-\d{2}-\d{2})\b/

export function getDefaultSavedViews(): SavedView[] {
  return [
    { id: 'inbox', name: 'Inbox', layout: 'list', filters: { inbox: true }, builtIn: true },
    {
      id: 'projects',
      name: 'Projects',
      layout: 'table',
      filters: { type: 'project' },
      builtIn: true
    },
    { id: 'tasks', name: 'Tasks', layout: 'list', filters: { taskStatus: 'pending' }, builtIn: true },
    { id: 'daily', name: 'Daily', layout: 'list', filters: { type: 'daily' }, builtIn: true }
  ]
}

function stringList(value: unknown): string[] {
  if (typeof value === 'string') return value ? [value] : []
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function countTasks(content: string): ViewNote['taskCounts'] {
  let total = 0
  let completed = 0

  for (const line of content.split('\n')) {
    const match = line.match(/^\s*[-*]\s+\[([ xX])\]\s+.+$/)
    if (!match) continue
    total += 1
    if (match[1].toLowerCase() === 'x') completed += 1
  }

  return { total, completed, pending: total - completed }
}

function pathDate(path: string): string | null {
  return path.match(datePattern)?.[1] ?? null
}

export function extractViewNote(path: string, name: string, content: string): ViewNote {
  const parsed = parseMarkdownFrontmatter(content)
  const properties = parsed.ok ? parsed.properties : {}
  const tags = stringList(properties.tags)
  const type = stringOrNull(properties.type)
  const date = stringOrNull(properties.date) ?? pathDate(path)

  return {
    path,
    name,
    type,
    date,
    tags,
    properties,
    relations: extractRelationReferences(content),
    taskCounts: countTasks(content)
  }
}

function matchesTaskStatus(note: ViewNote, taskStatus: TaskStatusFilter): boolean {
  if (taskStatus === 'any') return note.taskCounts.total > 0
  if (taskStatus === 'completed') return note.taskCounts.completed > 0
  return note.taskCounts.pending > 0
}

function isInbox(note: ViewNote): boolean {
  return (
    !note.type &&
    note.tags.length === 0 &&
    note.relations.length === 0 &&
    note.taskCounts.total === 0
  )
}

export function applySavedView(notes: ViewNote[], view: SavedView): ViewNote[] {
  return notes
    .filter((note) => {
      const { filters } = view
      if (filters.inbox && !isInbox(note)) return false
      if (filters.type && note.type !== filters.type) return false
      if (filters.tag && !note.tags.includes(filters.tag)) return false
      if (filters.date && note.date !== filters.date) return false
      if (filters.taskStatus && !matchesTaskStatus(note, filters.taskStatus)) return false
      if (
        filters.relation &&
        !note.relations.some((relation) => relation.target === filters.relation)
      ) {
        return false
      }
      return true
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function createSavedView(
  id: string,
  name: string,
  filters: SavedViewFilters,
  layout: SavedViewLayout = 'list'
): SavedView {
  return { id, name, filters, layout }
}
