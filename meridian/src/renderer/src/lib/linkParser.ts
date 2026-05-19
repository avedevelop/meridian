export interface ParseResult {
  links: string[]
  tags: string[]
}

export function parseLinks(content: string): ParseResult {
  // Strip fenced code blocks before parsing
  const stripped = content.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '')

  const linkSet = new Set<string>()
  const tagSet = new Set<string>()

  for (const match of stripped.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
    linkSet.add(match[1].trim())
  }

  for (const match of stripped.matchAll(/#([\w/-]+)/g)) {
    tagSet.add(match[1])
  }

  return { links: Array.from(linkSet), tags: Array.from(tagSet) }
}
