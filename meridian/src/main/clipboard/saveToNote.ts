import { mkdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import type { ClipboardEntry, SaveTarget, SaveToNoteResult } from '../../shared/clipboard'
import { buildInboxContent } from '../../shared/capture'
import {
  entryToMarkdown,
  formatDate,
  inboxEntry,
  noteTitleFor,
  replaceInvalidFileChars,
  type NoteBlock
} from '../../shared/clipboardNote'

export interface SaveContext {
  vaultPath: string
  attachmentFolder?: string
  dailyNoteDateFormat?: string
  now: Date
}

/** Attachment folder from preferences, restricted to a plain relative folder inside the vault. */
export function safeFolder(folder: string | undefined, fallback: string): string {
  const f = (folder ?? '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
  if (!f || f.split('/').some((seg) => seg === '..' || seg === '.' || seg === '')) return fallback
  if (/^[A-Za-z]:/.test(f)) return fallback
  return f
}

async function readOrNull(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf-8')
  } catch {
    return null
  }
}

async function saveImage(
  ctx: SaveContext,
  png: Buffer
): Promise<{ relative: string; absolute: string }> {
  const folder = safeFolder(ctx.attachmentFolder, 'assets')
  const dir = join(ctx.vaultPath, ...folder.split('/'))
  await mkdir(dir, { recursive: true })
  const name = `image-${ctx.now.getTime()}.png`
  await writeFile(join(dir, name), png)
  return { relative: `${folder}/${name}`, absolute: join(dir, name) }
}

async function writeUniqueNote(dir: string, title: string, content: string): Promise<string> {
  await mkdir(dir, { recursive: true })
  for (let i = 1; i < 1000; i++) {
    const name = i === 1 ? `${title}.md` : `${title} ${i}.md`
    const path = join(dir, name)
    try {
      await writeFile(path, content, { encoding: 'utf-8', flag: 'wx' })
      return path
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err
    }
  }
  throw new Error('could not find a free note name')
}

/** Save a clipboard entry into the vault as an Inbox line, a daily-note entry, or a new note. */
export async function saveEntryToNote(
  ctx: SaveContext,
  entry: ClipboardEntry,
  png: Buffer | null,
  target: SaveTarget
): Promise<SaveToNoteResult> {
  try {
    let imageRef: string | undefined
    if (entry.kind === 'image') {
      if (!png) return { ok: false, error: 'not-found' }
      imageRef = (await saveImage(ctx, png)).relative
    }
    const block: NoteBlock = entryToMarkdown(entry, imageRef)

    if (target === 'inbox') {
      const path = join(ctx.vaultPath, 'Inbox.md')
      const existing = await readOrNull(path)
      await writeFile(path, buildInboxContent(existing, inboxEntry(block, ctx.now)), 'utf-8')
      return { ok: true, path }
    }

    if (target === 'daily') {
      const dir = join(ctx.vaultPath, 'Daily')
      await mkdir(dir, { recursive: true })
      const title = formatDate(ctx.now, ctx.dailyNoteDateFormat || 'YYYY-MM-DD')
      const path = join(dir, `${replaceInvalidFileChars(title, '-')}.md`)
      const existing = await readOrNull(path)
      const line = inboxEntry(block, ctx.now)
      const content =
        existing === null
          ? `# ${title}\n\n${line}\n`
          : `${existing.replace(/\n+$/, '')}\n\n${line}\n`
      await writeFile(path, content, 'utf-8')
      return { ok: true, path }
    }

    const title = noteTitleFor(entry, ctx.now)
    const path = await writeUniqueNote(ctx.vaultPath, title, `# ${title}\n\n${block.markdown}\n`)
    return { ok: true, path }
  } catch {
    return { ok: false, error: 'failed' }
  }
}
