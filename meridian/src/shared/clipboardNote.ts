/**
 * Turning clipboard entries into Markdown, and expanding snippets.
 * Pure functions: safe to import from any process.
 */

const URL_RE = /^(https?:\/\/)\S+$/i

export function looksLikeUrl(text: string): boolean {
  return URL_RE.test(text.trim())
}

function lines(text: string): string[] {
  return text.replace(/\r\n?/g, '\n').replace(/\n+$/, '').split('\n')
}

/** Spreadsheet-style selection: 2+ rows, every row tab-separated into the same 2+ columns. */
export function looksLikeTable(text: string): boolean {
  const rows = lines(text)
  if (rows.length < 2) return false
  const cols = rows[0].split('\t').length
  return cols >= 2 && rows.every((r) => r.split('\t').length === cols)
}

export function tableToMarkdown(text: string): string {
  const rows = lines(text).map((r) => r.split('\t').map((c) => c.trim().replace(/\|/g, '\\|')))
  const [head, ...body] = rows
  const out = [
    `| ${head.join(' | ')} |`,
    `| ${head.map(() => '---').join(' | ')} |`,
    ...body.map((r) => `| ${r.join(' | ')} |`)
  ]
  return out.join('\n')
}

/** Multi-line text that reads like source code. Conservative: prose stays prose. */
export function looksLikeCode(text: string): boolean {
  const rows = lines(text).filter((r) => r.trim())
  if (rows.length < 2) return false
  const punct = rows.filter((r) =>
    /[{};]\s*$|=>|^\s*(import|const|let|var|def|class|function|return|#include)\b/.test(r)
  )
  const indented = rows.filter((r) => /^(\s{2,}|\t)\S/.test(r))
  return punct.length >= 2 || (indented.length >= 2 && punct.length >= 1)
}

export type NoteBlockKind = 'link' | 'table' | 'code' | 'text' | 'image' | 'file'

export interface NoteEntryInput {
  kind: 'text' | 'html' | 'image' | 'files'
  text: string
  files?: string[]
}

export interface NoteBlock {
  kind: NoteBlockKind
  markdown: string
}

/** Markdown for one entry. `imageRef` is the vault-relative path of an already saved image. */
export function entryToMarkdown(entry: NoteEntryInput, imageRef?: string): NoteBlock {
  if (entry.kind === 'image') {
    return { kind: 'image', markdown: imageRef ? `![](${imageRef})` : '' }
  }
  if (entry.kind === 'files') {
    const names = (entry.files ?? [entry.text]).filter(Boolean)
    return { kind: 'file', markdown: names.map((f) => `- \`${f}\``).join('\n') }
  }
  const text = entry.text.replace(/\r\n?/g, '\n').trim()
  if (looksLikeUrl(text)) return { kind: 'link', markdown: `<${text}>` }
  if (looksLikeTable(text)) return { kind: 'table', markdown: tableToMarkdown(text) }
  if (looksLikeCode(text)) {
    const fence = text.includes('```') ? '````' : '```'
    return { kind: 'code', markdown: `${fence}\n${text}\n${fence}` }
  }
  return { kind: 'text', markdown: text }
}

const pad = (n: number): string => String(n).padStart(2, '0')

export function formatDate(now: Date, format = 'YYYY-MM-DD'): string {
  return format
    .replace('YYYY', String(now.getFullYear()))
    .replace('MM', pad(now.getMonth() + 1))
    .replace('DD', pad(now.getDate()))
}

export function formatTime(now: Date): string {
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`
}

/** Line(s) to append to Inbox.md: single-line text stays a bullet, blocks follow a timestamp bullet. */
export function inboxEntry(block: NoteBlock, now: Date): string {
  const time = formatTime(now)
  if (block.kind === 'image') return `- ${time}\n\n  ${block.markdown}`
  if (block.markdown.includes('\n')) return `- ${time} (clipboard)\n\n${block.markdown}`
  return `- ${time} ${block.markdown}`
}

// Characters Windows forbids in file names, plus control characters (intentional match).
// eslint-disable-next-line no-control-regex
const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g

export function replaceInvalidFileChars(name: string, replacement: string): string {
  return name.replace(INVALID_FILENAME_CHARS, replacement)
}
const RESERVED_WINDOWS_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

/** A safe, human-readable file name (without extension) for a new note made from the clipboard. */
export function noteTitleFor(entry: NoteEntryInput, now: Date): string {
  const fallback = `Clipboard ${formatDate(now)} ${pad(now.getHours())}${pad(now.getMinutes())}`
  if (entry.kind !== 'text' && entry.kind !== 'html') return fallback
  const first = entry.text.trim().split('\n')[0] ?? ''
  const cleaned = first
    .replace(/^https?:\/\//i, '')
    .replace(INVALID_FILENAME_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s#>*-]+/, '')
    .trim()
    .slice(0, 50)
    .trim()
    .replace(/[. ]+$/, '')
  if (!cleaned || RESERVED_WINDOWS_NAMES.test(cleaned)) return fallback
  return cleaned
}

/** Expand `{{date}}`, `{{time}}` and `{{clipboard}}` in a snippet. Unknown placeholders are left as is. */
export function expandSnippet(
  template: string,
  ctx: { now: Date; clipboard: string; dateFormat?: string }
): string {
  return template.replace(/\{\{\s*(date|time|clipboard)\s*\}\}/g, (_m, key: string) => {
    if (key === 'date') return formatDate(ctx.now, ctx.dateFormat)
    if (key === 'time') return formatTime(ctx.now)
    return ctx.clipboard
  })
}
