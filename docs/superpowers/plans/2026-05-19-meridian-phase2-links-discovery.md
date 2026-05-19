# Meridian Phase 2: Links & Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add wiki-links (`[[Note]]`), backlinks panel, full-text search, command palette (⌘K), and D3 graph view to Meridian.

**Architecture:** All link/search state lives in a new `useLinkStore` Zustand store. A `LinkIndex` class (pure JS, no Electron) parses `[[links]]` and `#tags` from markdown content and maintains forward + backward link maps. MiniSearch provides full-text search over all vault files. The command palette is a modal overlay registered via a global keymap. D3 force graph reads from `LinkIndex`. Wiki-link support is added as two CodeMirror 6 extensions (decoration + autocomplete). The right sidebar replaces the "Right Panel" placeholder with a real `BacklinksPanel`.

**Tech Stack:** MiniSearch (full-text), D3 v7 (graph), CodeMirror 6 extensions (wiki-links), Zustand (link/search state), remark (already installed), Vitest + RTL (tests)

---

## File Structure

```
src/renderer/src/
  lib/
    linkParser.ts           # NEW: parseLinks(content) → {links, tags}
    linkIndex.ts            # NEW: LinkIndex class — build/update/query
    searchIndex.ts          # NEW: MiniSearch wrapper
  store/
    useLinkStore.ts         # NEW: Zustand store — backlinks, tags, search
  hooks/
    useVaultBridge.ts       # MODIFY: add buildIndex() call after vault open
  components/
    RightPanel/
      BacklinksPanel.tsx    # NEW: shows backlinks + tags for active note
    CommandPalette/
      CommandPalette.tsx    # NEW: ⌘K overlay with fuzzy file/command search
    Graph/
      GraphView.tsx         # NEW: D3 force-directed graph
    Sidebar/
      Sidebar.tsx           # MODIFY: add tabs (Files / Search / Graph)
      SearchPanel.tsx       # NEW: search results list
  Editor/
    extensions/
      wikiLinkExtension.ts  # NEW: CM6 decoration for [[links]]
      wikiLinkCompletion.ts # NEW: CM6 autocomplete for [[...]]
    EditorPane.tsx          # MODIFY: plug in wiki-link CM6 extensions
  App.tsx                   # MODIFY: mount CommandPalette globally
tests/
  renderer/
    linkParser.test.ts      # NEW
    linkIndex.test.ts       # NEW
    searchIndex.test.ts     # NEW
    useLinkStore.test.ts    # NEW
    CommandPalette.test.tsx # NEW
```

---

## Task 1: Link Parser

**Files:**
- Create: `meridian/src/renderer/src/lib/linkParser.ts`
- Create: `meridian/tests/renderer/linkParser.test.ts`

- [ ] **Step 1: Write failing tests**

Create `meridian/tests/renderer/linkParser.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseLinks } from '../../src/renderer/src/lib/linkParser'

describe('parseLinks', () => {
  it('extracts wiki-links from content', () => {
    const { links } = parseLinks('See [[My Note]] and [[Other Note]].')
    expect(links).toEqual(['My Note', 'Other Note'])
  })

  it('returns empty arrays for plain text', () => {
    const { links, tags } = parseLinks('No links here.')
    expect(links).toEqual([])
    expect(tags).toEqual([])
  })

  it('extracts hashtags', () => {
    const { tags } = parseLinks('Tagged with #project and #todo.')
    expect(tags).toEqual(['project', 'todo'])
  })

  it('ignores code blocks', () => {
    const { links } = parseLinks('```\n[[not a link]]\n```')
    expect(links).toEqual([])
  })

  it('deduplicates links', () => {
    const { links } = parseLinks('[[A]] and [[A]] again.')
    expect(links).toEqual(['A'])
  })

  it('handles pipe aliases: [[Note|Alias]]', () => {
    const { links } = parseLinks('[[My Note|click here]]')
    expect(links).toEqual(['My Note'])
  })
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npx vitest run tests/renderer/linkParser.test.ts
```

Expected: FAIL — `Cannot find module`

- [ ] **Step 3: Implement**

Create `meridian/src/renderer/src/lib/linkParser.ts`:

```typescript
export interface ParseResult {
  links: string[]
  tags: string[]
}

export function parseLinks(content: string): ParseResult {
  // Strip fenced code blocks before parsing
  const stripped = content.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '')

  const linkSet = new Set<string>()
  const tagSet = new Set<string>()

  for (const match of stripped.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
    linkSet.add(match[1].trim())
  }

  for (const match of stripped.matchAll(/#([\w/-]+)/g)) {
    tagSet.add(match[1])
  }

  return { links: Array.from(linkSet), tags: Array.from(tagSet) }
}
```

- [ ] **Step 4: Run to confirm pass**

```bash
npx vitest run tests/renderer/linkParser.test.ts
```

Expected: PASS — all 6 tests green

- [ ] **Step 5: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && git add src/renderer/src/lib/linkParser.ts tests/renderer/linkParser.test.ts && git commit -m "feat: add wiki-link and tag parser"
```

---

## Task 2: Link Index

**Files:**
- Create: `meridian/src/renderer/src/lib/linkIndex.ts`
- Create: `meridian/tests/renderer/linkIndex.test.ts`

- [ ] **Step 1: Write failing tests**

Create `meridian/tests/renderer/linkIndex.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { LinkIndex } from '../../src/renderer/src/lib/linkIndex'

