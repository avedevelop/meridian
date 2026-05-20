export interface ParseResult {
  links: string[]
  tags: string[]
}

function extractFrontmatterTags(content: string): string[] {
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!fmMatch) return []

  const yaml = fmMatch[1]
  const tags: string[] = []

  // Format 1: tags: [a, b, c] or tags: ["a", 'b']
  const inlineMatch = yaml.match(/^tags:\s*\[([^\]]*)\]/m)
  if (inlineMatch) {
    for (const part of inlineMatch[1].split(',')) {
      const tag = part.trim().replace(/^["']|["']$/g, '')
      if (tag) tags.push(tag)
    }
    return tags
  }

  // Format 2: YAML list
  // tags:
  //   - work
  //   - ideas
  const listMatch = yaml.match(/^tags:\s*\n((?:[ \t]*-[ \t]+.+\n?)+)/m)
  if (listMatch) {
    for (const match of listMatch[1].matchAll(/^[ \t]*-[ \t]+(.+)/gm)) {
      const tag = match[1].trim().replace(/^["']|["']$/g, '')
      if (tag) tags.push(tag)
    }
  }

  return tags
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
