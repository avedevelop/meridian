# Meridian Advanced Features Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 5 features that bring Meridian closer to full Obsidian parity: note embeds, Mermaid diagrams, ==highlight== syntax, frontmatter tags in Tags Panel, and recent files in command palette.

**Architecture:** Tasks 1–3 extend `markdownUtils.ts` and `MarkdownPreview.tsx` using the same post-processing pipeline already in place. Task 4 updates `linkParser.ts` which feeds `linkIndex.ts` and ultimately `TagsPanel.tsx`. Task 5 is a pure App.tsx state addition. All tasks are independent.

**Tech Stack:** React 18, TypeScript, remark/rehype (unified), Mermaid.js (new dep), Zustand, Vitest

---

## File Map

**Modified:**
- `src/renderer/src/components/Editor/markdownUtils.ts` — Tasks 1, 3
- `src/renderer/src/components/Editor/MarkdownPreview.tsx` — Tasks 1, 2, 3
- `src/renderer/src/lib/linkParser.ts` — Task 4
- `src/renderer/src/App.tsx` — Task 5

**Tests:**
- `tests/renderer/markdownUtils.test.ts` — Tasks 1, 3
- `tests/renderer/linkParser.test.ts` — Task 4

---

## Task 1: Note Embeds `![[Note.md]]` in Preview

**Context:** `postprocessWikiLinks` in `markdownUtils.ts` currently returns `fullMatch` unchanged for non-image, non-excalidraw embeds. `![[Note.md]]` should render an inline preview of the linked note's content. The approach mirrors how excalidraw embeds work: create a placeholder div in `postprocessWikiLinks`, then in a `useEffect` in `MarkdownPreview` load the actual content and render it.

**Files:**
- Modify: `src/renderer/src/components/Editor/markdownUtils.ts`
- Modify: `src/renderer/src/components/Editor/MarkdownPreview.tsx`
- Modify: `tests/renderer/markdownUtils.test.ts`

- [ ] **Step 1: Add note embed test**

