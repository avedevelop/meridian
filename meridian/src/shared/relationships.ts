import { parseMarkdownFrontmatter, type FrontmatterValue } from './frontmatter'

export interface RelationReference {
  key: string
  target: string
  raw: string
}

export function isRelationKey(key: string): boolean {
  return /(^|[-_ ])(relations?|related|links?)([-_ ]|$)/.test(key.toLowerCase())
}

export function normalizeRelationTarget(value: string): string {
  let target = value.trim()
  const wikiMatch = target.match(/^\[\[([^\]|]+)(?:\|[^\]]+)?\]\]$/)
  if (wikiMatch) target = wikiMatch[1].trim()

  target = target.replace(/\\/g, '/')
  const fileName = target.split('/').pop() ?? target
  return fileName.replace(/\.md$/i, '').trim()
}

function relationValues(value: FrontmatterValue): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  if (typeof value !== 'string') return []

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function extractRelationReferences(content: string): RelationReference[] {
  const parsed = parseMarkdownFrontmatter(content)
  if (!parsed.ok) return []

  const refs: RelationReference[] = []
  for (const [key, value] of Object.entries(parsed.properties)) {
    if (!isRelationKey(key)) continue
    for (const raw of relationValues(value)) {
      const target = normalizeRelationTarget(raw)
      if (target) refs.push({ key, target, raw })
    }
  }

  return refs
}
