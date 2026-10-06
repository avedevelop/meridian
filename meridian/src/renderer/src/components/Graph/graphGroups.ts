import { toPosix } from '@shared/paths'

/** How nodes are coloured and grouped: by kind of note (default) or by the folder they live in. */
export type GroupMode = 'type' | 'folder'

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
