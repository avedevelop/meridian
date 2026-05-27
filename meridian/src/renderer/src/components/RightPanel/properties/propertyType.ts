import type { FrontmatterValue } from '@shared/frontmatter'

export type PropertyType = 'text' | 'number' | 'checkbox' | 'date' | 'tags' | 'relation'

export const PROPERTY_TYPES: PropertyType[] = [
  'text',
  'number',
  'checkbox',
  'date',
  'tags',
  'relation'
]

const dateValuePattern = /^\d{4}-\d{2}-\d{2}$/

export function isIsoDateValue(value: string): boolean {
  if (!dateValuePattern.test(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  if (year < 1) return false

  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

export function isTagsPropertyName(name: string): boolean {
  return /(^|[-_ ])tags?([-_ ]|$)/.test(name.toLowerCase())
}

export function isRelationPropertyName(name: string): boolean {
  return /(^|[-_ ])(relations?|related|links?)([-_ ]|$)/.test(name.toLowerCase())
}

export function inferPropertyType(name: string, value: FrontmatterValue): PropertyType {
  if (typeof value === 'boolean') return 'checkbox'
  if (typeof value === 'number') return 'number'
  if (isTagsPropertyName(name)) return 'tags'
  if (isRelationPropertyName(name)) return 'relation'
  if (typeof value === 'string' && isIsoDateValue(value)) return 'date'
  if (Array.isArray(value)) return 'tags'

  return 'text'
}

export function initialPropertyValue(type: PropertyType, date: string): FrontmatterValue {
  switch (type) {
    case 'number':
      return 0
    case 'checkbox':
      return false
    case 'date':
      return date
    case 'tags':
    case 'relation':
      return []
    case 'text':
      return ''
  }
}

export function stringValue(value: FrontmatterValue): string {
  if (Array.isArray(value)) return value.filter((item) => item !== null).join(', ')
  if (value === null) return ''
  return String(value)
}

export function listValue(value: string): FrontmatterValue {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}
