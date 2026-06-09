import { parseFrontmatterTags } from '@shared/frontmatter'
import { extractRelationReferences, type RelationReference } from '@shared/relationships'

export interface ParseResult {
  links: string[]
  tags: string[]
  relations: RelationReference[]
}

function extractFrontmatterTags(content: string): string[] {
  return parseFrontmatterTags(content)
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

  const relations = extractRelationReferences(content)
  for (const relation of relations) linkSet.add(relation.target)

  return { links: Array.from(linkSet), tags: Array.from(tagSet), relations }
}
