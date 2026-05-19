import { parseLinks } from './linkParser'

export class LinkIndex {
  // filePath → resolved outlink paths
  private outlinks = new Map<string, string[]>()
  // filePath → raw link texts
  private rawLinks = new Map<string, string[]>()
  // filePath → tags
  private fileTags = new Map<string, string[]>()
  // all known file paths (for resolution)
  private knownFiles = new Set<string>()

  update(filePath: string, content: string, _vaultPath: string): void {
    this.knownFiles.add(filePath)

    let extractedLinks: string[] = []
    let extractedTags: string[] = []

    if (filePath.endsWith('.canvas')) {
      try {
        const data = JSON.parse(content)
        const nodes = data.nodes || []

        let allText = ''
        for (const node of nodes) {
          if (node.type === 'file' && node.file) {
            // node.file is something like "Projects/Idea.md"
            const baseName = node.file.split('/').pop()?.replace(/\.md$/i, '')
            if (baseName) extractedLinks.push(baseName)
          } else if (node.type === 'text' && node.text) {
            allText += node.text + '\n'
          }
        }

        // Parse wikilinks and tags from all text nodes
        const parsedText = parseLinks(allText)
        extractedLinks.push(...parsedText.links)
        extractedTags.push(...parsedText.tags)
      } catch {
        // invalid JSON, ignore
      }
    } else {
      const { links, tags } = parseLinks(content)
      extractedLinks = links
      extractedTags = tags
    }

    this.rawLinks.set(filePath, extractedLinks)
    this.fileTags.set(filePath, extractedTags)
    this.resolveAll()
  }

  remove(filePath: string, _vaultPath: string): void {
    this.knownFiles.delete(filePath)
    this.rawLinks.delete(filePath)
    this.fileTags.delete(filePath)
    this.outlinks.delete(filePath)
    this.resolveAll()
  }

  private resolveAll(): void {
    this.outlinks.clear()
    for (const [filePath, links] of this.rawLinks) {
      const resolved = links
        .map((link) => this.resolve(link))
        .filter((p): p is string => p !== null)
      this.outlinks.set(filePath, resolved)
    }
  }

  private resolve(linkText: string): string | null {
    const lower = linkText.toLowerCase()
    for (const known of this.knownFiles) {
      const name = known.split('/').pop() ?? ''
      const baseName = name.replace(/\.md$/i, '').toLowerCase()
      if (baseName === lower) return known
    }
    return null
  }

  getOutlinks(filePath: string): string[] {
    return this.outlinks.get(filePath) ?? []
  }

  getBacklinks(filePath: string): string[] {
    const result: string[] = []
    for (const [src, targets] of this.outlinks) {
      if (targets.includes(filePath)) result.push(src)
    }
    return result
  }

  getTags(filePath: string): string[] {
    return this.fileTags.get(filePath) ?? []
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