describe('LinkIndex', () => {
  it('builds forward links from file map', () => {
    const idx = new LinkIndex()
    idx.update('/vault/A.md', 'See [[B]] and [[C]].', '/vault')
    idx.update('/vault/B.md', 'References [[A]].', '/vault')
    idx.update('/vault/C.md', 'Nothing here.', '/vault')

    expect(idx.getOutlinks('/vault/A.md')).toEqual(expect.arrayContaining(['/vault/B.md', '/vault/C.md']))
    expect(idx.getOutlinks('/vault/A.md')).toHaveLength(2)
  })

  it('builds backlinks (inverse)', () => {
    const idx = new LinkIndex()
    idx.update('/vault/A.md', 'See [[B]].', '/vault')
    idx.update('/vault/B.md', '', '/vault')

    expect(idx.getBacklinks('/vault/B.md')).toEqual(['/vault/A.md'])
  })

  it('resolves link text to file path case-insensitively', () => {
    const idx = new LinkIndex()
    idx.update('/vault/My Note.md', '', '/vault')
    idx.update('/vault/A.md', '[[my note]]', '/vault')

    expect(idx.getBacklinks('/vault/My Note.md')).toEqual(['/vault/A.md'])
  })

  it('removes stale links when file is updated', () => {
    const idx = new LinkIndex()
    idx.update('/vault/A.md', '[[B]]', '/vault')
    idx.update('/vault/B.md', '', '/vault')
    idx.update('/vault/A.md', '[[C]]', '/vault') // A no longer links to B
    idx.update('/vault/C.md', '', '/vault')

    expect(idx.getBacklinks('/vault/B.md')).toEqual([])
    expect(idx.getBacklinks('/vault/C.md')).toEqual(['/vault/A.md'])
  })

  it('returns tags for a file', () => {
    const idx = new LinkIndex()
    idx.update('/vault/A.md', '#project #todo', '/vault')
    expect(idx.getTags('/vault/A.md')).toEqual(expect.arrayContaining(['project', 'todo']))
  })

  it('returns all tags across vault', () => {
    const idx = new LinkIndex()
    idx.update('/vault/A.md', '#project', '/vault')
    idx.update('/vault/B.md', '#todo #project', '/vault')
    const all = idx.getAllTags()
    expect(all.get('project')).toEqual(expect.arrayContaining(['/vault/A.md', '/vault/B.md']))
    expect(all.get('todo')).toEqual(['/vault/B.md'])
  })
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npx vitest run tests/renderer/linkIndex.test.ts
```

Expected: FAIL — `Cannot find module`

- [ ] **Step 3: Implement**

Create `meridian/src/renderer/src/lib/linkIndex.ts`:

```typescript
import { parseLinks } from './linkParser'

export class LinkIndex {
  // filePath → resolved outlink paths
  private outlinks = new Map<string, string[]>()
  // filePath → raw link texts
  private rawLinks = new Map<string, string[]>()
  // filePath → tags
  private fileTags = new Map<string, string[]>()
  // all known file paths (for resolution)
  private knownFiles = new Set<string>()

  update(filePath: string, content: string, vaultPath: string): void {
    this.knownFiles.add(filePath)
    const { links, tags } = parseLinks(content)
    this.rawLinks.set(filePath, links)
    this.fileTags.set(filePath, tags)
    this.resolveAll(vaultPath)
  }

  remove(filePath: string, vaultPath: string): void {
    this.knownFiles.delete(filePath)
    this.rawLinks.delete(filePath)
    this.fileTags.delete(filePath)
    this.outlinks.delete(filePath)
    this.resolveAll(vaultPath)
  }

  private resolveAll(vaultPath: string): void {
    this.outlinks.clear()
    for (const [filePath, links] of this.rawLinks) {
      const resolved = links
        .map(link => this.resolve(link, vaultPath))
        .filter((p): p is string => p !== null)
      this.outlinks.set(filePath, resolved)
    }
  }

  private resolve(linkText: string, vaultPath: string): string | null {
    const lower = linkText.toLowerCase()
    for (const known of this.knownFiles) {
      const name = known.split('/').pop() ?? ''
      const baseName = name.replace(/\.md$/i, '').toLowerCase()
      if (baseName === lower) return known
    }
    return null
  }

  getOutlinks(filePath: string): string[] {
    return this.outlinks.get(filePath) ?? []
  }

  getBacklinks(filePath: string): string[] {
    const result: string[] = []
    for (const [src, targets] of this.outlinks) {
      if (targets.includes(filePath)) result.push(src)
    }
    return result
  }

  getTags(filePath: string): string[] {
    return this.fileTags.get(filePath) ?? []
  }

  getAllTags(): Map<string, string[]> {
    const result = new Map<string, string[]>()
    for (const [filePath, tags] of this.fileTags) {
      for (const tag of tags) {
        const files = result.get(tag) ?? []
        files.push(filePath)
        result.set(tag, files)
      }
    }
    return result
  }

  getAllFiles(): string[] {
    return Array.from(this.knownFiles)
  }
}
```

- [ ] **Step 4: Run to confirm pass**

```bash
npx vitest run tests/renderer/linkIndex.test.ts
```

Expected: PASS — all 6 tests green

- [ ] **Step 5: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && git add src/renderer/src/lib/linkIndex.ts tests/renderer/linkIndex.test.ts && git commit -m "feat: add LinkIndex with forward/backward link tracking and tag indexing"
```

---

## Task 3: Search Index

**Files:**
- Create: `meridian/src/renderer/src/lib/searchIndex.ts`
- Create: `meridian/tests/renderer/searchIndex.test.ts`

- [ ] **Step 1: Write failing tests**

Create `meridian/tests/renderer/searchIndex.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { SearchIndex } from '../../src/renderer/src/lib/searchIndex'

describe('SearchIndex', () => {
  it('finds files by content', () => {
    const idx = new SearchIndex()
    idx.addOrUpdate('/vault/A.md', 'A.md', 'The quick brown fox')
    idx.addOrUpdate('/vault/B.md', 'B.md', 'A lazy dog sat here')

    const results = idx.search('fox')
    expect(results.map(r => r.path)).toContain('/vault/A.md')
    expect(results.map(r => r.path)).not.toContain('/vault/B.md')
  })

  it('finds files by name', () => {
    const idx = new SearchIndex()
    idx.addOrUpdate('/vault/Meeting Notes.md', 'Meeting Notes.md', 'content here')

    const results = idx.search('meeting')
    expect(results[0].path).toBe('/vault/Meeting Notes.md')
  })

  it('returns empty array for no match', () => {
    const idx = new SearchIndex()
    idx.addOrUpdate('/vault/A.md', 'A.md', 'hello world')
    expect(idx.search('xyz123')).toEqual([])
  })

  it('removes a file from the index', () => {
    const idx = new SearchIndex()
    idx.addOrUpdate('/vault/A.md', 'A.md', 'unique phrase')
    idx.remove('/vault/A.md')
    expect(idx.search('unique phrase')).toEqual([])
  })
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npx vitest run tests/renderer/searchIndex.test.ts
```

Expected: FAIL — `Cannot find module`

- [ ] **Step 3: Implement**

Create `meridian/src/renderer/src/lib/searchIndex.ts`:

```typescript
import MiniSearch from 'minisearch'

export interface SearchResult {
  path: string
  name: string
  score: number
}

export class SearchIndex {
  private mini = new MiniSearch<{ id: string; path: string; name: string; content: string }>({
    fields: ['name', 'content'],
    storeFields: ['path', 'name'],
    idField: 'id',
    searchOptions: { boost: { name: 3 }, fuzzy: 0.2, prefix: true },
  })

  addOrUpdate(path: string, name: string, content: string): void {
    if (this.mini.has(path)) this.mini.discard(path)
    this.mini.add({ id: path, path, name, content })
  }

  remove(path: string): void {
    if (this.mini.has(path)) this.mini.discard(path)
  }

  search(query: string): SearchResult[] {
    if (!query.trim()) return []
    return this.mini.search(query).map(r => ({
      path: r.path as string,
      name: r.name as string,
      score: r.score,
    }))
  }
}
```

- [ ] **Step 4: Run to confirm pass**

```bash
npx vitest run tests/renderer/searchIndex.test.ts
```

Expected: PASS — all 4 tests green

- [ ] **Step 5: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && git add src/renderer/src/lib/searchIndex.ts tests/renderer/searchIndex.test.ts && git commit -m "feat: add MiniSearch-backed SearchIndex"
```

---

## Task 4: Link Store

**Files:**
- Create: `meridian/src/renderer/src/store/useLinkStore.ts`
- Create: `meridian/tests/renderer/useLinkStore.test.ts`
- Modify: `meridian/src/renderer/src/hooks/useVaultBridge.ts`

- [ ] **Step 1: Write failing tests**

Create `meridian/tests/renderer/useLinkStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useLinkStore } from '../../src/renderer/src/store/useLinkStore'

beforeEach(() => {
  useLinkStore.getState().reset()
})

describe('useLinkStore', () => {
  it('starts with empty state', () => {
    const { result } = renderHook(() => useLinkStore())
    expect(result.current.backlinks('/vault/A.md')).toEqual([])
    expect(result.current.searchResults).toEqual([])
  })

  it('indexes a file and returns backlinks', () => {
    const { result } = renderHook(() => useLinkStore())
    act(() => {
      result.current.indexFile('/vault/A.md', 'A.md', '[[B]]', '/vault')
      result.current.indexFile('/vault/B.md', 'B.md', 'nothing', '/vault')
    })
    expect(result.current.backlinks('/vault/B.md')).toEqual(['/vault/A.md'])
  })

  it('returns search results', () => {
    const { result } = renderHook(() => useLinkStore())
    act(() => {
      result.current.indexFile('/vault/Notes.md', 'Notes.md', 'the quick brown fox', '/vault')
    })
    act(() => {
      result.current.search('fox')
    })
    expect(result.current.searchResults.map(r => r.path)).toContain('/vault/Notes.md')
  })

  it('returns tags for a file', () => {
    const { result } = renderHook(() => useLinkStore())
    act(() => {
      result.current.indexFile('/vault/A.md', 'A.md', '#project #todo', '/vault')
    })
    expect(result.current.tagsForFile('/vault/A.md')).toEqual(expect.arrayContaining(['project', 'todo']))
  })
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npx vitest run tests/renderer/useLinkStore.test.ts
```

Expected: FAIL — `Cannot find module`

- [ ] **Step 3: Implement**

Create `meridian/src/renderer/src/store/useLinkStore.ts`:

```typescript
import { create } from 'zustand'
import { LinkIndex } from '../lib/linkIndex'
import { SearchIndex, SearchResult } from '../lib/searchIndex'

interface LinkState {
  searchResults: SearchResult[]
  searchQuery: string

  indexFile: (path: string, name: string, content: string, vaultPath: string) => void
  backlinks: (path: string) => string[]
  outlinks: (path: string) => string[]
  tagsForFile: (path: string) => string[]
  allTags: () => Map<string, string[]>
  allFiles: () => string[]
  search: (query: string) => void
  reset: () => void
}

const linkIndex = new LinkIndex()
const searchIndex = new SearchIndex()

export const useLinkStore = create<LinkState>((set) => ({
  searchResults: [],
  searchQuery: '',

  indexFile: (path, name, content, vaultPath) => {
    linkIndex.update(path, content, vaultPath)
    searchIndex.addOrUpdate(path, name, content)
  },

  backlinks: (path) => linkIndex.getBacklinks(path),
  outlinks: (path) => linkIndex.getOutlinks(path),
  tagsForFile: (path) => linkIndex.getTags(path),
  allTags: () => linkIndex.getAllTags(),
  allFiles: () => linkIndex.getAllFiles(),

  search: (query) => {
    set({ searchQuery: query, searchResults: searchIndex.search(query) })
  },

  reset: () => {
    // Replace module-level singletons
    Object.assign(linkIndex, new LinkIndex())
    Object.assign(searchIndex, new SearchIndex())
    set({ searchResults: [], searchQuery: '' })
  },
}))
```

- [ ] **Step 4: Run to confirm pass**

```bash
npx vitest run tests/renderer/useLinkStore.test.ts
```

Expected: PASS — all 4 tests green

- [ ] **Step 5: Wire index building into useVaultBridge**

In `meridian/src/renderer/src/hooks/useVaultBridge.ts`, add index building after vault open. Read the current file, then add the import and modify `openVault` and `openFile`:

Add at the top of the file (after existing imports):
```typescript
import { useLinkStore } from '../store/useLinkStore'
```

Replace `openVault` with:
```typescript
  const openVault = useCallback(async () => {
    const config = await window.vault.openDialog()
    if (!config) return
    setVault(config)
    const files = await window.vault.listFiles()
    setFiles(files)
    // Build link + search index for all .md files
    const { indexFile } = useLinkStore.getState()
    const flatFiles = flattenFiles(files)
    for (const f of flatFiles) {
      if (!f.isDirectory && f.name.endsWith('.md')) {
        const content = await window.vault.readFile(f.path)
        indexFile(f.path, f.name, content, config.path)
      }
    }
  }, [setVault, setFiles])
```

Add this helper function before `useVaultBridge`:
```typescript
function flattenFiles(files: import('@shared/types').VaultFile[]): import('@shared/types').VaultFile[] {
  const result: import('@shared/types').VaultFile[] = []
  for (const f of files) {
    result.push(f)
    if (f.children) result.push(...flattenFiles(f.children))
  }
  return result
}
```

Also update `saveFile` to re-index on save:
```typescript
  const saveFile = useCallback(async (path: string, content: string) => {
    await window.vault.writeFile(path, content)
    markTabDirty(path, false)
    // Re-index this file
    const vault = useVaultStore.getState().vault
    if (vault) {
      const name = path.split('/').pop() ?? ''
      useLinkStore.getState().indexFile(path, name, content, vault.path)
    }
  }, [markTabDirty])
```

Add the `useVaultStore` import at the top:
```typescript
import { useVaultStore } from '../store/useVaultStore'
```

- [ ] **Step 6: Run all tests**

```bash
npx vitest run
```

Expected: 24+ tests passing (all previous + 4 new)

- [ ] **Step 7: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && git add -A && git commit -m "feat: add link/search store, wire index building on vault open and file save"
```

---

## Task 5: Wiki-link CM6 Extensions

**Files:**
- Create: `meridian/src/renderer/src/components/Editor/extensions/wikiLinkExtension.ts`
- Create: `meridian/src/renderer/src/components/Editor/extensions/wikiLinkCompletion.ts`
- Modify: `meridian/src/renderer/src/components/Editor/extensions/markdownExtensions.ts`

- [ ] **Step 1: Create wiki-link decoration extension**

Create `meridian/src/renderer/src/components/Editor/extensions/wikiLinkExtension.ts`:

```typescript
import { Extension } from '@codemirror/state'
import { ViewPlugin, DecorationSet, Decoration, ViewUpdate, EditorView } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'

const wikiLinkMark = Decoration.mark({ class: 'cm-wiki-link' })

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const regex = /\[\[[^\]]+\]\]/g

  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to)
    let match: RegExpExecArray | null
    regex.lastIndex = 0
    while ((match = regex.exec(text)) !== null) {
      builder.add(from + match.index, from + match.index + match[0].length, wikiLinkMark)
    }
  }

  return builder.finish()
}

export const wikiLinkExtension = (onLinkClick: (linkText: string) => void): Extension => [
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet
      constructor(view: EditorView) {
        this.decorations = buildDecorations(view)
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildDecorations(update.view)
        }
      }
    },
    { decorations: v => v.decorations }
  ),
  EditorView.domEventHandlers({
    click(event, view) {
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
      if (pos == null) return false
      const line = view.state.doc.lineAt(pos)
      const text = line.text
      const regex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g
      let match: RegExpExecArray | null
      while ((match = regex.exec(text)) !== null) {
        const start = line.from + match.index
        const end = start + match[0].length
        if (pos >= start && pos <= end) {
          onLinkClick(match[1].trim())
          return true
        }
      }
      return false
    },
  }),
  EditorView.baseTheme({
    '.cm-wiki-link': {
      color: '#7c6af7',
      textDecoration: 'underline',
      cursor: 'pointer',
    },
  }),
]
```

- [ ] **Step 2: Create wiki-link autocomplete extension**

Create `meridian/src/renderer/src/components/Editor/extensions/wikiLinkCompletion.ts`:

```typescript
import { CompletionContext, CompletionResult, autocompletion } from '@codemirror/autocomplete'
import { Extension } from '@codemirror/state'

export function wikiLinkCompletion(getFileNames: () => string[]): Extension {
  return autocompletion({
    override: [
      (context: CompletionContext): CompletionResult | null => {
        // Match [[ followed by any non-bracket chars at cursor
        const match = context.matchBefore(/\[\[[^\]]*/)
        if (!match) return null
        if (match.from === match.to && !context.explicit) return null

        const query = match.text.slice(2).toLowerCase()
        const names = getFileNames()
        const options = names
          .filter(n => n.toLowerCase().replace(/\.md$/, '').includes(query))
          .map(n => {
            const label = n.replace(/\.md$/, '')
            return {
              label,
              apply: (view: import('@codemirror/view').EditorView, _completion: import('@codemirror/autocomplete').Completion, from: number, to: number) => {
                // Find the [[ we matched and replace from there
                const linkStart = match.from
                view.dispatch({
                  changes: { from: linkStart, to, insert: `[[${label}]]` },
                })
              },
            }
          })

        return { from: match.from, options }
      },
    ],
  })
}
```

- [ ] **Step 3: Update markdownExtensions to accept callbacks**

Read `meridian/src/renderer/src/components/Editor/extensions/markdownExtensions.ts` first, then replace `createMarkdownExtensions` signature:

```typescript
// Replace the function signature and add imports at top:
import { wikiLinkExtension } from './wikiLinkExtension'
import { wikiLinkCompletion } from './wikiLinkCompletion'

// Replace createMarkdownExtensions function:
export function createMarkdownExtensions(
  onChange?: (content: string) => void,
  onLinkClick?: (linkText: string) => void,
  getFileNames?: () => string[],
) {
  return [
    oneDark,
    meridianTheme,
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    foldGutter(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(),
    closeBrackets(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      ...lintKeymap,
    ]),
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    onLinkClick ? wikiLinkExtension(onLinkClick) : [],
    getFileNames ? wikiLinkCompletion(getFileNames) : [],
    onChange
      ? EditorView.updateListener.of(update => {
          if (update.docChanged) onChange(update.state.doc.toString())
        })
      : [],
  ]
}
```

- [ ] **Step 4: Update EditorPane to pass callbacks**

Read `meridian/src/renderer/src/components/Editor/EditorPane.tsx` first, then:

Add these imports at the top:
```typescript
import { useLinkStore } from '../../store/useLinkStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'
```

(Note: `useVaultBridge` is already imported — just add `useLinkStore`)

Inside `EditorArea`, before the `useEffect` that mounts CodeMirror, add:

```typescript
  const allFiles = useLinkStore(s => s.allFiles)
  const { openFile } = useVaultBridge()
  const vault = useVaultStore(s => s.vault)

  const handleLinkClick = useCallback((linkText: string) => {
    const files = allFiles()
    const match = files.find(f => {
      const name = f.split('/').pop()?.replace(/\.md$/i, '') ?? ''
      return name.toLowerCase() === linkText.toLowerCase()
    })
    if (match) {
      const name = match.split('/').pop() ?? ''
      openFile(match, name)
    }
  }, [allFiles, openFile])

  const getFileNames = useCallback(() => {
    return allFiles().map(f => f.split('/').pop() ?? '').filter(n => n.endsWith('.md'))
  }, [allFiles])
```

Then update the `useEffect` that creates the EditorView to pass these:
```typescript
    const view = new EditorView({
      state: EditorState.create({
        doc: activeTab?.content ?? '',
        extensions: createMarkdownExtensions(handleChange, handleLinkClick, getFileNames),
      }),
      parent: editorRef.current,
    })
```

- [ ] **Step 5: Run all tests**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npx vitest run
```

Expected: all previous tests still pass

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add wiki-link CM6 decoration, click-to-open, and autocomplete"
```

---

## Task 6: Backlinks Panel

**Files:**
- Create: `meridian/src/renderer/src/components/RightPanel/BacklinksPanel.tsx`
- Modify: `meridian/src/renderer/src/App.tsx`

- [ ] **Step 1: Create BacklinksPanel**

Create directory `meridian/src/renderer/src/components/RightPanel/` and file `BacklinksPanel.tsx`:

```typescript
import React from 'react'
import { useVaultStore } from '../../store/useVaultStore'
import { useLinkStore } from '../../store/useLinkStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'

export function BacklinksPanel() {
  const activeTabPath = useVaultStore(s => s.activeTabPath)
  const linkStore = useLinkStore()
  const { openFile } = useVaultBridge()

  const backlinks = activeTabPath ? linkStore.backlinks(activeTabPath) : []
  const tags = activeTabPath ? linkStore.tagsForFile(activeTabPath) : []

  return (
    <div style={{ padding: '12px 0', fontSize: 12, color: '#aaa' }}>
      <div style={{ padding: '0 12px 8px', color: '#666', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Backlinks
      </div>
      {backlinks.length === 0 ? (
        <div style={{ padding: '0 12px', color: '#444' }}>No backlinks</div>
      ) : (
        backlinks.map(path => {
          const name = path.split('/').pop() ?? ''
          return (
            <div
              key={path}
              onClick={() => openFile(path, name)}
              style={{ padding: '4px 12px', cursor: 'pointer', color: '#7c6af7', borderRadius: 4 }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1e1e1e')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {name.replace(/\.md$/, '')}
            </div>
          )
        })
      )}

      {tags.length > 0 && (
        <>
          <div style={{ padding: '12px 12px 8px', color: '#666', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tags
          </div>
          <div style={{ padding: '0 12px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {tags.map(tag => (
              <span key={tag} style={{ background: '#2a2a2a', color: '#888', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>
                #{tag}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Wire BacklinksPanel into App.tsx**

Read `meridian/src/renderer/src/App.tsx`, add the import:
```typescript
import { BacklinksPanel } from './components/RightPanel/BacklinksPanel'
```

Replace `rightPanel={<div style={{ padding: 12, color: '#555', fontSize: 12 }}>Right Panel</div>}` with:
```typescript
rightPanel={<BacklinksPanel />}
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && git add -A && git commit -m "feat: add backlinks panel showing inbound links and tags for active note"
```

---

## Task 7: Command Palette

**Files:**
- Create: `meridian/src/renderer/src/components/CommandPalette/CommandPalette.tsx`
- Create: `meridian/tests/renderer/CommandPalette.test.tsx`
- Modify: `meridian/src/renderer/src/App.tsx`

- [ ] **Step 1: Write failing tests**

Create `meridian/tests/renderer/CommandPalette.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CommandPalette } from '../../src/renderer/src/components/CommandPalette/CommandPalette'

const mockFiles = [
  { path: '/v/Alpha.md', name: 'Alpha.md' },
  { path: '/v/Beta.md', name: 'Beta.md' },
  { path: '/v/Gamma.md', name: 'Gamma.md' },
]

describe('CommandPalette', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <CommandPalette isOpen={false} onClose={vi.fn()} files={mockFiles} onFileSelect={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders search input when open', () => {
    render(
      <CommandPalette isOpen={true} onClose={vi.fn()} files={mockFiles} onFileSelect={vi.fn()} />
    )
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })

  it('filters files by query', () => {
    render(
      <CommandPalette isOpen={true} onClose={vi.fn()} files={mockFiles} onFileSelect={vi.fn()} />
    )
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'alph' } })
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.queryByText('Beta')).not.toBeInTheDocument()
  })

  it('calls onFileSelect when item is clicked', () => {
    const onFileSelect = vi.fn()
    render(
      <CommandPalette isOpen={true} onClose={vi.fn()} files={mockFiles} onFileSelect={onFileSelect} />
    )
    fireEvent.click(screen.getByText('Alpha'))
    expect(onFileSelect).toHaveBeenCalledWith('/v/Alpha.md', 'Alpha.md')
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    render(
      <CommandPalette isOpen={true} onClose={onClose} files={mockFiles} onFileSelect={vi.fn()} />
    )
    fireEvent.keyDown(screen.getByPlaceholderText(/search/i), { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npx vitest run tests/renderer/CommandPalette.test.tsx
```

Expected: FAIL — `Cannot find module`

- [ ] **Step 3: Implement**

Create directory `meridian/src/renderer/src/components/CommandPalette/` and file `CommandPalette.tsx`:

```typescript
import React, { useState, useEffect, useRef, useMemo } from 'react'

interface FileItem {
  path: string
  name: string
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  files: FileItem[]
  onFileSelect: (path: string, name: string) => void
}

export function CommandPalette({ isOpen, onClose, files, onFileSelect }: CommandPaletteProps) {
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

  const filtered = useMemo(() => {
    if (!query.trim()) return files.slice(0, 10)
    const q = query.toLowerCase()
    return files
      .filter(f => f.name.toLowerCase().replace(/\.md$/, '').includes(q))
      .slice(0, 10)
  }, [query, files])

  if (!isOpen) return null

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { setActiveIndex(i => Math.min(i + 1, filtered.length - 1)); return }
    if (e.key === 'ArrowUp') { setActiveIndex(i => Math.max(i - 1, 0)); return }
    if (e.key === 'Enter' && filtered[activeIndex]) {
      const f = filtered[activeIndex]
      onFileSelect(f.path, f.name)
      onClose()
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 120,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 560, background: '#1e1e1e', borderRadius: 10,
          border: '1px solid #333', boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
          overflow: 'hidden',
        }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setActiveIndex(0) }}
          onKeyDown={handleKey}
          placeholder="Search notes..."
          style={{
            width: '100%', padding: '14px 16px', background: 'transparent',
            border: 'none', outline: 'none', color: '#fff', fontSize: 15,
            borderBottom: '1px solid #2a2a2a',
          }}
        />
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '12px 16px', color: '#555', fontSize: 13 }}>No results</div>
          ) : (
            filtered.map((f, i) => {
              const displayName = f.name.replace(/\.md$/, '')
              return (
                <div
                  key={f.path}
                  onClick={() => { onFileSelect(f.path, f.name); onClose() }}
                  style={{
                    padding: '10px 16px', cursor: 'pointer', fontSize: 14,
                    color: i === activeIndex ? '#fff' : '#aaa',
                    background: i === activeIndex ? '#2a2a3a' : 'transparent',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}
                >
                  <span style={{ fontSize: 12 }}>📄</span>
                  <span>{displayName}</span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run to confirm pass**

```bash
npx vitest run tests/renderer/CommandPalette.test.tsx
```

Expected: PASS — all 5 tests green

- [ ] **Step 5: Wire into App.tsx**

Read `meridian/src/renderer/src/App.tsx`, then replace entire file content with:

```typescript
import React, { useState, useEffect, useCallback } from 'react'
import { useVaultStore } from './store/useVaultStore'
import { useLinkStore } from './store/useLinkStore'
import { VaultPicker } from './components/VaultPicker'
import { Layout } from './components/Layout'
import { Sidebar } from './components/Sidebar/Sidebar'
import { EditorArea } from './components/Editor/EditorPane'
import { StatusBar } from './components/StatusBar'
import { BacklinksPanel } from './components/RightPanel/BacklinksPanel'
import { CommandPalette } from './components/CommandPalette/CommandPalette'
import { useVaultBridge } from './hooks/useVaultBridge'

export default function App() {
  const vault = useVaultStore(s => s.vault)
  const allFiles = useLinkStore(s => s.allFiles)
  const { openFile } = useVaultBridge()
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(open => !open)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const paletteFiles = allFiles().map(path => ({
    path,
    name: path.split('/').pop() ?? '',
  })).filter(f => f.name.endsWith('.md'))

  const handleFileSelect = useCallback((path: string, name: string) => {
    openFile(path, name)
  }, [openFile])

  if (!vault) return <VaultPicker />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Layout
        sidebar={<Sidebar />}
        editor={<EditorArea />}
        rightPanel={<BacklinksPanel />}
      />
      <StatusBar />
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        files={paletteFiles}
        onFileSelect={handleFileSelect}
      />
    </div>
  )
}
```

- [ ] **Step 6: Run all tests**

```bash
npx vitest run
```

Expected: 29+ tests passing

- [ ] **Step 7: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && git add -A && git commit -m "feat: add command palette with file search (⌘K)"
```

---

## Task 8: Sidebar Search Tab

**Files:**
- Create: `meridian/src/renderer/src/components/Sidebar/SearchPanel.tsx`
- Modify: `meridian/src/renderer/src/components/Sidebar/Sidebar.tsx`

- [ ] **Step 1: Create SearchPanel**

Create `meridian/src/renderer/src/components/Sidebar/SearchPanel.tsx`:

```typescript
import React, { useState } from 'react'
import { useLinkStore } from '../../store/useLinkStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'

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
      <div style={{ padding: '8px 10px', borderBottom: '1px solid #2a2a2a' }}>
        <input
          value={query}
          onChange={handleChange}
          placeholder="Search vault..."
          style={{
            width: '100%', padding: '6px 10px', borderRadius: 6,
            background: '#2a2a2a', border: 'none', outline: 'none',
            color: '#ccc', fontSize: 12,
          }}
        />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {searchResults.map(result => (
          <div
            key={result.path}
            onClick={() => openFile(result.path, result.name)}
            style={{
              padding: '6px 12px', cursor: 'pointer', fontSize: 13, color: '#ccc',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#2a2a2a')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontSize: 11 }}>📄</span>
            <span>{result.name.replace(/\.md$/, '')}</span>
          </div>
        ))}
        {query && searchResults.length === 0 && (
          <div style={{ padding: '8px 12px', color: '#555', fontSize: 12 }}>No results</div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update Sidebar with tabs**

Read `meridian/src/renderer/src/components/Sidebar/Sidebar.tsx`, then replace entire content with:

```typescript
import React, { useState } from 'react'
import { useVaultStore } from '../../store/useVaultStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'
import { FileTree } from './FileTree'
import { SearchPanel } from './SearchPanel'

type SidebarTab = 'files' | 'search'

export function Sidebar() {
  const { vault, files } = useVaultStore()
  const { openFile, createFile } = useVaultBridge()
  const [activeTab, setActiveTab] = useState<SidebarTab>('files')

  if (!vault) return null

  const tabs: { id: SidebarTab; icon: string; label: string }[] = [
    { id: 'files', icon: '📄', label: 'Files' },
    { id: 'search', icon: '🔍', label: 'Search' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #2a2a2a', flexShrink: 0 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            title={tab.label}
            style={{
              flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer', fontSize: 14,
              background: activeTab === tab.id ? '#1a1a1a' : 'transparent',
              color: activeTab === tab.id ? '#fff' : '#555',
              borderBottom: activeTab === tab.id ? '2px solid #7c6af7' : '2px solid transparent',
            }}
          >
            {tab.icon}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'files' && (
          <>
            <div style={{
              padding: '8px 12px', borderBottom: '1px solid #2a2a2a', color: '#777',
              fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span>📁</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {vault.name}
              </span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
              <FileTree files={files} onFileClick={openFile} vaultPath={vault.path} />
            </div>
            <div style={{ padding: 8, borderTop: '1px solid #2a2a2a', flexShrink: 0 }}>
              <button
                onClick={() => createFile(vault.path, `Untitled ${Date.now()}.md`)}
                style={{
                  width: '100%', padding: '6px 0', borderRadius: 6,
                  background: '#2a2050', color: '#aaa', border: 'none',
                  fontSize: 12, cursor: 'pointer',
                }}
              >
                + New note
              </button>
            </div>
          </>
        )}
        {activeTab === 'search' && <SearchPanel />}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run all tests**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npx vitest run
```

Expected: all previous tests still pass

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add search panel tab in sidebar"
```

---

## Task 9: D3 Graph View

**Files:**
- Create: `meridian/src/renderer/src/components/Graph/GraphView.tsx`
- Modify: `meridian/src/renderer/src/components/Sidebar/Sidebar.tsx`

- [ ] **Step 1: Create GraphView component**

Create directory `meridian/src/renderer/src/components/Graph/` and file `GraphView.tsx`:

```typescript
import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { useLinkStore } from '../../store/useLinkStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  name: string
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode
  target: string | GraphNode
}

export function GraphView() {
  const svgRef = useRef<SVGSVGElement>(null)
  const allFiles = useLinkStore(s => s.allFiles)
  const outlinks = useLinkStore(s => s.outlinks)
  const { openFile } = useVaultBridge()

  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const files = allFiles().filter(f => f.endsWith('.md'))
    if (files.length === 0) return

    const width = svgRef.current.clientWidth || 400
    const height = svgRef.current.clientHeight || 400

    const nodes: GraphNode[] = files.map(f => ({
      id: f,
      name: f.split('/').pop()?.replace(/\.md$/, '') ?? '',
    }))

    const links: GraphLink[] = []
    for (const file of files) {
      for (const target of outlinks(file)) {
        if (files.includes(target)) {
          links.push({ source: file, target })
        }
      }
    }

    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-120))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(20))

    const g = svg.append('g')

    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 3])
        .on('zoom', ({ transform }) => g.attr('transform', transform))
    )

    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#2a2a2a')
      .attr('stroke-width', 1.5)

    const node = g.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', 6)
      .attr('fill', '#7c6af7')
      .attr('stroke', '#161616')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (_event, d) => {
        const name = d.id.split('/').pop() ?? ''
        openFile(d.id, name)
      })
      .call(
        d3.drag<SVGCircleElement, GraphNode>()
          .on('start', (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
          .on('end', (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null })
      )

    const label = g.append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .text(d => d.name)
      .attr('font-size', 10)
      .attr('fill', '#888')
      .attr('text-anchor', 'middle')
      .attr('dy', 18)
      .style('pointer-events', 'none')

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x ?? 0)
        .attr('y1', d => (d.source as GraphNode).y ?? 0)
        .attr('x2', d => (d.target as GraphNode).x ?? 0)
        .attr('y2', d => (d.target as GraphNode).y ?? 0)
      node.attr('cx', d => d.x ?? 0).attr('cy', d => d.y ?? 0)
      label.attr('x', d => d.x ?? 0).attr('y', d => d.y ?? 0)
    })

    return () => { simulation.stop() }
  }, [allFiles, outlinks, openFile])

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <svg ref={svgRef} style={{ flex: 1, width: '100%', height: '100%', background: '#161616' }} />
    </div>
  )
}
```

- [ ] **Step 2: Add Graph tab to Sidebar**

Read `meridian/src/renderer/src/components/Sidebar/Sidebar.tsx`, then:

Change `type SidebarTab = 'files' | 'search'` to:
```typescript
type SidebarTab = 'files' | 'search' | 'graph'
```

Change the tabs array to:
```typescript
  const tabs: { id: SidebarTab; icon: string; label: string }[] = [
    { id: 'files', icon: '📄', label: 'Files' },
    { id: 'search', icon: '🔍', label: 'Search' },
    { id: 'graph', icon: '🕸️', label: 'Graph' },
  ]
