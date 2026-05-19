import MiniSearch from 'minisearch'

export interface SearchResult {
  path: string
  name: string
  score: number
}

export class SearchIndex {
  private mini = new MiniSearch<{ id: string; path: string; name: string; content: string }>({
    fields: ['name', 'content'],
    storeFields: ['path', 'name'],
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
    return this.mini.search(query).map((r) => ({
      path: r.path as string,
      name: r.name as string,
      score: r.score
    }))
  }
}
