import { parseLinks } from './linkParser'
import type { RelationReference } from '@shared/relationships'
import { basename, toPosix } from '@shared/paths'

export interface IndexedRelation extends RelationReference {
  resolvedPath: string | null
}

/**
 * Link, backlink, tag and relation index for a vault.
 *
 * Parsing happens when a file is added or changed. Resolving link text to file paths is lazy
 * and batched: any number of updates mark the index dirty, and the first read afterwards
 * resolves everything once, using hash lookups instead of scanning every file per link. That
 * keeps opening a large vault and saving a note linear in the vault size, not cubic.
 * `tests/renderer/linkIndexEquivalence.test.ts` checks it against the original implementation.
 */
export class LinkIndex {
  // filePath → raw link texts
  private rawLinks = new Map<string, string[]>()
  // filePath → relation references from frontmatter
  private rawRelations = new Map<string, RelationReference[]>()
  // filePath → tags
  private fileTags = new Map<string, string[]>()
  // all known file paths, in the order they were first seen (earlier wins on ambiguous names)
  private knownFiles = new Set<string>()

  // Derived data, rebuilt on demand
  private outlinks = new Map<string, string[]>()
  private relations = new Map<string, IndexedRelation[]>()
  private inbound = new Map<string, string[]>()
  private dirty = false

  // Lookup tables for resolution: key → first known file with that key
  private order = new Map<string, number>()
  private nextOrder = 0
  private byName = new Map<string, string>()
  private byTail = new Map<string, string>()
  private lookupStale = false

  update(filePath: string, content: string, _vaultPath: string): void {
    this.ingest(filePath, content)
    this.dirty = true
  }

  /** Add or change many files, then resolve once. Use this when opening a vault. */
  updateMany(files: Array<{ path: string; content: string }>, _vaultPath: string): void {
    for (const f of files) this.ingest(f.path, f.content)
    if (files.length > 0) this.dirty = true
  }

  private ingest(filePath: string, content: string): void {
    this.track(filePath)

    let extractedLinks: string[] = []
    let extractedTags: string[] = []
    let extractedRelations: RelationReference[] = []

    if (filePath.endsWith('.canvas')) {
      try {
        const data = JSON.parse(content)
        const nodes = data.nodes || []

        let allText = ''
        for (const node of nodes) {
          if (node.type === 'file' && node.file) {
            // node.file is something like "Projects/Idea.md"
            const baseName = basename(node.file).replace(/\.md$/i, '')
            if (baseName) extractedLinks.push(baseName)
          } else if (node.type === 'text' && node.text) {
            allText += node.text + '\n'
          }
        }

        // Parse wikilinks and tags from all text nodes
        const parsedText = parseLinks(allText)
        extractedLinks.push(...parsedText.links)
        extractedTags.push(...parsedText.tags)
        extractedRelations.push(...parsedText.relations)
      } catch {
        // invalid JSON, ignore
      }
    } else {
      const { links, tags, relations } = parseLinks(content)
      extractedLinks = links
      extractedTags = tags
      extractedRelations = relations
    }

    this.rawLinks.set(filePath, extractedLinks)
    this.rawRelations.set(filePath, extractedRelations)
    this.fileTags.set(filePath, extractedTags)
  }

  remove(filePath: string, _vaultPath: string): void {
    if (this.knownFiles.delete(filePath)) {
      this.order.delete(filePath)
      this.lookupStale = true
    }
    this.rawLinks.delete(filePath)
    this.rawRelations.delete(filePath)
    this.fileTags.delete(filePath)
    this.dirty = true
  }

  /** Register a file path and its lookup keys. */
  private track(filePath: string): void {
    if (this.knownFiles.has(filePath)) return
    this.knownFiles.add(filePath)
    this.order.set(filePath, this.nextOrder++)
    if (!this.lookupStale) this.addToLookup(filePath)
  }

  private keysFor(filePath: string): { name: string; tail: string } {
    const posix = toPosix(filePath).replace(/\.md$/i, '').toLowerCase()
    const parts = posix.split('/')
    return { name: parts[parts.length - 1] ?? '', tail: parts.slice(-2).join('/') }
  }

  private addToLookup(filePath: string): void {
    const { name, tail } = this.keysFor(filePath)
    if (!this.byName.has(name)) this.byName.set(name, filePath)
    if (!this.byTail.has(tail)) this.byTail.set(tail, filePath)
  }

  private rebuildLookup(): void {
    this.byName.clear()
    this.byTail.clear()
    for (const filePath of this.knownFiles) this.addToLookup(filePath)
    this.lookupStale = false
  }

  private ensureResolved(): void {
    if (!this.dirty) return
    if (this.lookupStale) this.rebuildLookup()

    this.outlinks.clear()
    this.relations.clear()
    this.inbound.clear()

    for (const [filePath, links] of this.rawLinks) {
      const resolved = links
        .map((link) => this.resolve(link))
        .filter((p): p is string => p !== null)
      this.outlinks.set(filePath, resolved)
      for (const target of new Set(resolved)) {
        const sources = this.inbound.get(target)
        if (sources) sources.push(filePath)
        else this.inbound.set(target, [filePath])
      }
    }

    for (const [filePath, relations] of this.rawRelations) {
      this.relations.set(
        filePath,
        relations.map((relation) => ({
          ...relation,
          resolvedPath: this.resolve(relation.target)
        }))
      )
    }
    this.dirty = false
  }

  /** Link text matches a file by name or by its last two path segments; the earliest file wins. */
  private resolve(linkText: string): string | null {
    const normalized = toPosix(linkText).replace(/\.md$/i, '').toLowerCase()
    const byName = this.byName.get(normalized)
    const byTail = this.byTail.get(normalized)
    if (byName === undefined) return byTail ?? null
    if (byTail === undefined) return byName
    return (this.order.get(byName) ?? 0) <= (this.order.get(byTail) ?? 0) ? byName : byTail
  }

  getOutlinks(filePath: string): string[] {
    this.ensureResolved()
    return this.outlinks.get(filePath) ?? []
  }

  getBacklinks(filePath: string): string[] {
    this.ensureResolved()
    return [...(this.inbound.get(filePath) ?? [])]
  }

  getTags(filePath: string): string[] {
    return this.fileTags.get(filePath) ?? []
  }

  getRelations(filePath: string): IndexedRelation[] {
    this.ensureResolved()
    return this.relations.get(filePath) ?? []
  }

  getUnresolvedRelations(filePath: string): IndexedRelation[] {
    return this.getRelations(filePath).filter((relation) => !relation.resolvedPath)
  }

  getAllTags(): Map<string, string[]> {
    const result = new Map<string, string[]>()
    for (const [filePath, tags] of this.fileTags) {
      for (const tag of tags) {
        const files = result.get(tag) ?? []
        files.push(filePath)
        result.set(tag, files)
      }
    }
    return result
  }

  getAllFiles(): string[] {
    return Array.from(this.knownFiles)
  }
}