```

Add the import at the top:
```typescript
import { GraphView } from '../Graph/GraphView'
```

Add after the `{activeTab === 'search' && <SearchPanel />}` line:
```typescript
        {activeTab === 'graph' && <GraphView />}
```

- [ ] **Step 3: Run all tests**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npx vitest run
```

Expected: all previous tests pass (GraphView has no unit tests — it's a D3 visual component)

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add D3 force-directed graph view in sidebar"
```

---

## Task 10: Final Integration & Push

- [ ] **Step 1: Run all tests**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npx vitest run
```

Expected: 29+ tests passing across 9 test files

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit -p tsconfig.web.json 2>&1 | grep -v "node_modules" | head -20
```

Fix any errors that appear in our source files (not node_modules).

- [ ] **Step 3: Start dev app and smoke test**

```bash
npm run dev
```

Verify:
1. Open a vault with multiple linked `.md` files
2. `[[links]]` are highlighted purple in editor, clicking opens the linked note
3. Type `[[` → autocomplete appears with file names
4. Right sidebar shows backlinks for the active note
5. Left sidebar Search tab → type a query → results appear, click to open
6. `⌘K` → Command Palette opens, type to filter, Enter/click to open
7. Left sidebar Graph tab → nodes visible, draggable, click opens note

- [ ] **Step 4: Commit and push**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && git add -A && git commit -m "feat: Phase 2 complete — wiki-links, backlinks, search, command palette, graph view" && git push
```

---

## Self-Review

**Spec coverage:**
- ✅ `[[wiki-link]]` parsing → Tasks 1, 2, 5
- ✅ Wiki-link autocomplete → Task 5
- ✅ Backlinks panel → Task 6
- ✅ D3 graph view → Task 9
- ✅ Full-text search (MiniSearch) → Tasks 3, 4, 8
- ✅ Command Palette (⌘K) → Task 7
- ✅ Tags — parsed and shown in backlinks panel → Tasks 1, 2, 6

**Not in Phase 2:**
- Themes, daily notes, templates → Phase 3
- Plugin system → Phase 4
- Canvas → Phase 5

**Type consistency check:**
- `useLinkStore.backlinks(path)` — function, called with path ✅
- `useLinkStore.outlinks(path)` — function, called with path in GraphView ✅
- `SearchResult.path` and `.name` — used consistently in SearchPanel ✅
- `LinkIndex.update(path, content, vaultPath)` — matches test calls ✅
- `createMarkdownExtensions(onChange, onLinkClick, getFileNames)` — three params, EditorPane passes all three ✅
