import MiniSearch from 'minisearch'

export interface SearchResult {
  path: string
  name: string
  score: number
  snippet?: string
}

export class SearchIndex {
  private mini = new MiniSearch<{ id: string; path: string; name: string; content: string }>({
    fields: ['name', 'content'],
    storeFields: ['path', 'name', 'content'],
    idField: 'id',
    searchOptions: { boost: { name: 3 }, fuzzy: 0.2, prefix: true }
  })

  addOrUpdate(path: string, name: string, content: string): void {
    if (this.mini.has(path)) this.mini.discard(path)
    this.mini.add({ id: path, path, name, content })
  }

  remove(path: string): void {
    if (this.mini.has(path)) this.mini.discard(path)
  }

  search(query: string): SearchResult[] {
    if (!query.trim()) return []
    const results = this.mini.search(query)
    return results.map((r) => {
      const content = (r.content as string) || ''
      const snippet = this.getSnippet(content, query)
      return {
        path: r.path as string,
        name: r.name as string,
        score: r.score,
        snippet
      }
    })
  }

  private getSnippet(content: string, query: string): string {
    if (!content) return ''
    const q = query.toLowerCase().trim()
    if (!q) return content.slice(0, 150).replace(/\s+/g, ' ')

    const terms = q.split(/\s+/).filter(Boolean)
    let matchIdx = -1
    for (const term of terms) {
      const idx = content.toLowerCase().indexOf(term)
      if (idx !== -1) {
        matchIdx = idx
        break
      }
    }

    if (matchIdx === -1) {
      return content.slice(0, 150).replace(/\s+/g, ' ')
    }

    const start = Math.max(0, matchIdx - 40)
    const end = Math.min(content.length, matchIdx + 110)
    let snippet = content.slice(start, end).replace(/\s+/g, ' ')

    if (start > 0) snippet = '...' + snippet
    if (end < content.length) snippet = snippet + '...'
    return snippet
  }
}
