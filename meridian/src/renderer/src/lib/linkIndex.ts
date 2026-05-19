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

  update(filePath: string, content: string, vaultPath: string): void {
    this.knownFiles.add(filePath)
    const { links, tags } = parseLinks(content)
    this.rawLinks.set(filePath, links)
    this.fileTags.set(filePath, tags)
    this.resolveAll(vaultPath)
  }

  remove(filePath: string, vaultPath: string): void {
    this.knownFiles.delete(filePath)
    this.rawLinks.delete(filePath)
    this.fileTags.delete(filePath)
    this.outlinks.delete(filePath)
    this.resolveAll(vaultPath)
  }

  private resolveAll(vaultPath: string): void {
    this.outlinks.clear()
    for (const [filePath, links] of this.rawLinks) {
      const resolved = links
        .map(link => this.resolve(link, vaultPath))
        .filter((p): p is string => p !== null)
      this.outlinks.set(filePath, resolved)
    }
  }

  private resolve(linkText: string, vaultPath: string): string | null {
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
