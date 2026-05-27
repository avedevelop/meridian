import { isMap, parseDocument, stringify, visit } from 'yaml'

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

type FrontmatterBlock =
  | { type: 'none' }
  | { type: 'found'; raw: string; body: string }
  | { type: 'unterminated'; raw: string }

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

const UNSUPPORTED_FRONTMATTER_ERROR =
  'Frontmatter contains unsupported YAML for property editing. Edit it in the editor first.'
const COMMENTED_FRONTMATTER_ERROR =
  'Frontmatter comments cannot be safely preserved by property editing. Edit it in the editor first.'

function findFrontmatterBlock(content: string): FrontmatterBlock {
  const opening = readLine(content, 0)
  if (opening.line !== '---') {
    return { type: 'none' }
  }

  const rawStart = opening.next
  let cursor = rawStart

  while (cursor <= content.length) {
    const current = readLine(content, cursor)

    if (current.line === '---') {
      const raw = content.slice(rawStart, cursor).replace(/\r?\n$|\r$/, '')
      return {
        type: 'found',
        raw,
        body: content.slice(current.lineEnd)
      }
    }

    if (current.next === current.lineEnd) {
      return { type: 'unterminated', raw: content.slice(rawStart) }
    }

    cursor = current.next
  }

  return { type: 'unterminated', raw: content.slice(rawStart) }
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

type NormalizePropertiesResult =
  | { ok: true; properties: FrontmatterProperties }
  | { ok: false; error: string }

function normalizeProperties(value: unknown): NormalizePropertiesResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value == null
      ? { ok: true, properties: {} }
      : { ok: false, error: UNSUPPORTED_FRONTMATTER_ERROR }
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
        continue
      }
    }

    return { ok: false, error: UNSUPPORTED_FRONTMATTER_ERROR }
  }

  return { ok: true, properties }
}

function hasYamlComments(document: ReturnType<typeof parseDocument>): boolean {
  if (document.comment || document.commentBefore) {
    return true
  }

  let hasComments = false
  visit(document, {
    Node(_, node) {
      if (node.comment || node.commentBefore) {
        hasComments = true
        return visit.BREAK
      }
      return undefined
    }
  })

  return hasComments
}

export function parseMarkdownFrontmatter(content: string): FrontmatterParseResult {
  const block = findFrontmatterBlock(content)
  if (block.type === 'none') {
    return {
      ok: true,
      hasFrontmatter: false,
      raw: '',
      body: content,
      properties: {}
    }
  }

  if (block.type === 'unterminated') {
    return {
      ok: false,
      hasFrontmatter: true,
      raw: block.raw,
      body: '',
      properties: {},
      error: 'Missing closing frontmatter delimiter.'
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

  if (hasYamlComments(document)) {
    return {
      ok: false,
      hasFrontmatter: true,
      raw: block.raw,
      body: block.body,
      properties: {},
      error: COMMENTED_FRONTMATTER_ERROR
    }
  }

  if (document.contents && !isMap(document.contents)) {
    return {
      ok: false,
      hasFrontmatter: true,
      raw: block.raw,
      body: block.body,
      properties: {},
      error: UNSUPPORTED_FRONTMATTER_ERROR
    }
  }

  const normalized = normalizeProperties(document.toJS())
  if (!normalized.ok) {
    return {
      ok: false,
      hasFrontmatter: true,
      raw: block.raw,
      body: block.body,
      properties: {},
      error: normalized.error
    }
  }

  return {
    ok: true,
    hasFrontmatter: true,
    raw: block.raw,
    body: block.body,
    properties: normalized.properties
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
