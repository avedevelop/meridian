import { toPosix } from '@shared/paths'
import type { GNode } from './graphTypes'

/** How nodes are coloured and grouped: by kind of note (default), by folder, or by tag. */
export type GroupMode = 'type' | 'folder' | 'tag'

// Soft, distinguishable on the dark graph background.
export const FOLDER_PALETTE = [
  '#a78bfa',
  '#34d399',
  '#fbbf24',
  '#60a5fa',
  '#f472b6',
  '#fb923c',
  '#22d3ee',
  '#a3e635',
  '#f87171',
  '#c084fc',
  '#2dd4bf',
  '#facc15'
]

/** Notes at the top level of the vault belong to no folder: neutral colour, no puddle. */
export const NO_FOLDER_COLOR = '#94a3b8'

/** Top-level folder of a vault-relative path, or '' for a note in the vault root. Works for `\` too. */
export function folderGroup(relativePath: string): string {
  const p = toPosix(relativePath)
  const i = p.indexOf('/')
  return i < 0 ? '' : p.slice(0, i)
}

/**
 * Folder colours are handed out in alphabetical order, so no two folders of a vault share a colour
 * (up to the palette size) and the colours stay the same until a folder is added or renamed.
 * A hash would be stable too, but with six folders two of them often landed on the same colour.
 */
export function folderColorIndex(folders: Iterable<string>): Map<string, number> {
  const sorted = [...new Set([...folders].filter(Boolean))].sort((a, b) => a.localeCompare(b))
  return new Map(sorted.map((f, i) => [f, i]))
}

export function folderColor(index: number | undefined): string {
  return index === undefined ? NO_FOLDER_COLOR : FOLDER_PALETTE[index % FOLDER_PALETTE.length]
}

/** The group a node belongs to in this mode ('' for none). */
export function groupKeyOf(d: GNode, mode: GroupMode): string {
  if (mode === 'folder') return d.folder ?? ''
  if (mode === 'tag') return d.tag ?? ''
  return ''
}

export function groupIndexOf(d: GNode, mode: GroupMode): number | undefined {
  if (mode === 'folder') return d.folderIndex
  if (mode === 'tag') return d.tagIndex
  return undefined
}

/**
 * A note can carry several tags but sits in one group. Take the most widespread tag of the note, and only
 * consider the `max` most widespread tags of the vault: more than the palette can tell apart would just
 * be noise. `tagsOf` gives the tags of a note.
 */
export function primaryTags(
  paths: string[],
  tagsOf: (path: string) => string[],
  max = FOLDER_PALETTE.length
): { tagByPath: Map<string, string>; indexByTag: Map<string, number> } {
  const count = new Map<string, number>()
  for (const p of paths) for (const t of new Set(tagsOf(p))) count.set(t, (count.get(t) ?? 0) + 1)
  const ranked = [...count]
    .filter(([, n]) => n >= 2) // a tag used once makes no group
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([t]) => t)
  const rank = new Map(ranked.map((t, i) => [t, i]))
  const tagByPath = new Map<string, string>()
  for (const p of paths) {
    let best: string | undefined
    for (const t of tagsOf(p)) {
      if (rank.has(t) && (best === undefined || rank.get(t)! < rank.get(best)!)) best = t
    }
    if (best) tagByPath.set(p, best)
  }
  // Colours go alphabetically, like folders, so they do not change when the counts shift a little.
  return { tagByPath, indexByTag: folderColorIndex(ranked) }
}
