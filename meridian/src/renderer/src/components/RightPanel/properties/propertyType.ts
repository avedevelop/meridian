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

export function inferPropertyType(name: string, value: FrontmatterValue): PropertyType {
  const normalizedName = name.toLowerCase()

  if (typeof value === 'boolean') return 'checkbox'
  if (typeof value === 'number') return 'number'
  if (/(^|[-_ ])tags?([-_ ]|$)/.test(normalizedName)) return 'tags'
  if (/(^|[-_ ])(relations?|related|links?)([-_ ]|$)/.test(normalizedName)) return 'relation'
  if (/(^|[-_ ])(date|deadline|due)([-_ ]|$)/.test(normalizedName)) return 'date'
  if (typeof value === 'string' && dateValuePattern.test(value)) return 'date'
  if (Array.isArray(value)) return 'tags'

  return 'text'
}

export function defaultValueForType(type: PropertyType): FrontmatterValue {
  switch (type) {
    case 'number':
      return 0
    case 'checkbox':
      return false
    case 'tags':
    case 'relation':
      return []
    case 'text':
    case 'date':
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

export function convertPropertyValue(
  value: FrontmatterValue,
  type: PropertyType
): FrontmatterValue {
  const text = stringValue(value)

  switch (type) {
    case 'text':
    case 'date':
      return text
    case 'number': {
      const number = Number(text)
      return text.trim() && Number.isFinite(number) ? number : 0
    }
    case 'checkbox':
      return typeof value === 'boolean' ? value : false
    case 'tags':
    case 'relation':
      return Array.isArray(value) ? value : listValue(text)
  }
}
