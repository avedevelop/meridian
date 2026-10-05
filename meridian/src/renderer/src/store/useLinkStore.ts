import { create } from 'zustand'
import { LinkIndex, type IndexedRelation } from '../lib/linkIndex'
import { SearchIndex, SearchResult } from '../lib/searchIndex'

interface LinkState {
  searchResults: SearchResult[]
  searchQuery: string
  indexVersion: number
  tagsVersion: number

  indexFile: (path: string, name: string, content: string, vaultPath: string) => void
  /** Index many files with one resolution pass and one store update (opening a vault). */
  indexFiles: (files: IndexableFile[], vaultPath: string) => void
  backlinks: (path: string) => string[]
  outlinks: (path: string) => string[]
  relationsForFile: (path: string) => IndexedRelation[]
  unresolvedRelationsForFile: (path: string) => IndexedRelation[]
  tagsForFile: (path: string) => string[]
  allTags: () => Map<string, string[]>
  allFiles: () => string[]
  search: (query: string) => void
  removeFile: (path: string, vaultPath: string) => void
  reset: () => void
}

export interface IndexableFile {
  path: string
  name: string
  content: string
}

let linkIndex = new LinkIndex()
let searchIndex = new SearchIndex()

export const useLinkStore = create<LinkState>((set) => ({
  searchResults: [],
  searchQuery: '',
  indexVersion: 0,
  tagsVersion: 0,

  indexFile: (path, name, content, vaultPath) => {
    linkIndex.update(path, content, vaultPath)
    searchIndex.addOrUpdate(path, name, content)
    set((s) => ({
      indexVersion: s.indexVersion + 1,
      tagsVersion: s.tagsVersion + 1,
      searchResults: s.searchQuery.trim() ? searchIndex.search(s.searchQuery) : s.searchResults
    }))
  },

  indexFiles: (files, vaultPath) => {
    if (files.length === 0) return
    linkIndex.updateMany(files, vaultPath)
    for (const f of files) searchIndex.addOrUpdate(f.path, f.name, f.content)
    set((s) => ({
      indexVersion: s.indexVersion + 1,
      tagsVersion: s.tagsVersion + 1,
      searchResults: s.searchQuery.trim() ? searchIndex.search(s.searchQuery) : s.searchResults
    }))
  },

  backlinks: (path) => linkIndex.getBacklinks(path),
  outlinks: (path) => linkIndex.getOutlinks(path),
  relationsForFile: (path) => linkIndex.getRelations(path),
  unresolvedRelationsForFile: (path) => linkIndex.getUnresolvedRelations(path),
  tagsForFile: (path) => linkIndex.getTags(path),
  allTags: () => linkIndex.getAllTags(),
  allFiles: () => linkIndex.getAllFiles(),

  search: (query) => {
    set({ searchQuery: query, searchResults: searchIndex.search(query) })
  },

  removeFile: (path, vaultPath) => {
    linkIndex.remove(path, vaultPath)
    searchIndex.remove(path)
    set((s) => ({
      indexVersion: s.indexVersion + 1,
      tagsVersion: s.tagsVersion + 1,
      searchResults: s.searchQuery.trim() ? searchIndex.search(s.searchQuery) : s.searchResults
    }))
  },

  reset: () => {
    linkIndex = new LinkIndex()
    searchIndex = new SearchIndex()
    set({ searchResults: [], searchQuery: '', indexVersion: 0, tagsVersion: 0 })
  }
}))
