/**
 * Pure utility functions for Vault Insights panel.
 * No side effects, no imports from React or stores.
 */

/**
 * Count words in markdown text, stripping fenced code blocks first.
 */
export function countWords(text: string): number {
  // Remove fenced code blocks (``` ... ```)
  const stripped = text.replace(/```[\s\S]*?```/g, '')
  const words = stripped.trim().split(/\s+/).filter((w) => w.length > 0)
  return words.length
}

/**
 * Build an array of { date, count } buckets for the last `days` days (ending today).
 * Each bucket date is formatted YYYY-MM-DD. Dates outside the window are ignored.
 */
export function buildHeatmap(
  mtimes: Date[],
  days = 90
): { date: string; count: number }[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Build bucket map keyed by YYYY-MM-DD
  const buckets = new Map<string, number>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    buckets.set(toDateStr(d), 0)
  }

  for (const mtime of mtimes) {
    const d = new Date(mtime)
    d.setHours(0, 0, 0, 0)
    const key = toDateStr(d)
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1)
    }
  }

  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }))
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Return top-n entries from a link-count map, sorted descending by count.
 * Ties are broken by path ascending (stable ordering).
 */
export function topLinked(
  linkCounts: Map<string, number>,
  n = 5
): { path: string; count: number }[] {
  return Array.from(linkCounts.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return a.path < b.path ? -1 : a.path > b.path ? 1 : 0
    })
    .slice(0, n)
}
