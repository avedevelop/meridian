import type {
  FrontmatterProperties,
  FrontmatterValue
} from './frontmatter'
import { replaceFrontmatter } from './frontmatter'
import type { MeridianVaultConfig, NoteTypeDefinition, NoteTypePropertySchema } from './types'

interface TemplateContext {
  title: string
  date: string
  type: string
}

interface TypedNoteContentInput {
  title: string
  date: string
}

const INVALID_FILENAME_CHARS_RE = /[<>:"/\\|?*\u0000-\u001f]/g
const WHITESPACE_RE = /\s+/g

function schema(
  key: string,
  label: string,
  kind: NoteTypePropertySchema['kind'],
  defaultValue?: NoteTypePropertySchema['defaultValue']
): NoteTypePropertySchema {
  return { key, label, kind, defaultValue }
}

export function getDefaultNoteTypes(): NoteTypeDefinition[] {
  return [
    {
      id: 'project',
      label: 'Project',
      description: 'Track an initiative, outcome, or active body of work.',
      icon: 'folder-kanban',
      folder: 'Projects',
      builtIn: true,
      properties: [
        schema('type', 'Type', 'text', 'project'),
        schema('title', 'Title', 'text'),
        schema('status', 'Status', 'text', 'active'),
        schema('tags', 'Tags', 'tags', ['project'])
      ],
      template: '# {{title}}\n\n## Outcome\n\n## Notes\n'
    },
    {
      id: 'person',
      label: 'Person',
      description: 'Keep lightweight notes about people and conversations.',
      icon: 'user',
      folder: 'People',
      builtIn: true,
      properties: [
        schema('type', 'Type', 'text', 'person'),
        schema('title', 'Title', 'text'),
        schema('tags', 'Tags', 'tags', ['person'])
      ],
      template: '# {{title}}\n\n## Context\n\n## Conversations\n'
    },
    {
      id: 'daily',
      label: 'Daily',
      description: 'Capture a dated daily note.',
      icon: 'calendar-days',
      folder: 'Daily',
      builtIn: true,
      properties: [
        schema('type', 'Type', 'text', 'daily'),
        schema('title', 'Title', 'text'),
        schema('date', 'Date', 'date', 'today'),
        schema('tags', 'Tags', 'tags', ['daily'])
      ],
      template: '# {{title}}\n\n## Today\n\n## Notes\n'
    },
    {
      id: 'task',
      label: 'Task',
      description: 'Create a note that starts with a clear next action.',
      icon: 'square-check',
      folder: 'Tasks',
      builtIn: true,
      properties: [
        schema('type', 'Type', 'text', 'task'),
        schema('title', 'Title', 'text'),
        schema('done', 'Done', 'checkbox', false),
        schema('tags', 'Tags', 'tags', ['task'])
      ],
      template: '# {{title}}\n\n- [ ] {{title}}\n'
    }
  ]
}

export function sanitizeNoteFileName(title: string): string {
  const cleanBase =
    title
      .replace(INVALID_FILENAME_CHARS_RE, ' ')
      .replace(WHITESPACE_RE, ' ')
      .trim()
      .replace(/\.+$/, '') || 'Untitled'

  return cleanBase.toLowerCase().endsWith('.md') ? cleanBase : `${cleanBase}.md`
}

export function renderTemplatePlaceholders(template: string, context: TemplateContext): string {
  return template
    .replace(/\{\{title\}\}/gi, context.title)
    .replace(/\{\{date\}\}/gi, context.date)
    .replace(/\{\{type\}\}/gi, context.type)
}

function resolveDefaultValue(
  property: NoteTypePropertySchema,
  input: TypedNoteContentInput
): FrontmatterValue {
  if (property.key === 'title') return input.title
  if (property.kind === 'date' && property.defaultValue === 'today') return input.date
  if (property.defaultValue !== undefined) return property.defaultValue
  if (property.kind === 'tags') return []
  if (property.kind === 'checkbox') return false
  if (property.kind === 'number') return null
  return ''
}

export function buildTypedNoteContent(
  definition: NoteTypeDefinition,
  input: TypedNoteContentInput
): string {
  const properties: FrontmatterProperties = {}
  for (const property of definition.properties) {
    properties[property.key] = resolveDefaultValue(property, input)
  }
  if (!properties.type) properties.type = definition.id
  if (!properties.title) properties.title = input.title

  const body = renderTemplatePlaceholders(definition.template, {
    title: input.title,
    date: input.date,
    type: definition.label
  }).trimEnd()

  return replaceFrontmatter(body, properties)
}

function isValidNoteType(type: NoteTypeDefinition): boolean {
  return Boolean(type.id?.trim() && type.label?.trim() && Array.isArray(type.properties))
}

export function normalizeNoteTypes(config?: Partial<MeridianVaultConfig> | null): NoteTypeDefinition[] {
  const byId = new Map<string, NoteTypeDefinition>()
  for (const type of getDefaultNoteTypes()) byId.set(type.id, type)

  for (const type of config?.noteTypes ?? []) {
    if (!isValidNoteType(type)) continue
    byId.set(type.id, {
      ...type,
      builtIn: false,
      template: type.template ?? '# {{title}}\n'
    })
  }

  return [...byId.values()]
}
