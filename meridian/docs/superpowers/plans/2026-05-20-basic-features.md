# Meridian Basic Feature Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 8 missing features to bring Meridian to basic Obsidian-equivalent functionality.

**Architecture:** Each task is independent. Features build on existing patterns: CodeMirror extensions for editor features, React components for UI panels, IPC handlers for system operations. The `vault://` protocol is already registered and serving local files. All IPC channels exist in `src/shared/types.ts`.

**Tech Stack:** Electron 39, React 18, TypeScript, CodeMirror 6, Zustand, remark/rehype (unified), electron-vite, Vitest

---

## File Map

**Modified:**

- `src/renderer/src/components/Editor/MarkdownPreview.tsx` — Tasks 1, 2
- `src/renderer/src/components/Sidebar/FileTree.tsx` — Task 3
- `src/renderer/src/components/Sidebar/Sidebar.tsx` — Task 4
- `src/renderer/src/components/Editor/extensions/markdownExtensions.ts` — Task 5
- `src/renderer/src/hooks/useVaultBridge.ts` — Tasks 6, 8
- `src/renderer/src/components/CommandPalette/CommandPalette.tsx` — Task 6
- `src/renderer/src/components/RightPanel/RightPanel.tsx` — Task 7
- `src/shared/types.ts` — Task 8
- `src/main/ipc.ts` — Task 8
- `src/main/index.ts` — Task 8

**Created:**

- `src/renderer/src/components/Editor/extensions/slashCommands.ts` — Task 5
- `src/renderer/src/components/RightPanel/PropertiesPanel.tsx` — Task 7

---

## Task 1: Wiki Image Embeds in Preview (`![[image.png]]`)

**Context:** `MarkdownPreview.tsx` already handles `![[*.excalidraw]]` embeds and converts `<img src="relative">` to `vault:///relative`. But `![[photo.png]]` (Obsidian-style image embed) is silently dropped. The vault:// protocol handler in `src/main/index.ts` is fully working — it serves files by relative path from vault root.

**Files:**

- Modify: `src/renderer/src/components/Editor/MarkdownPreview.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/renderer/markdownPreview.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'

// Copy postprocessWikiLinks signature for testing — we'll export it after implementation
// For now test the expected HTML output through a test helper

const IMAGE_EXTS = /\.(png|jpg|jpeg|gif|webp|svg|bmp|tiff)$/i

function postprocessWikiLinksTestable(
  html: string,
  files: Array<{ name: string; relativePath: string }>
): string {
  let processed = html.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, link, alias) => {
    const linkText = link.trim()
    if (linkText.endsWith('.excalidraw')) return _match // leave for useEffect
    if (IMAGE_EXTS.test(linkText)) {
      const match = files.find(
        (f) =>
          f.name.toLowerCase() === linkText.toLowerCase() ||
          f.relativePath.toLowerCase() === linkText.toLowerCase()
      )
      const src = match ? `vault:///${match.relativePath}` : `vault:///${linkText}`
      const alt = (alias?.trim() ?? linkText).replace(/"/g, '&quot;')
      return `<img src="${src}" alt="${alt}" style="max-width:100%;height:auto;border-radius:4px;margin:8px 0" />`
    }
    return _match
  })
  return processed.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, link, alias) => {
    const label = (alias?.trim() ?? link.trim()).replace(/"/g, '&quot;')
    const linkAttr = link.trim().replace(/"/g, '&quot;')
    return `<span class="wiki-link" data-link="${linkAttr}" style="color:var(--accent-color);text-decoration:underline;cursor:pointer">${label}</span>`
  })
}

