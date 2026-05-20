import { describe, it, expect } from 'vitest'

type FrontmatterValue = string | string[]
type Frontmatter = Record<string, FrontmatterValue>

function parseFrontmatter(content: string): Frontmatter | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return null
  const lines = match[1].split(/\r?\n/)
  const result: Frontmatter = {}
  for (const line of lines) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    if (!key) continue
    const rawVal = line.slice(colonIdx + 1).trim()
    if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
      result[key] = rawVal.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean)
    } else {
      result[key] = rawVal
    }
  }
  return Object.keys(result).length > 0 ? result : null
}

function serializeFrontmatter(fm: Frontmatter): string {
  const lines = Object.entries(fm).map(([k, v]) => {
    if (Array.isArray(v)) return `${k}: [${v.join(', ')}]`
    return `${k}: ${v}`
  })
  return `---\n${lines.join('\n')}\n---`
}

function updateContentFrontmatter(content: string, key: string, value: string): string {
  const fm = parseFrontmatter(content) ?? {}
  fm[key] = value
  const newHeader = serializeFrontmatter(fm)
  if (/^---[\s\S]*?---/.test(content)) {
    return content.replace(/^---[\s\S]*?---/, newHeader)
  }
  return newHeader + '\n\n' + content
}

describe('frontmatter parsing', () => {
  it('parses simple key: value pairs', () => {
    const content = '---\ntitle: My Note\ndate: 2026-05-20\n---\n\nContent'
    const fm = parseFrontmatter(content)
    expect(fm).toEqual({ title: 'My Note', date: '2026-05-20' })
  })

  it('parses array values', () => {
    const content = '---\ntags: [work, ideas, todo]\n---'
    const fm = parseFrontmatter(content)
    expect(fm?.tags).toEqual(['work', 'ideas', 'todo'])
  })

  it('returns null when no frontmatter', () => {
    expect(parseFrontmatter('# Just a heading')).toBeNull()
  })

  it('updates existing key in frontmatter', () => {
    const content = '---\ntitle: Old\n---\n\nBody'
    const updated = updateContentFrontmatter(content, 'title', 'New')
    expect(updated).toContain('title: New')
    expect(updated).toContain('Body')
    expect(updated).not.toContain('title: Old')
  })

  it('adds frontmatter to content without it', () => {
    const content = 'Just body text'
    const updated = updateContentFrontmatter(content, 'title', 'My Title')
    expect(updated).toMatch(/^---\ntitle: My Title\n---/)
    expect(updated).toContain('Just body text')
  })

  it('returns null for empty frontmatter block', () => {
    expect(parseFrontmatter('---\n---\nContent')).toBeNull()
  })
})
