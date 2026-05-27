import { parseDocument, stringify } from 'yaml'

export type FrontmatterPrimitive = string | number | boolean | null
export type FrontmatterValue = FrontmatterPrimitive | FrontmatterPrimitive[]
export type FrontmatterProperties = Record<string, FrontmatterValue>

export interface ParsedFrontmatter {
  hasFrontmatter: boolean
  raw: string
  body: string
  properties: FrontmatterProperties
}

export type FrontmatterParseResult =
  | (ParsedFrontmatter & { ok: true; error?: undefined })
  | (ParsedFrontmatter & { ok: false; error: string })

interface FrontmatterBlock {
  raw: string
  body: string
}

function readLine(content: string, start: number): { line: string; lineEnd: number; next: number } {
  let lineEnd = start
  while (lineEnd < content.length && content[lineEnd] !== '\n' && content[lineEnd] !== '\r') {
    lineEnd += 1
  }

  let next = lineEnd
  if (content[next] === '\r' && content[next + 1] === '\n') {
    next += 2
  } else if (content[next] === '\n' || content[next] === '\r') {
    next += 1
  }

  return {
    line: content.slice(start, lineEnd),
    lineEnd,
    next
  }
}

function findFrontmatterBlock(content: string): FrontmatterBlock | null {
  const opening = readLine(content, 0)
  if (opening.line !== '---' || opening.next === opening.lineEnd) {
    return null
  }

  const rawStart = opening.next
  let cursor = rawStart

  while (cursor <= content.length) {
    const current = readLine(content, cursor)

    if (current.line === '---') {
      const raw = content.slice(rawStart, cursor).replace(/\r?\n$|\r$/, '')
      return {
        raw,
        body: content.slice(current.lineEnd)
      }
    }

    if (current.next === current.lineEnd) {
      return null
    }

    cursor = current.next
  }

  return null
}

function normalizePrimitive(value: unknown): FrontmatterPrimitive | undefined {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  return undefined
}

function normalizeProperties(value: unknown): FrontmatterProperties {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  const properties: FrontmatterProperties = {}
  for (const [key, rawValue] of Object.entries(value)) {
    const primitive = normalizePrimitive(rawValue)
    if (primitive !== undefined) {
      properties[key] = primitive
      continue
    }

    if (Array.isArray(rawValue)) {
      const items = rawValue.map(normalizePrimitive)
      if (items.every((item): item is FrontmatterPrimitive => item !== undefined)) {
        properties[key] = items
      }
    }
  }

  return properties
}

export function parseMarkdownFrontmatter(content: string): FrontmatterParseResult {
  const block = findFrontmatterBlock(content)
  if (!block) {
    return {
      ok: true,
      hasFrontmatter: false,
      raw: '',
      body: content,
      properties: {}
    }
  }

  const document = parseDocument(block.raw, {
    prettyErrors: false,
    schema: 'core'
  })

  if (document.errors.length > 0) {
    return {
      ok: false,
      hasFrontmatter: true,
      raw: block.raw,
      body: block.body,
      properties: {},
      error: document.errors.map((error) => error.message).join('\n')
    }
  }

  return {
    ok: true,
    hasFrontmatter: true,
    raw: block.raw,
    body: block.body,
    properties: normalizeProperties(document.toJS())
  }
}

export function serializeFrontmatter(properties: FrontmatterProperties): string {
  const body = Object.keys(properties).length > 0 ? stringify(properties).trimEnd() : ''
  return body ? `---\n${body}\n---` : '---\n---'
}

export function replaceFrontmatter(content: string, properties: FrontmatterProperties): string {
  const parsed = parseMarkdownFrontmatter(content)
  if (!parsed.ok) {
    return content
  }

  if (!parsed.hasFrontmatter) {
    return `${serializeFrontmatter(properties)}\n\n${content}`
  }

  return `${serializeFrontmatter(properties)}${parsed.body}`
}

export function setFrontmatterProperty(
  content: string,
  key: string,
  value: FrontmatterValue
): string {
  const parsed = parseMarkdownFrontmatter(content)
  if (!parsed.ok) {
    return content
  }

  const properties = { ...parsed.properties }
  properties[key] = value

  if (parsed.hasFrontmatter) {
    return `${serializeFrontmatter(properties)}${parsed.body}`
  }

  return `${serializeFrontmatter(properties)}\n\n${content}`
}

export function removeFrontmatterProperty(content: string, key: string): string {
  const parsed = parseMarkdownFrontmatter(content)
  if (!parsed.ok) {
    return content
  }

  const properties = { ...parsed.properties }
  delete properties[key]

  if (parsed.hasFrontmatter) {
    return `${serializeFrontmatter(properties)}${parsed.body}`
  }

  return content
}
