/**
 * Shared helpers for the Quick Capture feature.
 * Pure functions — no side effects, no I/O — safe to import from any process.
 */

/**
 * Formats a single capture line.
 * @example formatCaptureLine('idea', new Date('2024-01-01T14:05:00')) === '- 14:05 idea'
 */
export function formatCaptureLine(text: string, now: Date): string {
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  return `- ${hh}:${mm} ${text}`
}

/**
 * Builds the full Inbox.md content by appending a new line.
 * If `existing` is null or empty, creates the file with an `# Inbox` heading.
 * Always ends with exactly one trailing newline.
 */
export function buildInboxContent(existing: string | null, line: string): string {
  if (!existing) {
    return `# Inbox\n\n${line}\n`
  }
  // Normalize: ensure content ends with exactly one newline before appending
  const trimmed = existing.replace(/\n+$/, '')
  return `${trimmed}\n${line}\n`
}
