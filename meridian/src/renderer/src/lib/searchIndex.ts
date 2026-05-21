import MiniSearch from 'minisearch'

export interface SearchResult {
  path: string
  name: string
  score: number
  snippet: string
}

function extractSnippet(content: string, query: string): string {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const lower = content.toLowerCase()
  // Anchor to the longest query word — better proxy for "most relevant"
  const sorted = [...words].sort((a, b) => b.length - a.length)
  let bestPos = -1
  for (const word of sorted) {
    const idx = lower.indexOf(word)
    if (idx !== -1) { bestPos = idx; break }
  }
  if (bestPos === -1) return content.slice(0, 120).replace(/\n/g, ' ')
  const start = Math.max(0, bestPos - 80)
  const end = Math.min(content.length, bestPos + 80)
  let snippet = content.slice(start, end).replace(/\n/g, ' ').trim()
  if (start > 0) snippet = '…' + snippet
  if (end < content.length) snippet = snippet + '…'
  return snippet
}

export class SearchIndex {
  private mini = new MiniSearch<{ id: string; path: string; name: string; content: string }>({
    fields: ['name', 'content'],
    storeFields: ['path', 'name'],
    idField: 'id',
    searchOptions: { boost: { name: 3 }, fuzzy: 0.2, prefix: true }
  })

  private contentCache = new Map<string, string>()

  addOrUpdate(path: string, name: string, content: string): void {
    if (this.mini.has(path)) this.mini.discard(path)
    this.mini.add({ id: path, path, name, content })
    this.contentCache.set(path, content)
  }

  remove(path: string): void {
    if (this.mini.has(path)) this.mini.discard(path)
    this.contentCache.delete(path)
  }

  search(query: string): SearchResult[] {
    if (!query.trim()) return []
    return this.mini.search(query).map((r) => ({
      path: r.path as string,
      name: r.name as string,
      score: r.score,
      snippet: extractSnippet(this.contentCache.get(r.path as string) ?? '', query)
    }))
  }
}
