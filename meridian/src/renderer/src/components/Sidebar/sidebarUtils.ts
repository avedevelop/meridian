import type { VaultFile } from '@shared/types'

export function sortAndFilterFiles(
  files: VaultFile[],
  sortBy: 'name' | 'created' | 'modified',
  showHidden: boolean,
  excluded: string[]
): VaultFile[] {
  const filtered = files.filter((f) => {
    if (!showHidden && f.name.startsWith('.')) return false
    if (excluded.includes(f.name)) return false
    return true
  })
  const sorted = [...filtered].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
    if (sortBy === 'name') return a.name.localeCompare(b.name)
    if (sortBy === 'created') return b.birthtime - a.birthtime
    if (sortBy === 'modified') return b.mtime - a.mtime
    return 0
  })
  return sorted.map((f) =>
    f.isDirectory && f.children
      ? { ...f, children: sortAndFilterFiles(f.children, sortBy, showHidden, excluded) }
      : f
  )
}