Add to `tests/renderer/markdownUtils.test.ts` (create if it doesn't exist — but first check if `tests/renderer/markdownPreview.test.ts` already covers markdownUtils; if so add there):

```typescript
import { describe, it, expect } from 'vitest'
import type { VaultFile } from '../../src/shared/types'
import { postprocessWikiLinks } from '../../src/renderer/src/components/Editor/markdownUtils'

const makeFile = (name: string, relativePath: string, isDirectory = false): VaultFile => ({
  name,
  path: `/vault/${relativePath}`,
  relativePath,
  isDirectory,
  mtime: 0,
  birthtime: 0
})

describe('postprocessWikiLinks note embeds', () => {
  it('creates note-embed div for ![[Note.md]] when file exists', () => {
    const html = '<p>![[My Note.md]]</p>'
    const files = [makeFile('My Note.md', 'My Note.md')]
    const result = postprocessWikiLinks(html, files)
    expect(result).toContain('class="note-embed"')
    expect(result).toContain('data-path="/vault/My Note.md"')
    expect(result).not.toContain('![[')
  })

  it('creates note-embed div for ![[Note]] without extension', () => {
    const html = '<p>![[My Note]]</p>'
    const files = [makeFile('My Note.md', 'notes/My Note.md')]
    const result = postprocessWikiLinks(html, files)
    expect(result).toContain('class="note-embed"')
    expect(result).toContain('data-path="/vault/notes/My Note.md"')
  })

  it('leaves ![[Unknown Note]] unchanged when file not found', () => {
    const html = '<p>![[Unknown Note]]</p>'
    const result = postprocessWikiLinks(html, [])
    expect(result).toBe('<p>![[Unknown Note]]</p>')
  })

  it('does not create note-embed for images', () => {
    const html = '<p>![[photo.png]]</p>'
    const files = [makeFile('photo.png', 'assets/photo.png')]
    const result = postprocessWikiLinks(html, files)
    expect(result).toContain('<img')
    expect(result).not.toContain('note-embed')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
npm run test -- tests/renderer/markdownUtils.test.ts 2>&1 | tail -15
```

Expected: FAIL — `note-embed` class not present yet.

- [ ] **Step 3: Update postprocessWikiLinks in markdownUtils.ts**

Read the current file first. In the `![[...]]` handler, add a note-embed case BEFORE the final `return fullMatch`. Insert after the `IMAGE_EXTS.test(linkText)` block:

```typescript
// Note embed: find matching .md file
const linkNoExt = linkText.replace(/\.md$/i, '')
const mdMatch = flatFiles.find((f) => {
  if (f.isDirectory || !f.name.endsWith('.md')) return false
  const nameNoExt = f.name.replace(/\.md$/i, '')
  return (
    nameNoExt.toLowerCase() === linkNoExt.toLowerCase() ||
    f.relativePath.toLowerCase() === linkText.toLowerCase()
  )
})
if (mdMatch) {
  const escapedPath = mdMatch.path.replace(/"/g, '&quot;')
  const displayName = linkNoExt.replace(/"/g, '&quot;')
  return `<div class="note-embed" data-path="${escapedPath}" style="border:1px solid var(--border-color);border-radius:6px;padding:12px 16px;margin:12px 0;background:var(--bg-secondary)"><div class="note-embed-title" style="font-size:11px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;letter-spacing:0.04em">📄 ${displayName}</div><div class="note-embed-content" style="color:var(--text-primary);font-size:0.95em">Loading…</div></div>`
}
```

The full updated `![[...]]` handler is now:
1. excalidraw → excalidraw-embed div
2. IMAGE_EXTS → img tag
3. .md match → note-embed div
4. otherwise → `return fullMatch`

- [ ] **Step 4: Add note-embed useEffect to MarkdownPreview.tsx**

Read `MarkdownPreview.tsx`. Find the existing `useEffect` that handles `.excalidraw-embed` elements. Add a SECOND `useEffect` below it that handles `.note-embed`:

```typescript
// Load and render note embeddings
useEffect(() => {
  if (!containerRef.current) return
  const embeds = containerRef.current.querySelectorAll('.note-embed')

  embeds.forEach(async (el) => {
    const htmlEl = el as HTMLElement
    const dataPath = htmlEl.dataset.path
    if (!dataPath) return
    const contentEl = htmlEl.querySelector('.note-embed-content') as HTMLElement | null
    if (!contentEl) return

    try {
      const raw = await window.vault.readFile(dataPath)
      // Strip frontmatter before rendering embedded note
      const withoutFm = raw.replace(/^---[\s\S]*?---\n*/, '')
      const renderedHtml = String(processor.processSync(withoutFm))
      contentEl.innerHTML = renderedHtml
    } catch {
      contentEl.innerHTML = `<span style="color:var(--text-secondary);font-size:12px;font-style:italic">Could not load note</span>`
    }
  })
}, [html])
```

Note: `processor` is already defined at module level in `MarkdownPreview.tsx`. Use it directly.

- [ ] **Step 5: Run tests and typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
npm run typecheck 2>&1 | tail -10
npm run test -- tests/renderer/markdownUtils.test.ts 2>&1 | tail -15
```

Expected: 0 TypeScript errors, all note-embed tests pass.

- [ ] **Step 6: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
git add src/renderer/src/components/Editor/markdownUtils.ts \
        src/renderer/src/components/Editor/MarkdownPreview.tsx \
        tests/renderer/markdownUtils.test.ts
git commit -m "feat: render ![[Note.md]] as inline note embeds in preview"
```

---

## Task 2: Mermaid Diagrams in Preview

**Context:** Mermaid is NOT yet installed. remark-gfm renders fenced ` ```mermaid ` blocks as `<pre><code class="language-mermaid">...</code></pre>` in HTML. A `useEffect` in `MarkdownPreview` detects these, calls `mermaid.render()`, and replaces the `<pre>` with the generated SVG.

**Files:**
- Modify: `src/renderer/src/components/Editor/MarkdownPreview.tsx`

- [ ] **Step 1: Install mermaid**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
npm install mermaid 2>&1 | tail -5
```

Expected: mermaid added to `node_modules` and `package.json` dependencies.

- [ ] **Step 2: Add mermaid useEffect to MarkdownPreview.tsx**

Read the file. Find the closing `}` of the last `useEffect` (the excalidraw or note-embed one). Add a NEW `useEffect` after all the existing ones, before the `return (`:

```typescript
// Render Mermaid diagrams
useEffect(() => {
  if (!containerRef.current) return
  const codeEls = containerRef.current.querySelectorAll('code.language-mermaid')
  if (codeEls.length === 0) return

  let cancelled = false

  ;(async () => {
    const mermaid = (await import('mermaid')).default
    mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' })

    for (const codeEl of codeEls) {
      if (cancelled) break
      const code = codeEl.textContent ?? ''
      const pre = codeEl.parentElement
      if (!pre) continue

      const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      try {
        const { svg } = await mermaid.render(id, code)
        const wrapper = document.createElement('div')
        wrapper.style.cssText = 'overflow-x:auto;margin:12px 0;background:var(--bg-secondary);border-radius:6px;padding:16px;text-align:center'
        wrapper.innerHTML = svg
        pre.replaceWith(wrapper)
      } catch {
        // leave as code block on render error
      }
    }
  })()

  return () => { cancelled = true }
}, [html])
```

- [ ] **Step 3: Run typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
npm run typecheck 2>&1 | tail -10
```

Expected: 0 errors. (No unit tests possible for this — it requires a browser DOM + mermaid rendering.)

- [ ] **Step 4: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
git add src/renderer/src/components/Editor/MarkdownPreview.tsx package.json package-lock.json
git commit -m "feat: render Mermaid diagrams in markdown preview"
```

---

## Task 3: ==Highlighted Text== in Preview

**Context:** Obsidian renders `==text==` as highlighted (yellow background). remark doesn't support this syntax, so the `==text==` literal appears unchanged in the HTML output. We post-process the HTML to convert it, skipping content inside `<code>` and `<pre>` tags.

**Files:**
- Modify: `src/renderer/src/components/Editor/markdownUtils.ts`
- Modify: `src/renderer/src/components/Editor/MarkdownPreview.tsx`
- Modify: `tests/renderer/markdownUtils.test.ts`

- [ ] **Step 1: Write the test**

Add to `tests/renderer/markdownUtils.test.ts`:

```typescript
import { processHighlights } from '../../src/renderer/src/components/Editor/markdownUtils'

describe('processHighlights', () => {
  it('converts ==text== to <mark> tag', () => {
    const result = processHighlights('<p>Hello ==world== here</p>')
    expect(result).toContain('<mark')
    expect(result).toContain('world')
    expect(result).not.toContain('==world==')
  })

  it('applies background style to mark', () => {
    const result = processHighlights('<p>==highlight==</p>')
    expect(result).toContain('background:')
  })

  it('does not convert ==text== inside <code>', () => {
    const result = processHighlights('<code>==not highlighted==</code>')
    expect(result).toBe('<code>==not highlighted==</code>')
  })

  it('does not convert ==text== inside <pre>', () => {
    const result = processHighlights('<pre><code>==not highlighted==</code></pre>')
    expect(result).toContain('==not highlighted==')
    expect(result).not.toContain('<mark')
  })

  it('handles multiple highlights in one paragraph', () => {
    const result = processHighlights('<p>==first== and ==second==</p>')
    const markCount = (result.match(/<mark/g) ?? []).length
    expect(markCount).toBe(2)
  })

  it('leaves text without == unchanged', () => {
    const result = processHighlights('<p>normal text</p>')
    expect(result).toBe('<p>normal text</p>')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
npm run test -- tests/renderer/markdownUtils.test.ts 2>&1 | tail -15
```

Expected: FAIL — `processHighlights` not exported yet.

- [ ] **Step 3: Add processHighlights to markdownUtils.ts**

Add this function at the end of `src/renderer/src/components/Editor/markdownUtils.ts`:

```typescript
export function processHighlights(html: string): string {
  // Split on code/pre blocks, only process text outside them
  return html.replace(
    /(<(?:pre|code)[^>]*>[\s\S]*?<\/(?:pre|code)>)|==([^=\n]{1,300})==/gi,
    (fullMatch, codeBlock, highlight) => {
      if (codeBlock) return fullMatch
      if (highlight !== undefined) {
        return `<mark style="background:rgba(255,220,0,0.25);border-radius:2px;padding:0 2px">${highlight}</mark>`
      }
      return fullMatch
    }
  )
}
```

- [ ] **Step 4: Wire processHighlights into MarkdownPreview.tsx useMemo**

Read `MarkdownPreview.tsx`. Find the `useMemo` pipeline. The current order is:
1. `sanitized` = processor.processSync(content)
2. `withLinks` = postprocessWikiLinks(sanitized, files)
3. `withCallouts` = processCallouts(withLinks)
4. `withIds` = addHeadingIds(withCallouts)

Add `processHighlights` after `processCallouts`:

```typescript
import { flattenVaultFiles, postprocessWikiLinks, processCallouts, processHighlights } from './markdownUtils'
```

And update the useMemo:

```typescript
const sanitized = String(processor.processSync(content))
const withLinks = postprocessWikiLinks(sanitized, files)
const withCallouts = processCallouts(withLinks)
const withHighlights = processHighlights(withCallouts)
const withIds = addHeadingIds(withHighlights)
```

- [ ] **Step 5: Run tests and typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
npm run typecheck 2>&1 | tail -10
npm run test -- tests/renderer/markdownUtils.test.ts 2>&1 | tail -15
```

Expected: 0 TypeScript errors, all highlight tests pass.

- [ ] **Step 6: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
git add src/renderer/src/components/Editor/markdownUtils.ts \
        src/renderer/src/components/Editor/MarkdownPreview.tsx \
        tests/renderer/markdownUtils.test.ts
git commit -m "feat: render ==highlighted text== as <mark> in preview"
```

---

## Task 4: Frontmatter Tags in Tags Panel

**Context:** `linkParser.ts` extracts tags using `#tag` regex. YAML frontmatter `tags: [work, ideas]` or the list format is ignored. The Tags Panel uses `linkIndex.getAllTags()` which is built from what `linkParser.ts` returns. Fix: update `parseLinks` to also extract frontmatter tags before scanning inline text.

**Files:**
- Modify: `src/renderer/src/lib/linkParser.ts`
- Modify: `tests/renderer/linkParser.test.ts` (create if missing)

- [ ] **Step 1: Write the test**

Check if `tests/renderer/linkParser.test.ts` exists. If not, create it:

```typescript
import { describe, it, expect } from 'vitest'
import { parseLinks } from '../../src/renderer/src/lib/linkParser'

describe('parseLinks', () => {
  it('extracts inline #tags', () => {
    const { tags } = parseLinks('Hello #world and #foo')
    expect(tags).toContain('world')
    expect(tags).toContain('foo')
  })

  it('extracts tags from frontmatter array format: tags: [a, b, c]', () => {
    const content = '---\ntags: [work, ideas, todo]\n---\n\nContent'
    const { tags } = parseLinks(content)
    expect(tags).toContain('work')
    expect(tags).toContain('ideas')
    expect(tags).toContain('todo')
  })

  it('extracts tags from frontmatter list format', () => {
    const content = '---\ntags:\n  - work\n  - ideas\n---\n\nContent'
    const { tags } = parseLinks(content)
    expect(tags).toContain('work')
    expect(tags).toContain('ideas')
  })

  it('deduplicates tags from frontmatter and inline', () => {
    const content = '---\ntags: [work]\n---\n\nHello #work and #extra'
    const { tags } = parseLinks(content)
    const workCount = tags.filter(t => t === 'work').length
    expect(workCount).toBe(1)
    expect(tags).toContain('extra')
  })

  it('handles frontmatter with quoted tag values', () => {
    const content = '---\ntags: ["my-tag", \'another\']\n---'
    const { tags } = parseLinks(content)
    expect(tags).toContain('my-tag')
    expect(tags).toContain('another')
  })

  it('does not extract tags from frontmatter that is not tags field', () => {
    const content = '---\ntitle: Not a tag\ndate: 2026-01-01\n---\n\nContent'
    const { tags } = parseLinks(content)
    expect(tags).not.toContain('Not a tag')
  })

  it('extracts [[wiki links]] from content', () => {
    const { links } = parseLinks('See [[My Note]] for details')
    expect(links).toContain('My Note')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
npm run test -- tests/renderer/linkParser.test.ts 2>&1 | tail -15
```

Expected: FAIL on frontmatter tag tests (inline tags pass, frontmatter ones fail).

- [ ] **Step 3: Update linkParser.ts**

Replace the entire content of `src/renderer/src/lib/linkParser.ts`:

```typescript
export interface ParseResult {
  links: string[]
  tags: string[]
}

function extractFrontmatterTags(content: string): string[] {
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!fmMatch) return []

  const yaml = fmMatch[1]
  const tags: string[] = []

  // Format 1: tags: [a, b, c] or tags: ["a", 'b']
  const inlineMatch = yaml.match(/^tags:\s*\[([^\]]*)\]/m)
  if (inlineMatch) {
    for (const part of inlineMatch[1].split(',')) {
      const tag = part.trim().replace(/^["']|["']$/g, '')
      if (tag) tags.push(tag)
    }
    return tags
  }

  // Format 2: YAML list
  //   tags:
  //     - work
  //     - ideas
  const listMatch = yaml.match(/^tags:\s*\n((?:[ \t]*-[ \t]+.+\n?)+)/m)
  if (listMatch) {
    for (const match of listMatch[1].matchAll(/^[ \t]*-[ \t]+(.+)/gm)) {
      const tag = match[1].trim().replace(/^["']|["']$/g, '')
      if (tag) tags.push(tag)
    }
  }

  return tags
}

export function parseLinks(content: string): ParseResult {
  const linkSet = new Set<string>()
  const tagSet = new Set<string>()

  // Extract frontmatter tags first
  for (const tag of extractFrontmatterTags(content)) {
    tagSet.add(tag)
  }

  // Strip fenced code blocks before parsing inline content
  const stripped = content.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '')

  for (const match of stripped.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
    linkSet.add(match[1].trim())
  }

  for (const match of stripped.matchAll(/#([\w/-]+)/g)) {
    tagSet.add(match[1])
  }

  return { links: Array.from(linkSet), tags: Array.from(tagSet) }
}
```

- [ ] **Step 4: Run tests and typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
npm run typecheck 2>&1 | tail -10
npm run test -- tests/renderer/linkParser.test.ts 2>&1 | tail -15
```

Expected: 0 TypeScript errors, all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
git add src/renderer/src/lib/linkParser.ts tests/renderer/linkParser.test.ts
git commit -m "feat: extract frontmatter tags into Tags Panel"
```

---

## Task 5: Recent Files in Command Palette

**Context:** The command palette shows all files, newest first by default. When the query is empty it should show the 5 most recently opened files at the top with a "Recent" section header, making the most used notes instantly accessible.

**Files:**
- Modify: `src/renderer/src/App.tsx`
- Modify: `src/renderer/src/components/CommandPalette/CommandPalette.tsx`

- [ ] **Step 1: Add recentPaths state to App.tsx and track opens**

Read `App.tsx`. Find where `openFile` is used in the command palette's `onFileSelect` handler. The current code calls `openFile(path, name)` and `setPaletteOpen(false)`. Wrap this with recent tracking.

**1a.** Add state inside the `App` function component (after existing `useState` calls):

```typescript
const [recentPaths, setRecentPaths] = useState<string[]>([])
```

**1b.** Create a `handlePaletteFileSelect` callback that tracks recents:

```typescript
const handlePaletteFileSelect = useCallback(
  (path: string, name: string) => {
    openFile(path, name)
    setRecentPaths((prev) => [path, ...prev.filter((p) => p !== path)].slice(0, 8))
  },
  [openFile]
)
```

**1c.** Pass `recentPaths` to `CommandPalette` and use `handlePaletteFileSelect` instead of directly calling `openFile`.

Find the `<CommandPalette` JSX and update `onFileSelect`:
```tsx
<CommandPalette
  ...existing props...
  onFileSelect={handlePaletteFileSelect}
  recentPaths={recentPaths}
/>
```

- [ ] **Step 2: Update CommandPalette.tsx to accept and display recentPaths**

Read `CommandPalette.tsx`. Then:

**2a.** Add `recentPaths?: string[]` to `CommandPaletteProps`:

```typescript
interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  files: FileItem[]
  onFileSelect: (path: string, name: string) => void
  commands?: CommandItem[]
  recentPaths?: string[]
}
```

**2b.** Add the prop to the destructuring:

```typescript
export function CommandPalette({ isOpen, onClose, files, onFileSelect, commands = [], recentPaths = [] }: CommandPaletteProps) {
```

**2c.** Compute `recentFiles` alongside `filteredFiles`. In the `useMemo` that computes `filteredFiles`, update to:

```typescript
const recentFiles = useMemo(() => {
  if (isCommandMode || query.trim()) return []
  return recentPaths
    .map((path) => files.find((f) => f.path === path))
    .filter((f): f is FileItem => f !== undefined)
    .slice(0, 5)
}, [isCommandMode, query, recentPaths, files])

const filteredFiles = useMemo(() => {
  if (isCommandMode) return []
  if (!query.trim()) {
    // When no query, show all files excluding recent ones (they're shown above)
    const recentSet = new Set(recentPaths)
    return files.filter((f) => !recentSet.has(f.path)).slice(0, 8)
  }
  return files.filter((f) => f.name.toLowerCase().replace(/\.md$/, '').includes(cleanQuery)).slice(0, 10)
}, [isCommandMode, query, cleanQuery, files, recentPaths])
```

**2d.** Update the render to show recent files section when not in command mode and no query. Replace the file list render with:

```tsx
{items.length === 0 && recentFiles.length === 0 ? (
  <div style={{ padding: '12px 16px', color: '#555', fontSize: 13 }}>No results</div>
) : isCommandMode ? (
  filteredCommands.map((cmd, i) => (
    <div
      key={cmd.id}
      onClick={() => { cmd.onSelect(); onClose() }}
      style={{
        padding: '10px 16px', cursor: 'pointer', fontSize: 14,
        color: i === activeIndex ? '#fff' : '#aaa',
        background: i === activeIndex ? '#2a2a3a' : 'transparent',
        display: 'flex', alignItems: 'center', gap: 10
      }}
    >
      <span style={{ fontSize: 16 }}>{cmd.icon ?? '⚡'}</span>
      <span>{cmd.label}</span>
    </div>
  ))
) : (
  <>
    {recentFiles.length > 0 && !query.trim() && (
      <>
        <div style={{ padding: '6px 16px 2px', fontSize: 10, color: '#444', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Recent
        </div>
        {recentFiles.map((f, i) => (
          <div
            key={f.path}
            onClick={() => { onFileSelect(f.path, f.name); onClose() }}
            style={{
              padding: '8px 16px', cursor: 'pointer', fontSize: 14,
              color: i === activeIndex ? '#fff' : '#ccc',
              background: i === activeIndex ? '#2a2a3a' : 'transparent',
              display: 'flex', alignItems: 'center', gap: 10
            }}
          >
            <span style={{ fontSize: 12 }}>🕐</span>
            <span>{f.name.replace(/\.md$/, '')}</span>
          </div>
        ))}
        {filteredFiles.length > 0 && (
          <div style={{ padding: '6px 16px 2px', fontSize: 10, color: '#444', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            All Notes
          </div>
        )}
      </>
    )}
    {filteredFiles.map((f, i) => {
      const idx = recentFiles.length + i
      return (
        <div
          key={f.path}
          onClick={() => { onFileSelect(f.path, f.name); onClose() }}
          style={{
            padding: '10px 16px', cursor: 'pointer', fontSize: 14,
            color: idx === activeIndex ? '#fff' : '#aaa',
            background: idx === activeIndex ? '#2a2a3a' : 'transparent',
            display: 'flex', alignItems: 'center', gap: 10
          }}
        >
          <FileIcon size={14} color="#7c6af7" />
          <span>{f.name.replace(/\.md$/, '')}</span>
        </div>
      )
    })}
  </>
)}
```

**2e.** Update the `items` and keyboard navigation to account for both recent + filtered sections. Update `items` to be the combined list for arrow navigation:

```typescript
const items = isCommandMode
  ? filteredCommands
  : [...recentFiles, ...filteredFiles]
```

And update `handleKey` to use `items.length - 1` as the max index (already does this via `items.length - 1`, just ensure `items` is the combined list above).

- [ ] **Step 3: Run typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
npm run typecheck 2>&1 | tail -10
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
git add src/renderer/src/App.tsx \
        src/renderer/src/components/CommandPalette/CommandPalette.tsx
git commit -m "feat: show recently opened files in command palette"
```

---

## Self-Review

**Spec coverage:**
1. ✅ Task 1 — Note embeds `![[Note.md]]`
2. ✅ Task 2 — Mermaid diagrams
3. ✅ Task 3 — ==Highlighted text==
4. ✅ Task 4 — Frontmatter tags in Tags Panel
5. ✅ Task 5 — Recent files in command palette

**Placeholder scan:** No TBD items. All code blocks are complete and runnable.

**Type consistency:**
- `processHighlights` exported from `markdownUtils.ts`, imported in `MarkdownPreview.tsx` ✅
- `extractFrontmatterTags` is internal to `linkParser.ts` (not exported) ✅
- `recentPaths?: string[]` added to `CommandPaletteProps`, destructured with default `[]` ✅
- `recentFiles` computed in CommandPalette — uses `files.find(f => f.path === path)` which requires `FileItem` to have `path` field — confirmed ✅
- `handlePaletteFileSelect` in App.tsx — same signature as `onFileSelect: (path, name) => void` ✅

**Known gap:** Task 2 (Mermaid) has no unit tests because rendering requires a real DOM + mermaid library. The typecheck step verifies the import is valid. Manual verification needed in the running app.
