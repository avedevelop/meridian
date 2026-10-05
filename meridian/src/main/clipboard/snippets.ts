import { readdir, readFile, stat } from 'fs/promises'
import { join } from 'path'
import type { SnippetSummary } from '../../shared/clipboard'

export const SNIPPETS_DIR = '_snippets'
const MAX_SNIPPET_BYTES = 20 * 1024

const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/

function previewOf(content: string): string {
  const first =
    content
      .replace(FRONTMATTER_RE, '')
      .split('\n')
      .find((l) => l.trim()) ?? ''
  return first.replace(/^#+\s*/, '').slice(0, 120)
}

/** Snippet names are plain file names (no separators), so they can never leave the folder. */
export function isSafeSnippetName(name: string): boolean {
  return (
    name.length > 0 &&
    name.length <= 120 &&
    !/[\\/\0]/.test(name) &&
    !name.startsWith('.') &&
    !name.includes('..')
  )
}

export async function listSnippets(vaultPath: string): Promise<SnippetSummary[]> {
  const dir = join(vaultPath, SNIPPETS_DIR)
  let names: string[]
  try {
    names = await readdir(dir)
  } catch {
    return []
  }
  const out: SnippetSummary[] = []
  for (const file of names.sort((a, b) => a.localeCompare(b))) {
    if (!file.toLowerCase().endsWith('.md') || !isSafeSnippetName(file)) continue
    try {
      const path = join(dir, file)
      if ((await stat(path)).size > MAX_SNIPPET_BYTES) continue
      out.push({
        name: file.replace(/\.md$/i, ''),
        preview: previewOf(await readFile(path, 'utf-8'))
      })
    } catch {
      // unreadable file: skip
    }
  }
  return out
}

export async function readSnippet(vaultPath: string, name: string): Promise<string | null> {
  if (!isSafeSnippetName(name)) return null
  try {
    const path = join(vaultPath, SNIPPETS_DIR, `${name}.md`)
    if ((await stat(path)).size > MAX_SNIPPET_BYTES) return null
    return (await readFile(path, 'utf-8')).replace(FRONTMATTER_RE, '').trimEnd()
  } catch {
    return null
  }
}
