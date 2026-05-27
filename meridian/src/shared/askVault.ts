import { parseMarkdownFrontmatter, type FrontmatterProperties } from './frontmatter'
import { extractRelationReferences, type RelationReference } from './relationships'
import type { SavedView } from './views'

export interface AskVaultNoteInput {
  path: string
  name: string
  content: string
}

export interface AskVaultSource {
  path: string
  name: string
  score: number
  snippet: string
  properties: FrontmatterProperties
  relations: RelationReference[]
}

export interface AskVaultAnswer {
  answer: string
  sources: AskVaultSource[]
}

export interface AskVaultContext {
  sources: AskVaultSource[]
  views: SavedView[]
}

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'how',
  'i',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'the',
  'to',
  'what',
  'где',
  'для',
  'как',
  'кто',
  'на',
  'не',
  'по',
  'про',
  'что',
  'это'
])

function plainText(content: string): string {
  const parsed = parseMarkdownFrontmatter(content)
  const body = parsed.ok ? parsed.body : content
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?]]/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^\p{L}\p{N}_-]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token))
}

function metadataText(properties: FrontmatterProperties, relations: RelationReference[]): string {
  const props = Object.entries(properties)
    .map(([key, value]) => `${key} ${Array.isArray(value) ? value.join(' ') : String(value ?? '')}`)
    .join(' ')
  const rels = relations.map((relation) => `${relation.key} ${relation.target}`).join(' ')
  return `${props} ${rels}`.trim()
}

function excerpt(text: string, terms: string[], maxLength = 220): string {
  if (text.length <= maxLength) return text
  const lower = text.toLowerCase()
  const firstHit = terms.map((term) => lower.indexOf(term)).find((index) => index >= 0) ?? 0
  const start = Math.max(0, firstHit - 70)
  const snippet = text.slice(start, start + maxLength).trim()
  return `${start > 0 ? '...' : ''}${snippet}${start + maxLength < text.length ? '...' : ''}`
}

export function buildAskVaultContext(
  notes: AskVaultNoteInput[],
  views: SavedView[] = []
): AskVaultContext {
  return {
    sources: notes
      .filter((note) => note.name.toLowerCase().endsWith('.md'))
      .map((note) => {
        const parsed = parseMarkdownFrontmatter(note.content)
        const properties = parsed.ok ? parsed.properties : {}
        const relations = extractRelationReferences(note.content)
        const text = plainText(note.content)
        return {
          path: note.path,
          name: note.name,
          score: 0,
          snippet: excerpt(text, []),
          properties,
          relations
        }
      }),
    views
  }
}

export function answerAskVaultQuestion(
  question: string,
  context: AskVaultContext,
  maxSources = 5
): AskVaultAnswer {
  const terms = tokenize(question)
  if (terms.length === 0) {
    return {
      answer: '',
      sources: []
    }
  }

  const scored = context.sources
    .map((source) => {
      const haystack = `${source.name} ${source.snippet} ${metadataText(
        source.properties,
        source.relations
      )}`.toLowerCase()
      const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0)
      return {
        ...source,
        score,
        snippet: excerpt(source.snippet, terms)
      }
    })
    .filter((source) => source.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, maxSources)

  if (scored.length === 0) {
    return {
      answer: 'No matching local notes were found for this question.',
      sources: []
    }
  }

  const viewNames = context.views.map((view) => view.name).join(', ')
  const sourceNames = scored.map((source) => source.name.replace(/\.md$/i, '')).join(', ')
  const answer = viewNames
    ? `I found relevant local context in ${sourceNames}. Saved views available for follow-up: ${viewNames}.`
    : `I found relevant local context in ${sourceNames}.`

  return { answer, sources: scored }
}
