import { parseMarkdownFrontmatter, type FrontmatterValue } from '../../../shared/frontmatter'

export interface ParseResult {
  links: string[]
  tags: string[]
}

function extractFrontmatterTags(content: string): string[] {
  const parsed = parseMarkdownFrontmatter(content)
  if (!parsed.ok) {
    return []
  }

  return normalizeTags(parsed.properties.tags)
}

function normalizeTags(value: FrontmatterValue | undefined): string[] {
  if (typeof value === 'string') {
    return value ? [value] : []
  }

  if (Array.isArray(value)) {
    return value.filter((tag): tag is string => typeof tag === 'string' && tag.length > 0)
  }

  return []
}

export function parseLinks(content: string): ParseResult {
  const linkSet = new Set<string>()
  const tagSet = new Set<string>()

  // Extract frontmatter tags first
  for (const tag of extractFrontmatterTags(content)) {
    tagSet.add(tag)
  }

  // Strip fenced code blocks before parsing inline content
  const stripped = content.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '')

  for (const match of stripped.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
    linkSet.add(match[1].trim())
  }

  for (const match of stripped.matchAll(/#([\w/-]+)/g)) {
    tagSet.add(match[1])
  }

  return { links: Array.from(linkSet), tags: Array.from(tagSet) }
}
