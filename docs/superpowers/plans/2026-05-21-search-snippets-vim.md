# Search Snippets + Vim Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show matching text snippets in search results, and add a toggleable Vim mode to the editor.

**Architecture:** Search snippets use a separate in-memory content cache in `SearchIndex` (MiniSearch doesn't store positions). Vim mode uses `@codemirror/vim` wired into the existing `pluginsEnabled` settings pattern — same as `slashCommands`.

**Tech Stack:** React, Zustand, MiniSearch 7, CodeMirror 6, `@codemirror/vim`

---

## Task 1: Search results with content snippets

**Files:**
- Modify: `meridian/src/renderer/src/lib/searchIndex.ts`
- Modify: `meridian/src/renderer/src/store/useLinkStore.ts`
- Modify: `meridian/src/renderer/src/components/Sidebar/SearchPanel.tsx`

### Context

`SearchIndex` wraps MiniSearch. It currently stores only `path` and `name` in `storeFields`, so search results carry no content. We add a `Map<string, string>` content cache alongside MiniSearch to enable snippet extraction.

`SearchResult` (in `searchIndex.ts`) currently is `{ path, name, score }`. We extend it with `snippet: string`.

`useLinkStore.ts` calls `searchIndex.search(query)` and stores results in `searchResults`. `SearchPanel.tsx` renders those results — currently only the file name.

### Step-by-step

- [ ] **Step 1: Extend `SearchIndex` to cache content and extract snippets**

Replace the entire `meridian/src/renderer/src/lib/searchIndex.ts` with:

```ts
import MiniSearch from 'minisearch'

export interface SearchResult {
  path: string
  name: string
  score: number
  snippet: string
}

function extractSnippet(content: string, query: string): string {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const lower = content.toLowerCase()
  let bestPos = -1
  for (const word of words) {
    const idx = lower.indexOf(word)
    if (idx !== -1 && (bestPos === -1 || idx < bestPos)) bestPos = idx
  }
  if (bestPos === -1) return content.slice(0, 120).replace(/\n/g, ' ')
  const start = Math.max(0, bestPos - 60)
  const end = Math.min(content.length, bestPos + 120)
  let snippet = content.slice(start, end).replace(/\n/g, ' ').trim()
  if (start > 0) snippet = '…' + snippet
  if (end < content.length) snippet = snippet + '…'
  return snippet
}

export class SearchIndex {
  private mini = new MiniSearch<{ id: string; path: string; name: string; content: string }>({
    fields: ['name', 'content'],
    storeFields: ['path', 'name'],
    idField: 'id',
    searchOptions: { boost: { name: 3 }, fuzzy: 0.2, prefix: true }
  })

  private contentCache = new Map<string, string>()

  addOrUpdate(path: string, name: string, content: string): void {
    if (this.mini.has(path)) this.mini.discard(path)
    this.mini.add({ id: path, path, name, content })
    this.contentCache.set(path, content)
  }

  remove(path: string): void {
    if (this.mini.has(path)) this.mini.discard(path)
    this.contentCache.delete(path)
  }

  search(query: string): SearchResult[] {
    if (!query.trim()) return []
    return this.mini.search(query).map((r) => ({
      path: r.path as string,
      name: r.name as string,
      score: r.score,
      snippet: extractSnippet(this.contentCache.get(r.path as string) ?? '', query)
    }))
  }
}
```

- [ ] **Step 2: Run typecheck — must pass**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm run typecheck 2>&1 | tail -8
```

Expected: 0 errors. If `SearchResult` type is used anywhere else, TypeScript will flag it — fix by adding `snippet: ''` as fallback where needed.

- [ ] **Step 3: Update `SearchPanel.tsx` to display snippets**

Replace the entire file with:

```tsx
import React, { useState } from 'react'
import { useLinkStore } from '../../store/useLinkStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'
import { FileIcon } from '../Icons'

export function SearchPanel() {
  const [query, setQuery] = useState('')
  const { search, searchResults } = useLinkStore()
  const { openFile } = useVaultBridge()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    search(e.target.value)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)' }}>
        <input
          value={query}
          onChange={handleChange}
          placeholder="Search vault..."
          autoFocus
          style={{
            width: '100%',
            padding: '6px 10px',
            borderRadius: 6,
            background: 'var(--bg-surface)',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: 12
          }}
        />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {searchResults.map((result) => (
          <div
            key={result.path}
            onClick={() => openFile(result.path, result.name)}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              borderBottom: '1px solid var(--border-color)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <FileIcon size={12} color="var(--accent-color)" />
              <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                {result.name.replace(/\.md$/, '')}
              </span>
            </div>
            {result.snippet && (
              <div style={{
                fontSize: 11,
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}>
                {result.snippet}
              </div>
            )}
          </div>
        ))}
        {query && searchResults.length === 0 && (
          <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12, opacity: 0.6 }}>
            No notes match "{query}"
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run typecheck again**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm run typecheck 2>&1 | tail -8
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
git add src/renderer/src/lib/searchIndex.ts src/renderer/src/components/Sidebar/SearchPanel.tsx
git commit -m "feat: show content snippets in search results"
```

---

## Task 2: Vim mode toggle

**Files:**
- Run: `npm install @codemirror/vim` in `meridian/`
- Modify: `meridian/src/renderer/src/store/useSettingsStore.ts` (add `vimMode` to `pluginsEnabled`)
- Modify: `meridian/src/renderer/src/components/Editor/extensions/markdownExtensions.ts` (add `vimModeEnabled` param)
- Modify: `meridian/src/renderer/src/components/Editor/EditorPane.tsx` (pass `pluginsEnabled.vimMode`)
- Modify: `meridian/src/renderer/src/components/Settings/SettingsModal.tsx` (add toggle)

### Context

The existing `pluginsEnabled` object in `useSettingsStore` controls feature flags (e.g. `slashCommands`). `togglePlugin` already handles saving. The `createMarkdownExtensions` function in `markdownExtensions.ts` accepts a `slashCommandsEnabled` boolean — same pattern for `vimModeEnabled`. `EditorPane.tsx` passes `pluginsEnabled.slashCommands` to the editor — add the same for vim.

Read `SettingsModal.tsx` before editing — find where other plugin toggles live and add vim there.

### Step-by-step

- [ ] **Step 1: Install `@codemirror/vim`**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm install @codemirror/vim
```

Expected: package added to `node_modules` and `package.json`.

- [ ] **Step 2: Add `vimMode` to `pluginsEnabled` in `useSettingsStore.ts`**

In the `pluginsEnabled` interface (around line 39), add:
```ts
vimMode: boolean
```

In the `DEFAULTS` object (around line 94), add:
```ts
vimMode: false,
```

The `togglePlugin` action already handles any key in `pluginsEnabled`, so no other changes needed in the store.

- [ ] **Step 3: Add `vimModeEnabled` parameter to `createMarkdownExtensions`**

In `markdownExtensions.ts`, find the function signature ending with `slashCommandsEnabled = false`:

```ts
  slashCommandsEnabled = false
```

Add after it:
```ts
  vimModeEnabled = false
```

At the top of the file, add the import:
```ts
import { vim } from '@codemirror/vim'
```

In the returned extensions array, after the `keymap.of([...])` entry, add:
```ts
    vimModeEnabled ? vim() : [],
```

- [ ] **Step 4: Pass `vimModeEnabled` from `EditorPane.tsx`**

In `EditorPane.tsx`, find the `createMarkdownExtensions(...)` call (around line 480). It currently ends with `pluginsEnabled.slashCommands`. Add `pluginsEnabled.vimMode` as the next argument:

```ts
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
              pluginsEnabled.slashCommands,
              pluginsEnabled.vimMode      // ← add this
            ),
```

- [ ] **Step 5: Add Vim mode toggle to Settings UI**

Read `meridian/src/renderer/src/components/Settings/SettingsModal.tsx` first.

Find the section that renders other plugin toggles (look for `slashCommands` or similar toggle rows). Add a new toggle row for Vim mode in the same style:

The toggle row pattern used elsewhere looks like:
```tsx
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
  <div>
    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>Vim Mode</div>
    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
      Use Vim keybindings in the editor
    </div>
  </div>
  <button
    onClick={() => togglePlugin('vimMode')}
    style={{
      width: 36,
      height: 20,
      borderRadius: 10,
      border: 'none',
      background: pluginsEnabled.vimMode ? 'var(--accent-color)' : 'var(--bg-surface)',
      cursor: 'pointer',
      position: 'relative',
      transition: 'background 0.2s'
    }}
  >
    <span style={{
      position: 'absolute',
      top: 2,
      left: pluginsEnabled.vimMode ? 18 : 2,
      width: 16,
      height: 16,
      borderRadius: '50%',
      background: '#fff',
      transition: 'left 0.2s'
    }} />
  </button>
</div>
```

Read the file to find the exact location and match the existing toggle style exactly.

- [ ] **Step 6: Run typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm run typecheck 2>&1 | tail -8
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
git add src/renderer/src/store/useSettingsStore.ts \
        src/renderer/src/components/Editor/extensions/markdownExtensions.ts \
        src/renderer/src/components/Editor/EditorPane.tsx \
        src/renderer/src/components/Settings/SettingsModal.tsx \
        package.json package-lock.json
git commit -m "feat: vim mode toggle in settings"
```
