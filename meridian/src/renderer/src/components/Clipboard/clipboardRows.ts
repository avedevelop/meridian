import type { ClipboardEntrySummary, ClipboardListQuery, SnippetSummary } from '@shared/clipboard'

export type FilterId = 'all' | 'text' | 'link' | 'image' | 'pinned' | 'snippets'

export const FILTERS: readonly FilterId[] = ['all', 'text', 'link', 'image', 'pinned', 'snippets']

export type ClipboardRowData =
  | { type: 'entry'; key: string; entry: ClipboardEntrySummary }
  | { type: 'snippet'; key: string; snippet: SnippetSummary }

export function filterToQuery(filter: FilterId): Partial<ClipboardListQuery> {
  switch (filter) {
    case 'text':
      return { kind: 'text' }
    case 'link':
      return { kind: 'link' }
    case 'image':
      return { kind: 'image' }
    case 'pinned':
      return { pinnedOnly: true }
    default:
      return {}
  }
}

export function entryRows(entries: ClipboardEntrySummary[]): ClipboardRowData[] {
  return entries.map((entry) => ({ type: 'entry', key: entry.id, entry }))
}

export function snippetRows(snippets: SnippetSummary[], query: string): ClipboardRowData[] {
  const q = query.trim().toLowerCase()
  return snippets
    .filter((s) => !q || s.name.toLowerCase().includes(q) || s.preview.toLowerCase().includes(q))
    .map((snippet) => ({ type: 'snippet', key: `snippet:${snippet.name}`, snippet }))
}

/** Compact age label that needs no translation: 5s, 12m, 3h, 2d. */
export function shortAge(timestamp: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - timestamp) / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86_400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86_400)}d`
}

export function nextFilter(current: FilterId, direction: 1 | -1): FilterId {
  const i = FILTERS.indexOf(current)
  return FILTERS[(i + direction + FILTERS.length) % FILTERS.length]
}

export function moveSelection(
  rows: ClipboardRowData[],
  selectedKey: string | null,
  delta: number
): string | null {
  if (rows.length === 0) return null
  const current = rows.findIndex((r) => r.key === selectedKey)
  const base = current === -1 ? 0 : current
  const next = Math.min(rows.length - 1, Math.max(0, base + delta))
  return rows[next].key
}
