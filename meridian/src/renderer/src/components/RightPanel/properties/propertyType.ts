import type { FrontmatterValue } from '@shared/frontmatter'

export type PropertyType = 'text' | 'number' | 'checkbox' | 'date' | 'tags' | 'relation'

const dateValuePattern = /^\d{4}-\d{2}-\d{2}$/

function isIsoDateValue(value: string): boolean {
  if (!dateValuePattern.test(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  if (year < 1) return false

  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

export function inferPropertyType(name: string, value: FrontmatterValue): PropertyType {
  const normalizedName = name.toLowerCase()

  if (typeof value === 'boolean') return 'checkbox'
  if (typeof value === 'number') return 'number'
  if (/(^|[-_ ])tags?([-_ ]|$)/.test(normalizedName)) return 'tags'
  if (/(^|[-_ ])(relations?|related|links?)([-_ ]|$)/.test(normalizedName)) return 'relation'
  if (typeof value === 'string' && isIsoDateValue(value)) return 'date'
  if (Array.isArray(value)) return 'tags'

  return 'text'
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