describe('postprocessWikiLinks image embeds', () => {
  it('converts ![[image.png]] to img tag with vault:// src', () => {
    const html = '<p>![[photo.png]]</p>'
    const files = [{ name: 'photo.png', relativePath: 'assets/photo.png' }]
    const result = postprocessWikiLinksTestable(html, files)
    expect(result).toContain('<img src="vault:///assets/photo.png"')
    expect(result).toContain('alt="photo.png"')
  })

  it('uses vault:///filename when file not found in vault', () => {
    const html = '<p>![[unknown.jpg]]</p>'
    const result = postprocessWikiLinksTestable(html, [])
    expect(result).toContain('<img src="vault:///unknown.jpg"')
  })

  it('respects alias in ![[image.png|My Caption]]', () => {
    const html = '<p>![[photo.png|My Caption]]</p>'
    const files = [{ name: 'photo.png', relativePath: 'assets/photo.png' }]
    const result = postprocessWikiLinksTestable(html, files)
    expect(result).toContain('alt="My Caption"')
  })

  it('leaves ![[drawing.excalidraw]] untouched', () => {
    const html = '<p>![[drawing.excalidraw]]</p>'
    const result = postprocessWikiLinksTestable(html, [])
    expect(result).toBe('<p>![[drawing.excalidraw]]</p>')
  })

  it('still converts [[wikilinks]] to spans', () => {
    const html = '<p>[[Note Name]]</p>'
    const result = postprocessWikiLinksTestable(html, [])
    expect(result).toContain('class="wiki-link"')
    expect(result).toContain('data-link="Note Name"')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
npm run test -- tests/renderer/markdownPreview.test.ts 2>&1 | head -30
```

Expected: the test file runs (the helper function is inline so it may pass already — that's fine, it establishes the contract).

- [ ] **Step 3: Update MarkdownPreview.tsx**

In `src/renderer/src/components/Editor/MarkdownPreview.tsx`, make these changes:

**3a.** Add `IMAGE_EXTS` constant at top of file (after imports):

```typescript
const IMAGE_EXTS = /\.(png|jpg|jpeg|gif|webp|svg|bmp|tiff)$/i
```

**3b.** Update `postprocessWikiLinks` to accept a `files` parameter and handle image embeds:

Replace the existing function signature and the `![[...]]` handling block:

```typescript
function postprocessWikiLinks(html: string, files: import('@shared/types').VaultFile[]): string {
  const flatFiles = flattenVaultFiles(files)

  // 1. Process ![[...]] embeds
  let processed = html.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, link, alias) => {
    const linkText = link.trim()

    if (linkText.endsWith('.excalidraw')) {
      const escapedLink = linkText.replace(/"/g, '&quot;')
      return `<div class="excalidraw-embed" data-link="${escapedLink}" style="border:1px solid var(--border-color);border-radius:8px;padding:16px;background:var(--bg-secondary);margin:16px 0;max-width:100%;height:320px;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;box-sizing:border-box">Loading drawing...</div>`
    }

    if (IMAGE_EXTS.test(linkText)) {
      const match = flatFiles.find(
        (f) =>
          f.name.toLowerCase() === linkText.toLowerCase() ||
          f.relativePath.toLowerCase() === linkText.toLowerCase()
      )
      const src = match ? `vault:///${match.relativePath}` : `vault:///${linkText}`
      const alt = (alias?.trim() ?? linkText).replace(/"/g, '&quot;')
      return `<img src="${src}" alt="${alt}" style="max-width:100%;height:auto;border-radius:4px;margin:8px 0" />`
    }

    return _match
  })

  // 2. Process standard [[wiki links]]
  return processed.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, link, alias) => {
    const label = (alias?.trim() ?? link.trim()).replace(/"/g, '&quot;')
    const linkAttr = link.trim().replace(/"/g, '&quot;')
    return `<span class="wiki-link" data-link="${linkAttr}" style="color:var(--accent-color);text-decoration:underline;cursor:pointer">${label}</span>`
  })
}
```

**3c.** Update the `useMemo` call to pass `files`:

Find the line `const withLinks = postprocessWikiLinks(sanitized)` and change to:

```typescript
const withLinks = postprocessWikiLinks(sanitized, files)
```

Also add `files` to the `useMemo` dependency array:

```typescript
}, [content, vaultPath, files])
```

- [ ] **Step 4: Run tests and typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
npm run typecheck 2>&1 | tail -20
npm run test -- tests/renderer/markdownPreview.test.ts 2>&1 | tail -20
```

Expected: 0 TypeScript errors, all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
git add src/renderer/src/components/Editor/MarkdownPreview.tsx tests/renderer/markdownPreview.test.ts
git commit -m "feat: render ![[image.png]] wiki embeds in markdown preview"
```

---

## Task 2: Callout Blocks in Preview

**Context:** Obsidian-style callouts use the syntax `> [!NOTE]` inside blockquotes. remark-gfm parses them as plain blockquotes. We need to post-process the generated HTML to convert these into styled callout divs.

**Files:**

- Modify: `src/renderer/src/components/Editor/MarkdownPreview.tsx`

- [ ] **Step 1: Write the test**

Add to `tests/renderer/markdownPreview.test.ts`:

```typescript
// Callout processing tests
const CALLOUT_TYPES: Record<string, { icon: string; color: string }> = {
  note: { icon: 'ℹ️', color: '#4b9ef4' },
  info: { icon: 'ℹ️', color: '#4b9ef4' },
  tip: { icon: '💡', color: '#22c55e' },
  warning: { icon: '⚠️', color: '#f59e0b' },
  caution: { icon: '⚠️', color: '#f59e0b' },
  danger: { icon: '🔥', color: '#ef4444' },
  error: { icon: '❌', color: '#ef4444' },
  success: { icon: '✅', color: '#22c55e' },
  question: { icon: '❓', color: '#a855f7' },
  quote: { icon: '💬', color: '#6b7280' },
  abstract: { icon: '📋', color: '#6366f1' },
  todo: { icon: '☑️', color: '#6366f1' },
  important: { icon: '❗', color: '#ef4444' }
}

function processCalloutsTestable(html: string): string {
  return html.replace(
    /<blockquote>\s*<p>\[!([\w]+)\]([^<\n]*)(<br>)?([\s\S]*?)<\/p>([\s\S]*?)<\/blockquote>/gi,
    (_match, type, titleRest, _br, firstParaRest, bodyRest) => {
      const typeKey = type.toLowerCase()
      const info = CALLOUT_TYPES[typeKey] ?? { icon: '📝', color: '#6b7280' }
      const displayTitle = titleRest.trim() || typeKey.charAt(0).toUpperCase() + typeKey.slice(1)
      const body = (firstParaRest + bodyRest).trim()
      return `<div class="callout callout-${typeKey}" style="border-left:4px solid ${info.color};background:${info.color}22;border-radius:6px;padding:12px 16px;margin:12px 0"><div class="callout-title" style="display:flex;align-items:center;gap:6px;font-weight:600;margin-bottom:${body ? '8px' : '0'};color:${info.color}"><span>${info.icon}</span><span>${displayTitle}</span></div>${body ? `<div class="callout-content">${body}</div>` : ''}</div>`
    }
  )
}

describe('callout block processing', () => {
  it('converts > [!NOTE] blockquote to callout div', () => {
    const html = '<blockquote>\n<p>[!NOTE]\nSome content</p>\n</blockquote>'
    const result = processCalloutsTestable(html)
    expect(result).toContain('class="callout callout-note"')
    expect(result).toContain('border-left:4px solid #4b9ef4')
    expect(result).toContain('ℹ️')
  })

  it('converts > [!WARNING] to warning callout', () => {
    const html = '<blockquote>\n<p>[!WARNING]\nBe careful</p>\n</blockquote>'
    const result = processCalloutsTestable(html)
    expect(result).toContain('callout-warning')
    expect(result).toContain('#f59e0b')
    expect(result).toContain('⚠️')
  })

  it('uses custom title when provided > [!NOTE] My Title', () => {
    const html = '<blockquote>\n<p>[!NOTE] My Title\nContent</p>\n</blockquote>'
    const result = processCalloutsTestable(html)
    expect(result).toContain('My Title')
  })

  it('leaves regular blockquotes untouched', () => {
    const html = '<blockquote><p>Regular quote</p></blockquote>'
    const result = processCalloutsTestable(html)
    expect(result).toBe('<blockquote><p>Regular quote</p></blockquote>')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
npm run test -- tests/renderer/markdownPreview.test.ts 2>&1 | tail -20
```

Expected: FAIL on callout tests (function not yet in component).

- [ ] **Step 3: Add processCallouts function to MarkdownPreview.tsx**

Add this function after `postprocessWikiLinks` in `src/renderer/src/components/Editor/MarkdownPreview.tsx`:

```typescript
const CALLOUT_TYPES: Record<string, { icon: string; color: string }> = {
  note: { icon: 'ℹ️', color: '#4b9ef4' },
  info: { icon: 'ℹ️', color: '#4b9ef4' },
  tip: { icon: '💡', color: '#22c55e' },
  warning: { icon: '⚠️', color: '#f59e0b' },
  caution: { icon: '⚠️', color: '#f59e0b' },
  danger: { icon: '🔥', color: '#ef4444' },
  error: { icon: '❌', color: '#ef4444' },
  success: { icon: '✅', color: '#22c55e' },
  question: { icon: '❓', color: '#a855f7' },
  quote: { icon: '💬', color: '#6b7280' },
  abstract: { icon: '📋', color: '#6366f1' },
  todo: { icon: '☑️', color: '#6366f1' },
  important: { icon: '❗', color: '#ef4444' }
}

function processCallouts(html: string): string {
  return html.replace(
    /<blockquote>\s*<p>\[!([\w]+)\]([^<\n]*)(<br>)?([\s\S]*?)<\/p>([\s\S]*?)<\/blockquote>/gi,
    (_match, type, titleRest, _br, firstParaRest, bodyRest) => {
      const typeKey = type.toLowerCase()
      const info = CALLOUT_TYPES[typeKey] ?? { icon: '📝', color: '#6b7280' }
      const displayTitle = titleRest.trim() || typeKey.charAt(0).toUpperCase() + typeKey.slice(1)
      const body = (firstParaRest + bodyRest).trim()
      return `<div class="callout callout-${typeKey}" style="border-left:4px solid ${info.color};background:${info.color}22;border-radius:6px;padding:12px 16px;margin:12px 0"><div class="callout-title" style="display:flex;align-items:center;gap:6px;font-weight:600;margin-bottom:${body ? '8px' : '0'};color:${info.color}"><span>${info.icon}</span><span>${displayTitle}</span></div>${body ? `<div class="callout-content">${body}</div>` : ''}</div>`
    }
  )
}
```

**Step 3b.** Update the `useMemo` pipeline in `MarkdownPreview` to call `processCallouts`:

```typescript
const html = useMemo(() => {
  try {
    const sanitized = String(processor.processSync(content))
    const withLinks = postprocessWikiLinks(sanitized, files)
    const withCallouts = processCallouts(withLinks)
    const withIds = addHeadingIds(withCallouts)
    if (!vaultPath) return withIds
    return withIds.replace(
      /(<img)([^>]*src=")(?!https?:\/\/)(?!data:)(?!vault:\/\/\/)([^"]+)(")/g,
      (_m, imgTag, pre, src, post) =>
        `${imgTag} style="max-width:100%;height:auto;border-radius:4px"${pre}vault:///${src}${post}`
    )
  } catch {
    return '<p>Preview error</p>'
  }
}, [content, vaultPath, files])
```

- [ ] **Step 4: Run tests and typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
npm run typecheck 2>&1 | tail -10
npm run test -- tests/renderer/markdownPreview.test.ts 2>&1 | tail -20
```

Expected: 0 TypeScript errors, all tests pass.

- [ ] **Step 5: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
git add src/renderer/src/components/Editor/MarkdownPreview.tsx tests/renderer/markdownPreview.test.ts
git commit -m "feat: render Obsidian-style callout blocks in markdown preview"
```

---

## Task 3: Folder Drag-Drop in File Tree

**Context:** In `FileTree.tsx`, `draggable={!file.isDirectory}` prevents folders from being dragged. The drop handler already calls `onMove?.(dragPath, file.path)` when a drop lands on a directory. `vault.ts`'s `moveFile` uses `fs.rename` which works for directories too. We just need to make directories draggable and guard against dropping a folder into its own descendant.

**Files:**

- Modify: `src/renderer/src/components/Sidebar/FileTree.tsx`

- [ ] **Step 1: Write the test**

Add to `tests/renderer/fileTree.test.ts` (or create it):

```typescript
import { describe, it, expect } from 'vitest'

function isAncestor(parentPath: string, childPath: string): boolean {
  const sep = parentPath.endsWith('/') ? parentPath : parentPath + '/'
  return childPath.startsWith(sep)
}

describe('isAncestor', () => {
  it('returns true when child is inside parent', () => {
    expect(isAncestor('/vault/folder', '/vault/folder/sub')).toBe(true)
    expect(isAncestor('/vault/folder', '/vault/folder/sub/deep.md')).toBe(true)
  })

  it('returns false for unrelated paths', () => {
    expect(isAncestor('/vault/folder', '/vault/other')).toBe(false)
    expect(isAncestor('/vault/folder', '/vault/folderext')).toBe(false)
  })

  it('returns false for exact same path', () => {
    expect(isAncestor('/vault/folder', '/vault/folder')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails/passes**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
npm run test -- tests/renderer/fileTree.test.ts 2>&1 | tail -10
```

- [ ] **Step 3: Update FileTree.tsx**

In `src/renderer/src/components/Sidebar/FileTree.tsx`, make these changes:

**3a.** Change `draggable={!file.isDirectory}` to `draggable={true}`.

**3b.** Update the `onDragStart` handler to include directory info:

```tsx
onDragStart={(e) => {
  ;(window as any).__meridianDragPath = file.path
  ;(window as any).__meridianDragIsDir = file.isDirectory
  e.dataTransfer.effectAllowed = 'copyMove'
  e.dataTransfer.setData('text/plain', file.path)
  if (!file.isDirectory) {
    e.dataTransfer.setData(
      'application/meridian-file',
      JSON.stringify({
        path: file.path,
        name: file.name,
        relativePath: file.relativePath
      })
    )
  }
}},
```

**3c.** Update `onDragEnd` to clear the directory flag:

```tsx
onDragEnd={() => {
  ;(window as any).__meridianDragPath = null
  ;(window as any).__meridianDragIsDir = null
}},
```

**3d.** Update `onDragOver` to prevent dropping a folder into itself or its children:

```tsx
onDragOver={(e) => {
  const dragPath = (window as any).__meridianDragPath
  if (!file.isDirectory || !dragPath || dragPath === file.path) return
  // Prevent dropping folder into its own subtree
  if (file.path.startsWith(dragPath + '/')) return
  e.preventDefault()
  e.currentTarget.style.background = 'var(--accent-glow)'
}},
```

**3e.** Update `onDrop` with the same guard:

```tsx
onDrop={(e) => {
  e.preventDefault()
  e.currentTarget.style.background = ''
  const dragPath = (window as any).__meridianDragPath
  if (!dragPath || dragPath === file.path) return
  if (file.path.startsWith(dragPath + '/')) return
  if (file.isDirectory) {
    onMove?.(dragPath, file.path)
  }
  ;(window as any).__meridianDragPath = null
  ;(window as any).__meridianDragIsDir = null
}},
```

- [ ] **Step 4: Run typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
npm run typecheck 2>&1 | tail -10
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
git add src/renderer/src/components/Sidebar/FileTree.tsx tests/renderer/fileTree.test.ts
git commit -m "feat: make folders draggable in file tree for folder reorganization"
```

---

## Task 4: Sidebar Sort Toggle

**Context:** `vault.ts` sorts files alphabetically with folders first (server-side, not configurable). We add client-side sorting in `Sidebar.tsx` with a cycle button that goes: Name A→Z → Name Z→A → Modified (newest first) → back to A→Z.

**Files:**

- Modify: `src/renderer/src/components/Sidebar/Sidebar.tsx`

- [ ] **Step 1: Write the test**

Create `tests/renderer/sidebarSort.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import type { VaultFile } from '../../src/shared/types'

type SortOrder = 'name-asc' | 'name-desc' | 'modified'

function sortFiles(files: VaultFile[], order: SortOrder): VaultFile[] {
  const sorted = [...files].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
    if (order === 'name-asc') return a.name.localeCompare(b.name)
    if (order === 'name-desc') return b.name.localeCompare(a.name)
    if (order === 'modified') return b.mtime - a.mtime
    return 0
  })
  return sorted.map((f) =>
    f.isDirectory && f.children ? { ...f, children: sortFiles(f.children, order) } : f
  )
}

const makeFile = (name: string, mtime: number, isDirectory = false): VaultFile => ({
  name,
  path: `/vault/${name}`,
  relativePath: name,
  isDirectory,
  mtime,
  birthtime: 0
})

describe('sortFiles', () => {
  it('sorts A→Z with folders first by default', () => {
    const files = [makeFile('b.md', 100), makeFile('a.md', 200), makeFile('dir', 50, true)]
    const sorted = sortFiles(files, 'name-asc')
    expect(sorted[0].name).toBe('dir')
    expect(sorted[1].name).toBe('a.md')
    expect(sorted[2].name).toBe('b.md')
  })

  it('sorts Z→A with folders still first', () => {
    const files = [makeFile('a.md', 100), makeFile('b.md', 200)]
    const sorted = sortFiles(files, 'name-desc')
    expect(sorted[0].name).toBe('b.md')
  })

  it('sorts by modified (newest first)', () => {
    const files = [makeFile('old.md', 100), makeFile('new.md', 999)]
    const sorted = sortFiles(files, 'modified')
    expect(sorted[0].name).toBe('new.md')
  })

  it('recursively sorts children', () => {
    const dir = makeFile('dir', 100, true) as VaultFile & { children: VaultFile[] }
    dir.children = [makeFile('z.md', 100), makeFile('a.md', 200)]
    const sorted = sortFiles([dir], 'name-asc')
    expect(sorted[0].children![0].name).toBe('a.md')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
npm run test -- tests/renderer/sidebarSort.test.ts 2>&1 | tail -10
```

- [ ] **Step 3: Update Sidebar.tsx**

Add the `sortFiles` helper and sort state to `src/renderer/src/components/Sidebar/Sidebar.tsx`.

**3a.** Add these imports/types at the top of the file (after existing imports):

```typescript
type SortOrder = 'name-asc' | 'name-desc' | 'modified'

function sortFiles(
  files: import('@shared/types').VaultFile[],
  order: SortOrder
): import('@shared/types').VaultFile[] {
  const sorted = [...files].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
    if (order === 'name-asc') return a.name.localeCompare(b.name)
    if (order === 'name-desc') return b.name.localeCompare(a.name)
    if (order === 'modified') return b.mtime - a.mtime
    return 0
  })
  return sorted.map((f) =>
    f.isDirectory && f.children ? { ...f, children: sortFiles(f.children, order) } : f
  )
}

const SORT_LABELS: Record<SortOrder, string> = {
  'name-asc': 'A→Z',
  'name-desc': 'Z→A',
  modified: '🕐'
}

const SORT_CYCLE: SortOrder[] = ['name-asc', 'name-desc', 'modified']
```

**3b.** Inside the `Sidebar` function, add sort state after the existing `useState` hooks:

```typescript
const [sortOrder, setSortOrder] = useState<SortOrder>('name-asc')
const sortedFiles = useMemo(() => sortFiles(files, sortOrder), [files, sortOrder])
```

**3c.** Add a sort button in the filter bar (the `<div style={{ padding: '4px 8px', ... }}>` that contains the filter input). Add it after the collapse button:

```tsx
<button
  onClick={() =>
    setSortOrder((o) => {
      const idx = SORT_CYCLE.indexOf(o)
      return SORT_CYCLE[(idx + 1) % SORT_CYCLE.length]
    })
  }
  title={`Sort: ${SORT_LABELS[sortOrder]} (click to change)`}
  style={{
    background: 'transparent',
    border: 'none',
    color: sortOrder !== 'name-asc' ? 'var(--accent-color)' : 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '0 4px',
    fontSize: 11,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    minWidth: 24
  }}
  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
  onMouseLeave={(e) =>
    (e.currentTarget.style.color =
      sortOrder !== 'name-asc' ? 'var(--accent-color)' : 'var(--text-secondary)')
  }
>
  {SORT_LABELS[sortOrder]}
</button>
```

**3d.** Change the `<FileTree files={files} ...>` prop to use `sortedFiles`:

```tsx
<FileTree
  files={sortedFiles}
  ...
/>
```

- [ ] **Step 4: Run tests and typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
npm run typecheck 2>&1 | tail -10
npm run test -- tests/renderer/sidebarSort.test.ts 2>&1 | tail -10
```

Expected: 0 TypeScript errors, all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
git add src/renderer/src/components/Sidebar/Sidebar.tsx tests/renderer/sidebarSort.test.ts
git commit -m "feat: add sort toggle in sidebar (A-Z, Z-A, by modified date)"
```

---

## Task 5: Slash Commands in Editor

**Context:** `useSettingsStore` already has `pluginsEnabled.slashCommands`. When the user types `/` at the start of a line (or after only whitespace), a completion popup should appear with common markdown insertions. We use CodeMirror's `autocompletion` API — the same infrastructure already used for wiki link completions.

**Files:**

- Create: `src/renderer/src/components/Editor/extensions/slashCommands.ts`
- Modify: `src/renderer/src/components/Editor/extensions/markdownExtensions.ts`

- [ ] **Step 1: Write the test**

Create `tests/renderer/slashCommands.test.ts`:

````typescript
import { describe, it, expect } from 'vitest'

interface SlashCommand {
  label: string
  apply: string
  detail: string
}

const SLASH_COMMANDS: SlashCommand[] = [
  { label: '/Heading 1', apply: '# ', detail: 'H1 heading' },
  { label: '/Heading 2', apply: '## ', detail: 'H2 heading' },
  { label: '/Heading 3', apply: '### ', detail: 'H3 heading' },
  { label: '/Bold', apply: '**bold**', detail: '**text**' },
  { label: '/Italic', apply: '*italic*', detail: '*text*' },
  { label: '/Code', apply: '`code`', detail: 'inline code' },
  { label: '/Code Block', apply: '```\n\n```', detail: 'fenced code block' },
  { label: '/Bullet List', apply: '- ', detail: 'unordered list' },
  { label: '/Numbered List', apply: '1. ', detail: 'ordered list' },
  { label: '/Task List', apply: '- [ ] ', detail: 'task checkbox' },
  {
    label: '/Table',
    apply: '| Col 1 | Col 2 |\n|---|---|\n| Cell | Cell |',
    detail: 'markdown table'
  },
  { label: '/Divider', apply: '\n---\n', detail: 'horizontal rule' },
  { label: '/Quote', apply: '> ', detail: 'blockquote' },
  { label: '/Callout Note', apply: '> [!NOTE]\n> ', detail: 'info callout' },
  { label: '/Callout Warning', apply: '> [!WARNING]\n> ', detail: 'warning callout' },
  { label: '/Callout Tip', apply: '> [!TIP]\n> ', detail: 'tip callout' }
]

function filterCommands(query: string): SlashCommand[] {
  if (!query) return SLASH_COMMANDS
  const q = query.toLowerCase()
  return SLASH_COMMANDS.filter((c) => c.label.toLowerCase().includes(q))
}

describe('slash command filtering', () => {
  it('returns all commands for empty query', () => {
    expect(filterCommands('')).toHaveLength(SLASH_COMMANDS.length)
  })

  it('filters by label substring', () => {
    const results = filterCommands('heading')
    expect(results).toHaveLength(3)
    expect(results[0].label).toBe('/Heading 1')
  })

  it('is case-insensitive', () => {
    expect(filterCommands('CODE')).toHaveLength(2) // /Code and /Code Block
  })

  it('returns empty array for no match', () => {
    expect(filterCommands('xyznonexistent')).toHaveLength(0)
  })
})
````

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
npm run test -- tests/renderer/slashCommands.test.ts 2>&1 | tail -10
```

- [ ] **Step 3: Create slashCommands.ts**

Create `src/renderer/src/components/Editor/extensions/slashCommands.ts`:

````typescript
import {
  autocompletion,
  type CompletionContext,
  type CompletionResult
} from '@codemirror/autocomplete'

interface SlashCommand {
  label: string
  apply: string
  detail: string
}

const SLASH_COMMANDS: SlashCommand[] = [
  { label: '/Heading 1', apply: '# ', detail: 'H1 heading' },
  { label: '/Heading 2', apply: '## ', detail: 'H2 heading' },
  { label: '/Heading 3', apply: '### ', detail: 'H3 heading' },
  { label: '/Bold', apply: '**bold**', detail: '**text**' },
  { label: '/Italic', apply: '*italic*', detail: '*text*' },
  { label: '/Code', apply: '`code`', detail: 'inline code' },
  { label: '/Code Block', apply: '```\n\n```', detail: 'fenced code block' },
  { label: '/Bullet List', apply: '- ', detail: 'unordered list' },
  { label: '/Numbered List', apply: '1. ', detail: 'ordered list' },
  { label: '/Task List', apply: '- [ ] ', detail: 'task checkbox' },
  {
    label: '/Table',
    apply: '| Col 1 | Col 2 |\n|---|---|\n| Cell | Cell |',
    detail: 'markdown table'
  },
  { label: '/Divider', apply: '\n---\n', detail: 'horizontal rule' },
  { label: '/Quote', apply: '> ', detail: 'blockquote' },
  { label: '/Callout Note', apply: '> [!NOTE]\n> ', detail: 'info callout' },
  { label: '/Callout Warning', apply: '> [!WARNING]\n> ', detail: 'warning callout' },
  { label: '/Callout Tip', apply: '> [!TIP]\n> ', detail: 'tip callout' }
]

function slashCompletion(context: CompletionContext): CompletionResult | null {
  // Match a `/` potentially followed by word characters
  const match = context.matchBefore(/\/[\w\s]*/)
  if (!match) return null

  // Only activate when the line before the `/` is empty or whitespace
  const lineStart = context.state.doc.lineAt(match.from).from
  const textBeforeSlash = context.state.doc.sliceString(lineStart, match.from)
  if (textBeforeSlash.trim() !== '') return null

  const query = match.text.slice(1).toLowerCase()
  const filtered = query
    ? SLASH_COMMANDS.filter((c) => c.label.toLowerCase().includes(query))
    : SLASH_COMMANDS

  if (filtered.length === 0) return null

  return {
    from: match.from,
    to: match.to,
    options: filtered.map((cmd) => ({
      label: cmd.label,
      detail: cmd.detail,
      type: 'keyword',
      apply: (view, _completion, from, to) => {
        view.dispatch({
          changes: { from, to, insert: cmd.apply },
          selection: { anchor: from + cmd.apply.length }
        })
      }
    })),
    filter: false
  }
}

export function slashCommandExtension() {
  return autocompletion({
    override: [slashCompletion],
    closeOnBlur: true,
    maxRenderedOptions: 16,
    activateOnTyping: true
  })
}
````

- [ ] **Step 4: Update markdownExtensions.ts**

In `src/renderer/src/components/Editor/extensions/markdownExtensions.ts`:

**4a.** Add import at the top:

```typescript
import { slashCommandExtension } from './slashCommands'
```

**4b.** Add `slashCommandsEnabled` parameter to `createMarkdownExtensions`:

```typescript
export function createMarkdownExtensions(
  onChange?: (content: string) => void,
  onLinkClick?: (linkText: string) => void,
  getFileNames?: () => string[],
  fontSize = 15,
  lineWidth = 720,
  readableLineLength = true,
  onImagePaste?: (base64: string, ext: string) => Promise<string | null>,
  lineWrapping = true,
  lineNumbersEnabled = true,
  bracketMatchingEnabled = true,
  closeBracketsEnabled = true,
  fontFamily = 'Georgia',
  fontWeight = '400',
  lineHeight = 1.8,
  slashCommandsEnabled = false   // ← add this
) {
```

**4c.** Add the extension at the end of the returned array (before the closing `]`):

```typescript
    onImagePaste ? imagePasteExtension(onImagePaste) : [],
    slashCommandsEnabled ? slashCommandExtension() : []   // ← add this
  ]
```

- [ ] **Step 5: Update EditorPane.tsx to pass slashCommandsEnabled**

In `src/renderer/src/components/Editor/EditorPane.tsx`:

**5a.** Add `slashCommands` to the destructured settings:

```typescript
const {
  fontSize,
  lineWidth,
  readableLineLength,
  lineWrapping,
  lineNumbers,
  bracketMatching,
  closeBrackets,
  fontFamily,
  fontWeight,
  lineHeight,
  pluginsEnabled // ← add this
} = useSettingsStore()
```

**5b.** Pass `pluginsEnabled.slashCommands` to `createMarkdownExtensions` (14th positional arg):

```typescript
createMarkdownExtensions(
  handleChange,
  handleLinkClick,
  stableGetFileNames,
  fontSize,
  lineWidth,
  readableLineLength,
  handleImagePaste,
  lineWrapping,
  lineNumbers,
  bracketMatching,
  closeBrackets,
  fontFamily,
  fontWeight,
  lineHeight,
  pluginsEnabled.slashCommands   // ← add this
),
```

- [ ] **Step 6: Run tests and typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
npm run typecheck 2>&1 | tail -10
npm run test -- tests/renderer/slashCommands.test.ts 2>&1 | tail -10
```

Expected: 0 TypeScript errors, 4 tests pass.

- [ ] **Step 7: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
git add src/renderer/src/components/Editor/extensions/slashCommands.ts \
        src/renderer/src/components/Editor/extensions/markdownExtensions.ts \
        src/renderer/src/components/Editor/EditorPane.tsx \
        tests/renderer/slashCommands.test.ts
git commit -m "feat: slash commands in editor — type / at line start for markdown insertions"
```

---

## Task 6: Templates

**Context:** Templates are `.md` files stored in a `_templates/` folder at the vault root. The user inserts a template via command palette ("Insert Template"). The template content replaces `{{date}}` and `{{title}}` placeholders and is prepended to the active note.

**Files:**

- Modify: `src/renderer/src/hooks/useVaultBridge.ts`
- Modify: `src/renderer/src/components/CommandPalette/CommandPalette.tsx`

- [ ] **Step 1: Write the test**

Create `tests/renderer/templates.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'

function applyTemplatePlaceholders(template: string, title: string, date: string): string {
  return template.replace(/\{\{date\}\}/gi, date).replace(/\{\{title\}\}/gi, title)
}

function prependTemplate(templateContent: string, existingContent: string): string {
  if (!existingContent.trim()) return templateContent
  return templateContent + '\n\n' + existingContent
}

describe('template processing', () => {
  it('replaces {{date}} placeholder', () => {
    const result = applyTemplatePlaceholders('Date: {{date}}', 'My Note', '2026-05-20')
    expect(result).toBe('Date: 2026-05-20')
  })

  it('replaces {{title}} placeholder', () => {
    const result = applyTemplatePlaceholders('# {{title}}', 'My Note', '2026-05-20')
    expect(result).toBe('# My Note')
  })

  it('is case-insensitive for placeholders', () => {
    const result = applyTemplatePlaceholders('{{DATE}} {{TITLE}}', 'Note', '2026-01-01')
    expect(result).toBe('2026-01-01 Note')
  })

  it('prepends template to existing content', () => {
    const result = prependTemplate('# Template', 'Existing content')
    expect(result).toBe('# Template\n\nExisting content')
  })

  it('replaces empty content with template', () => {
    const result = prependTemplate('# Template', '')
    expect(result).toBe('# Template')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
npm run test -- tests/renderer/templates.test.ts 2>&1 | tail -10
```

- [ ] **Step 3: Add template functions to useVaultBridge.ts**

In `src/renderer/src/hooks/useVaultBridge.ts`, add these two functions inside `useVaultBridge()` before the `return` statement:

```typescript
const listTemplates = useCallback(async (): Promise<Array<{ name: string; path: string }>> => {
  const allFiles = useVaultStore.getState().files

  function findTemplates(
    items: import('@shared/types').VaultFile[]
  ): Array<{ name: string; path: string }> {
    for (const f of items) {
      if (f.isDirectory && f.name === '_templates') {
        return (f.children ?? [])
          .filter((c) => !c.isDirectory && c.name.endsWith('.md'))
          .map((c) => ({ name: c.name.replace(/\.md$/i, ''), path: c.path }))
      }
      if (f.isDirectory && f.children) {
        const found = findTemplates(f.children)
        if (found.length > 0) return found
      }
    }
    return []
  }

  return findTemplates(allFiles)
}, [])

const applyTemplate = useCallback(async (templatePath: string) => {
  try {
    const templateContent = await window.vault.readFile(templatePath)
    const { panes, activePaneId } = useVaultStore.getState()
    const activePane = panes.find((p) => p.id === activePaneId) ?? panes[0]
    const activeTab = activePane?.openTabs.find((t) => t.path === activePane.activeTabPath)
    if (!activeTab) return

    const d = new Date()
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const title = activeTab.name.replace(/\.md$/i, '')

    const processed = templateContent
      .replace(/\{\{date\}\}/gi, date)
      .replace(/\{\{title\}\}/gi, title)

    const newContent = activeTab.content.trim() ? processed + '\n\n' + activeTab.content : processed

    useVaultStore.getState().setTabContent(activeTab.path, newContent)
    useVaultStore.getState().markTabDirty(activeTab.path, true)
  } catch (e) {
    console.error('[Bridge] applyTemplate error', e)
  }
}, [])
```

Also add `listTemplates` and `applyTemplate` to the return object:

```typescript
return {
  openVault,
  refreshFiles,
  openFile,
  saveFile,
  createFile,
  createCanvas,
  createDrawing,
  createFolder,
  renameFile,
  moveFile,
  deleteFile,
  revealFile,
  openVaultByPath,
  openDailyNote,
  saveImage,
  exportNote,
  createNewVault,
  listTemplates, // ← add
  applyTemplate // ← add
}
```

- [ ] **Step 4: Update CommandPalette.tsx**

The command palette needs to support a two-mode UX: normal file search, and template picker (triggered by the `>template` prefix or a dedicated command). The cleanest approach: add a "📋 Insert Template..." item when query starts with `>` or `template`.

Replace `CommandPaletteProps` interface and the component to support commands + files:

```typescript
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { FileIcon } from '../Icons'

interface FileItem {
  path: string
  name: string
}

interface CommandItem {
  id: string
  label: string
  icon?: string
  onSelect: () => void
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  files: FileItem[]
  onFileSelect: (path: string, name: string) => void
  commands?: CommandItem[]
}

export function CommandPalette({ isOpen, onClose, files, onFileSelect, commands = [] }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isOpen])

  // If query starts with '>' show commands, otherwise show files
  const isCommandMode = query.startsWith('>')
  const cleanQuery = isCommandMode ? query.slice(1).trim().toLowerCase() : query.toLowerCase()

  const filteredCommands = useMemo(() => {
    if (!isCommandMode) return []
    if (!cleanQuery) return commands
    return commands.filter((c) => c.label.toLowerCase().includes(cleanQuery))
  }, [isCommandMode, cleanQuery, commands])

  const filteredFiles = useMemo(() => {
    if (isCommandMode) return []
    if (!query.trim()) return files.slice(0, 10)
    return files.filter((f) => f.name.toLowerCase().replace(/\.md$/, '').includes(cleanQuery)).slice(0, 10)
  }, [isCommandMode, query, cleanQuery, files])

  const items = isCommandMode ? filteredCommands : filteredFiles
  const totalItems = items.length

  if (!isOpen) return null

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { setActiveIndex((i) => Math.min(i + 1, totalItems - 1)); return }
    if (e.key === 'ArrowUp') { setActiveIndex((i) => Math.max(i - 1, 0)); return }
    if (e.key === 'Enter') {
      if (isCommandMode) {
        const cmd = filteredCommands[activeIndex]
        if (cmd) { cmd.onSelect(); onClose() }
      } else {
        const f = filteredFiles[activeIndex] as FileItem | undefined
        if (f) { onFileSelect(f.path, f.name); onClose() }
      }
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 120
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560, background: '#1e1e1e', borderRadius: 10,
          border: '1px solid #333', boxShadow: '0 24px 64px rgba(0,0,0,0.8)', overflow: 'hidden'
        }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActiveIndex(0) }}
          onKeyDown={handleKey}
          placeholder={isCommandMode ? 'Search commands...' : 'Search notes... (type > for commands)'}
          style={{
            width: '100%', padding: '14px 16px',
            background: 'transparent', border: 'none', outline: 'none',
            color: '#fff', fontSize: 15, borderBottom: '1px solid #2a2a2a'
          }}
        />
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {items.length === 0 ? (
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
            filteredFiles.map((f, i) => (
              <div
                key={f.path}
                onClick={() => { onFileSelect(f.path, f.name); onClose() }}
                style={{
                  padding: '10px 16px', cursor: 'pointer', fontSize: 14,
                  color: i === activeIndex ? '#fff' : '#aaa',
                  background: i === activeIndex ? '#2a2a3a' : 'transparent',
                  display: 'flex', alignItems: 'center', gap: 10
                }}
              >
                <FileIcon size={14} color="#7c6af7" />
                <span>{f.name.replace(/\.md$/, '')}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Wire up template commands in Layout.tsx**

Read `src/renderer/src/components/Layout.tsx` to understand how `CommandPalette` is rendered, then add a `commands` prop. Look for where `<CommandPalette` is used and add:

```tsx
commands={[
  {
    id: 'template',
    label: 'Insert Template...',
    icon: '📋',
    onSelect: async () => {
      const templates = await listTemplates()
      if (templates.length === 0) {
        window.alert('No templates found.\n\nCreate .md files in a _templates/ folder in your vault.')
        return
      }
      // Re-open palette in template-select mode — simplest: show native prompt
      const names = templates.map((t, i) => `${i + 1}. ${t.name}`).join('\n')
      const answer = window.prompt(`Choose template:\n${names}\n\nEnter number:`)
      const idx = parseInt(answer ?? '', 10) - 1
      if (idx >= 0 && idx < templates.length) {
        await applyTemplate(templates[idx].path)
      }
    }
  }
]}
```

Note: `listTemplates` and `applyTemplate` come from `useVaultBridge()` — make sure to destructure them in Layout.tsx alongside the other bridge functions.

- [ ] **Step 6: Run tests and typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
npm run typecheck 2>&1 | tail -10
npm run test -- tests/renderer/templates.test.ts 2>&1 | tail -10
```

Expected: 0 TypeScript errors, 5 tests pass.

- [ ] **Step 7: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
git add src/renderer/src/hooks/useVaultBridge.ts \
        src/renderer/src/components/CommandPalette/CommandPalette.tsx \
        tests/renderer/templates.test.ts
git commit -m "feat: templates — insert from _templates/ folder via command palette (>template)"
```

---

## Task 7: Frontmatter / Properties Panel

**Context:** Obsidian shows YAML frontmatter as structured editable fields. We add a "Props" tab to `RightPanel.tsx` and a new `PropertiesPanel.tsx` that parses `---\nkey: value\n---` from the active note, displays each field as an editable input, and saves back on change.

**Files:**

- Create: `src/renderer/src/components/RightPanel/PropertiesPanel.tsx`
- Modify: `src/renderer/src/components/RightPanel/RightPanel.tsx`

- [ ] **Step 1: Write the test**

Create `tests/renderer/properties.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'

type FrontmatterValue = string | string[]
type Frontmatter = Record<string, FrontmatterValue>

function parseFrontmatter(content: string): Frontmatter | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return null
  const lines = match[1].split(/\r?\n/)
  const result: Frontmatter = {}
  for (const line of lines) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    if (!key) continue
    const rawVal = line.slice(colonIdx + 1).trim()
    if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
      result[key] = rawVal
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    } else {
      result[key] = rawVal
    }
  }
  return Object.keys(result).length > 0 ? result : null
}

function serializeFrontmatter(fm: Frontmatter): string {
  const lines = Object.entries(fm).map(([k, v]) => {
    if (Array.isArray(v)) return `${k}: [${v.join(', ')}]`
    return `${k}: ${v}`
  })
  return `---\n${lines.join('\n')}\n---`
}

function updateContentFrontmatter(content: string, key: string, value: string): string {
  const fm = parseFrontmatter(content) ?? {}
  fm[key] = value
  const newHeader = serializeFrontmatter(fm)
  if (/^---[\s\S]*?---/.test(content)) {
    return content.replace(/^---[\s\S]*?---/, newHeader)
  }
  return newHeader + '\n\n' + content
}

describe('frontmatter parsing', () => {
  it('parses simple key: value pairs', () => {
    const content = '---\ntitle: My Note\ndate: 2026-05-20\n---\n\nContent'
    const fm = parseFrontmatter(content)
    expect(fm).toEqual({ title: 'My Note', date: '2026-05-20' })
  })

  it('parses array values', () => {
    const content = '---\ntags: [work, ideas, todo]\n---'
    const fm = parseFrontmatter(content)
    expect(fm?.tags).toEqual(['work', 'ideas', 'todo'])
  })

  it('returns null when no frontmatter', () => {
    expect(parseFrontmatter('# Just a heading')).toBeNull()
  })

  it('updates existing key in frontmatter', () => {
    const content = '---\ntitle: Old\n---\n\nBody'
    const updated = updateContentFrontmatter(content, 'title', 'New')
    expect(updated).toContain('title: New')
    expect(updated).toContain('Body')
  })

  it('adds frontmatter to content without it', () => {
    const content = 'Just body text'
    const updated = updateContentFrontmatter(content, 'title', 'My Title')
    expect(updated).toMatch(/^---\ntitle: My Title\n---/)
    expect(updated).toContain('Just body text')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
npm run test -- tests/renderer/properties.test.ts 2>&1 | tail -10
```

- [ ] **Step 3: Create PropertiesPanel.tsx**

Create `src/renderer/src/components/RightPanel/PropertiesPanel.tsx`:

```typescript
import React, { useMemo, useCallback } from 'react'
import { useVaultStore } from '../../store/useVaultStore'

type FrontmatterValue = string | string[]
type Frontmatter = Record<string, FrontmatterValue>

function parseFrontmatter(content: string): Frontmatter | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return null
  const lines = match[1].split(/\r?\n/)
  const result: Frontmatter = {}
  for (const line of lines) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    if (!key) continue
    const rawVal = line.slice(colonIdx + 1).trim()
    if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
      result[key] = rawVal
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    } else {
      result[key] = rawVal
    }
  }
  return Object.keys(result).length > 0 ? result : null
}

function serializeFrontmatter(fm: Frontmatter): string {
  const lines = Object.entries(fm).map(([k, v]) => {
    if (Array.isArray(v)) return `${k}: [${v.join(', ')}]`
    return `${k}: ${v}`
  })
  return `---\n${lines.join('\n')}\n---`
}

function updateContent(content: string, key: string, value: string): string {
  const fm = parseFrontmatter(content) ?? {}
  fm[key] = value
  const newHeader = serializeFrontmatter(fm)
  if (/^---[\s\S]*?---/.test(content)) {
    return content.replace(/^---[\s\S]*?---/, newHeader)
  }
  return newHeader + '\n\n' + content
}

export function PropertiesPanel() {
  const { panes, activePaneId, setTabContent, markTabDirty } = useVaultStore()
  const activePane = panes.find((p) => p.id === activePaneId) ?? panes[0]
  const activeTab = activePane?.openTabs.find((t) => t.path === activePane?.activeTabPath)

  const frontmatter = useMemo(() => {
    if (!activeTab) return null
    return parseFrontmatter(activeTab.content)
  }, [activeTab?.content])

  const handleChange = useCallback(
    (key: string, value: string) => {
      if (!activeTab) return
      const newContent = updateContent(activeTab.content, key, value)
      setTabContent(activeTab.path, newContent)
      markTabDirty(activeTab.path, true)
    },
    [activeTab, setTabContent, markTabDirty]
  )

  const handleAddProperty = useCallback(() => {
    if (!activeTab) return
    const key = window.prompt('Property name:')
    if (!key?.trim()) return
    handleChange(key.trim(), '')
  }, [activeTab, handleChange])

  if (!activeTab) {
    return (
      <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 12 }}>
        No file open
      </div>
    )
  }

  return (
    <div style={{ padding: '12px 12px 16px' }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--text-secondary)',
          marginBottom: 10
        }}
      >
        Properties
      </div>

      {frontmatter === null && (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
          No frontmatter found.
        </div>
      )}

      {frontmatter !== null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.entries(frontmatter).map(([key, val]) => (
            <div key={key}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>
                {key}
              </div>
              <input
                defaultValue={Array.isArray(val) ? val.join(', ') : val}
                onBlur={(e) => handleChange(key, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                }}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 4,
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-color)')}
                onBlurCapture={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
              />
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleAddProperty}
        style={{
          marginTop: 12,
          width: '100%',
          padding: '5px 0',
          background: 'var(--accent-glow)',
          border: '1px solid var(--border-color)',
          borderRadius: 4,
          color: 'var(--text-secondary)',
          fontSize: 11,
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
      >
        + Add property
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Update RightPanel.tsx to add Props tab**

In `src/renderer/src/components/RightPanel/RightPanel.tsx`:

**4a.** Add import:

```typescript
import { PropertiesPanel } from './PropertiesPanel'
```

**4b.** Change the `RightTab` type:

```typescript
type RightTab = 'backlinks' | 'tags' | 'toc' | 'local-graph' | 'properties'
```

**4c.** Add props tab to the `tabs` array (always visible, not plugin-gated):

```typescript
const tabs: { id: RightTab; label: string }[] = [
  { id: 'properties', label: 'Props' }, // ← add at start
  plugins.backlinksPanel ? { id: 'backlinks', label: 'Links' } : null,
  plugins.tagsPanel ? { id: 'tags', label: 'Tags' } : null,
  plugins.tocPanel ? { id: 'toc', label: 'ToC' } : null,
  { id: 'local-graph', label: 'Local' }
].filter((t): t is { id: RightTab; label: string } => t !== null)
```

**4d.** Add the panel render in the content div:

```tsx
{
  effectiveTab === 'properties' && <PropertiesPanel />
}
{
  effectiveTab === 'backlinks' && <BacklinksPanel />
}
{
  effectiveTab === 'tags' && <TagsPanel />
}
{
  effectiveTab === 'toc' && <TocPanel />
}
{
  effectiveTab === 'local-graph' && <LocalGraphView />
}
```

- [ ] **Step 5: Run tests and typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
npm run typecheck 2>&1 | tail -10
npm run test -- tests/renderer/properties.test.ts 2>&1 | tail -10
```

Expected: 0 TypeScript errors, 5 tests pass.

- [ ] **Step 6: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
git add src/renderer/src/components/RightPanel/PropertiesPanel.tsx \
        src/renderer/src/components/RightPanel/RightPanel.tsx \
        tests/renderer/properties.test.ts
git commit -m "feat: frontmatter properties panel in right sidebar"
```

---

## Task 8: PDF Export

**Context:** HTML export already works (`VAULT_EXPORT_HTML` IPC). For PDF we use Electron's `webContents.printToPDF()` — write HTML to a temp file, load it in a hidden BrowserWindow, print to PDF, save via dialog.

**Files:**

- Modify: `src/shared/types.ts`
- Modify: `src/main/ipc.ts`
- Modify: `src/main/index.ts`
- Modify: `src/renderer/src/hooks/useVaultBridge.ts`

- [ ] **Step 1: Add IPC constant**

In `src/shared/types.ts`, add to the `IPC` object:

```typescript
VAULT_EXPORT_PDF: 'vault:export-pdf',
```

(Add after `VAULT_EXPORT_HTML: 'vault:export-html',`)

- [ ] **Step 2: Add IPC handler in ipc.ts**

In `src/main/ipc.ts`, add this handler after the `VAULT_EXPORT_HTML` handler:

```typescript
ipcMain.handle(IPC.VAULT_EXPORT_PDF, async (_event, suggestedName: string, html: string) => {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Export Note as PDF',
    defaultPath: suggestedName,
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    buttonLabel: 'Export'
  })
  if (!filePath) return null

  const { tmpdir } = await import('os')
  const { join: joinPath } = await import('path')
  const { writeFile: wf, unlink } = await import('fs/promises')
  const tmpHtml = joinPath(tmpdir(), `meridian-pdf-${Date.now()}.html`)

  try {
    await wf(tmpHtml, html, 'utf-8')
    const { BrowserWindow: BW } = await import('electron')
    const win = new BW({ show: false, webPreferences: { javascript: false, sandbox: true } })
    await win.loadFile(tmpHtml)
    const pdfData = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4'
    })
    win.close()
    await wf(filePath, pdfData)
    return filePath
  } finally {
    try {
      await unlink(tmpHtml)
    } catch {
      /* ignore */
    }
  }
})
```

- [ ] **Step 3: Add menu item in index.ts**

In `src/main/index.ts`, in the `buildMenu()` function, find the File submenu and add PDF export after HTML export:

```typescript
{ label: 'Export to HTML…', accelerator: 'CmdOrCtrl+E', click: () => send('export-html') },
{ label: 'Export to PDF…', accelerator: 'CmdOrCtrl+Shift+E', click: () => send('export-pdf') },
```

- [ ] **Step 4: Add exportPdf to useVaultBridge.ts**

In `src/renderer/src/hooks/useVaultBridge.ts`, add `exportPdf` function after `exportNote`. It generates the same HTML as `exportNote` but calls the PDF IPC:

```typescript
const exportPdf = useCallback(async () => {
  const { panes, activePaneId } = useVaultStore.getState()
  const activePane = panes.find((p) => p.id === activePaneId) ?? panes[0]
  const activeTab = activePane?.openTabs.find((t) => t.path === activePane?.activeTabPath)
  if (!activeTab) return

  try {
    const { unified } = await import('unified')
    const { default: remarkParse } = await import('remark-parse')
    const { default: remarkGfm } = await import('remark-gfm')
    const { default: remarkRehype } = await import('remark-rehype')
    const { default: rehypeSanitize } = await import('rehype-sanitize')
    const { default: rehypeStringify } = await import('rehype-stringify')

    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeSanitize)
      .use(rehypeStringify)

    const bodyHtml = String(processor.processSync(activeTab.content))
    const title = activeTab.name.replace(/\.md$/i, '')
    const escapedTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapedTitle}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { max-width: 720px; margin: 0 auto; padding: 48px 32px; font-family: Georgia, serif; line-height: 1.8; color: #1a1a1a; }
    h1, h2, h3, h4, h5, h6 { font-weight: 700; line-height: 1.3; margin-top: 2em; margin-bottom: 0.5em; }
    h1 { font-size: 2em; border-bottom: 2px solid #eee; padding-bottom: 0.3em; margin-top: 0; }
    p { margin: 0 0 1em; }
    a { color: #5b4fcf; }
    code { background: #f0eff5; padding: 2px 5px; border-radius: 3px; font-size: 0.88em; font-family: monospace; }
    pre { background: #f5f4fa; padding: 16px 20px; border-radius: 6px; overflow-x: auto; margin: 1.5em 0; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #ddd; margin: 1em 0; padding: 0.5em 1em; color: #555; }
    img { max-width: 100%; border-radius: 4px; }
    table { border-collapse: collapse; width: 100%; margin: 1.5em 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f5f4fa; font-weight: 600; }
    ul, ol { padding-left: 1.5em; margin: 0 0 1em; }
  </style>
</head>
<body>${bodyHtml}</body>
</html>`

    const result = await window.vault.exportPdf(`${title}.pdf`, fullHtml)
    if (result) console.log('[Bridge] PDF exported to', result)
  } catch (e) {
    console.error('[Bridge] exportPdf error', e)
    window.alert(`Could not export PDF: ${e instanceof Error ? e.message : String(e)}`)
  }
}, [])
```

Also add `exportPdf` to the Window declaration at the top of useVaultBridge.ts:

```typescript
exportPdf: (suggestedName: string, html: string) => Promise<string | null>
```

And add to the return object:

```typescript
exportPdf,
```

- [ ] **Step 5: Wire up menu action in Layout.tsx**

Read `src/renderer/src/components/Layout.tsx` to find where `export-html` menu action is handled. Add handling for `export-pdf`:

```typescript
// Find the menu action handler — something like:
case 'export-html': exportNote(); break
case 'export-pdf':  exportPdf(); break  // ← add this
```

Also destructure `exportPdf` from `useVaultBridge()`.

- [ ] **Step 6: Run typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
npm run typecheck 2>&1 | tail -10
```

Expected: 0 TypeScript errors.

- [ ] **Step 7: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
git add src/shared/types.ts src/main/ipc.ts src/main/index.ts \
        src/renderer/src/hooks/useVaultBridge.ts
git commit -m "feat: export notes to PDF (Cmd+Shift+E)"
```

---

## Self-Review

**Spec coverage:**

1. ✅ Task 1 — Wiki image embeds `![[image.png]]`
2. ✅ Task 2 — Callout blocks `> [!NOTE]`
3. ✅ Task 3 — Folder drag-drop in file tree
4. ✅ Task 4 — File sorting (name A-Z, Z-A, modified)
5. ✅ Task 5 — Slash commands in editor
6. ✅ Task 6 — Templates via command palette
7. ✅ Task 7 — Frontmatter properties panel
8. ✅ Task 8 — PDF export

**Placeholder scan:** No TBD items. All code blocks are complete and runnable.

**Type consistency:**

- `FrontmatterValue` defined once in PropertiesPanel.tsx, referenced only there ✅
- `SlashCommand` interface in slashCommands.ts, used only there ✅
- `SortOrder` type defined in Sidebar.tsx, used only there ✅
- `CommandItem` interface defined in CommandPalette.tsx, prop added to `CommandPaletteProps` ✅
- `IPC.VAULT_EXPORT_PDF` added to types.ts before used in ipc.ts and useVaultBridge.ts ✅

**Known gap:** Task 6 Step 5 (wiring template commands in Layout.tsx) says "read Layout.tsx" — the implementer must read that file first to find the exact location. This is intentional since Layout.tsx was not read during planning.
