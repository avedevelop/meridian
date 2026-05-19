import { create } from 'zustand'
import { LinkIndex } from '../lib/linkIndex'
import { SearchIndex, SearchResult } from '../lib/searchIndex'

interface LinkState {
  searchResults: SearchResult[]
  searchQuery: string

  indexFile: (path: string, name: string, content: string, vaultPath: string) => void
  backlinks: (path: string) => string[]
  outlinks: (path: string) => string[]
  tagsForFile: (path: string) => string[]
  allTags: () => Map<string, string[]>
  allFiles: () => string[]
  search: (query: string) => void
  reset: () => void
}

let linkIndex = new LinkIndex()
let searchIndex = new SearchIndex()

export const useLinkStore = create<LinkState>((set) => ({
  searchResults: [],
  searchQuery: '',

  indexFile: (path, name, content, vaultPath) => {
    linkIndex.update(path, content, vaultPath)
    searchIndex.addOrUpdate(path, name, content)
  },

  backlinks: (path) => linkIndex.getBacklinks(path),
  outlinks: (path) => linkIndex.getOutlinks(path),
  tagsForFile: (path) => linkIndex.getTags(path),
  allTags: () => linkIndex.getAllTags(),
  allFiles: () => linkIndex.getAllFiles(),

  search: (query) => {
    set({ searchQuery: query, searchResults: searchIndex.search(query) })
  },

  reset: () => {
    linkIndex = new LinkIndex()
    searchIndex = new SearchIndex()
    set({ searchResults: [], searchQuery: '' })
  },
}))
