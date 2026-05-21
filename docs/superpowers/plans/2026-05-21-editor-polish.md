# Editor Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three targeted improvements: tab persistence across restarts, resizable editor/preview split, and keyboard shortcuts for markdown formatting.

**Architecture:** Tab persistence uses localStorage keyed by vault path, restored in `useVaultBridge.initVault`. The resizable split is a draggable divider inside `SinglePaneArea` with ratio stored in localStorage. Keyboard shortcuts are a CodeMirror keymap extension.

**Tech Stack:** React, Zustand, CodeMirror 6, localStorage, TypeScript

---

## What already works (do NOT re-implement)
- File CRUD (create/rename/delete/move) — wired in Sidebar → FileTree → useVaultBridge
- Full-text search — MiniSearch in SearchPanel/useLinkStore
- livePreviewExtension.ts — already deleted from git

---

### Task 1: Tab persistence

**Files:**
- Modify: `meridian/src/renderer/src/hooks/useVaultBridge.ts` (initVault, ~line 96)
- Create: `meridian/src/renderer/src/hooks/useSessionPersist.ts`
- Modify: `meridian/src/renderer/src/App.tsx` (mount the hook)

The strategy: save `{tabs: [{path, name}], activeTabPath}` to `localStorage['meridian-tabs-<vaultPath>']` whenever tabs change. On vault load, restore tabs by re-opening each file.

- [ ] **Step 1: Create `useSessionPersist.ts`**

```ts
import { useEffect } from 'react'
import { useVaultStore } from '../store/useVaultStore'
import { useVaultBridge } from './useVaultBridge'

const STORAGE_KEY = (vaultPath: string) => `meridian-tabs-${vaultPath}`

export function useSessionPersist() {
  const { openFile } = useVaultBridge()

  // Save tabs whenever they change
  useEffect(() => {
    return useVaultStore.subscribe((state) => {
      const vault = state.vault
      if (!vault) return
      const activePane = state.panes.find((p) => p.id === state.activePaneId) ?? state.panes[0]
      if (!activePane) return
      const session = {
        tabs: activePane.openTabs.map((t) => ({ path: t.path, name: t.name })),
        activeTabPath: activePane.activeTabPath
      }
      try {
        localStorage.setItem(STORAGE_KEY(vault.path), JSON.stringify(session))
      } catch {
        // Ignore storage errors
      }
    })
  }, [])

  // Restore is called externally from initVault
  return { restoreSession }
}

export function restoreSession(vaultPath: string, openFileFn: (path: string, name: string) => Promise<void>) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(vaultPath))
    if (!raw) return
    const session = JSON.parse(raw) as { tabs: { path: string; name: string }[]; activeTabPath: string | null }
    const tabs = session.tabs ?? []
    // Open all tabs sequentially; setActiveTab for the one that was active
    Promise.resolve().then(async () => {
      for (const tab of tabs) {
        await openFileFn(tab.path, tab.name)
      }
      if (session.activeTabPath) {
        useVaultStore.getState().setActiveTab(session.activeTabPath)
      }
    })
  } catch {
    // Ignore malformed session
  }
}
```

- [ ] **Step 2: Call `restoreSession` inside `initVault` in `useVaultBridge.ts`**

Find the `initVault` callback (around line 95). After `setFiles(files)` and the indexing loop, add:

```ts
import { restoreSession } from './useSessionPersist'

// At the end of initVault, after indexing:
restoreSession(config.path, openFile)
```

Full import at top of file:
```ts
import { restoreSession } from './useSessionPersist'
```

And inside `initVault` callback, after the indexing for-loop that ends around line 112:
```ts
restoreSession(config.path, openFile)
```

- [ ] **Step 3: Mount `useSessionPersist` in `App.tsx`**

Find `App.tsx`. Add the hook to the top-level component:

```tsx
import { useSessionPersist } from './hooks/useSessionPersist'

// Inside the App component:
useSessionPersist()
```

- [ ] **Step 4: Verify it works**

Run: `cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm run dev`

Open two files, close the app (Cmd+Q), reopen — both tabs should be restored.

- [ ] **Step 5: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
git add src/renderer/src/hooks/useSessionPersist.ts src/renderer/src/hooks/useVaultBridge.ts src/renderer/src/App.tsx
git commit -m "feat: persist open tabs across restarts per vault"
```

---

### Task 2: Resizable editor/preview split

**Files:**
- Modify: `meridian/src/renderer/src/components/Editor/EditorPane.tsx` (SinglePaneArea, lines 616–648)

Add a draggable divider between the CodeMirror editor div and `MarkdownPreview`. Store ratio in `localStorage['meridian-split-ratio']`.

- [ ] **Step 1: Add split state and helpers inside `SinglePaneArea`**

At the top of `SinglePaneArea` (after other useState declarations, around line 284):

```tsx
const SPLIT_KEY = 'meridian-split-ratio'
const [splitRatio, setSplitRatio] = React.useState<number>(() => {
  try {
    const v = localStorage.getItem(SPLIT_KEY)
    return v ? Math.max(0.2, Math.min(0.8, parseFloat(v))) : 0.5
  } catch {
    return 0.5
  }
})

const containerRef2 = useRef<HTMLDivElement>(null)

const startSplitDrag = React.useCallback((e: React.MouseEvent) => {
  e.preventDefault()
  const container = containerRef2.current
  if (!container) return
  const startX = e.clientX
  const startRatio = splitRatio

  const onMove = (mv: MouseEvent) => {
    const rect = container.getBoundingClientRect()
    const newRatio = Math.max(0.2, Math.min(0.8, (mv.clientX - rect.left) / rect.width))
    setSplitRatio(newRatio)
    try { localStorage.setItem(SPLIT_KEY, String(newRatio)) } catch {}
  }
  const onUp = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}, [splitRatio])
```

Note: `startX` and `startRatio` are unused but harmless — remove them if TypeScript warns:
```tsx
const startSplitDrag = React.useCallback((e: React.MouseEvent) => {
  e.preventDefault()
  const container = containerRef2.current
  if (!container) return

  const onMove = (mv: MouseEvent) => {
    const rect = container.getBoundingClientRect()
    const newRatio = Math.max(0.2, Math.min(0.8, (mv.clientX - rect.left) / rect.width))
    setSplitRatio(newRatio)
    try { localStorage.setItem(SPLIT_KEY, String(newRatio)) } catch {}
  }
  const onUp = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}, [])
```

- [ ] **Step 2: Replace the editor+preview layout with split version**

Find the JSX starting at line 616 that looks like:
```tsx
<div
  ref={containerRef}
  onDragOver={handleEditorDragOver}
  onDrop={handleEditorDrop}
  style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}
>
  <div
    ref={editorRef}
    onContextMenu={handleContextMenu}
    style={{ flex: 1, overflow: 'auto', height: '100%', background: 'var(--bg-tertiary)' }}
  />
  {activeTab && (
    <>
      <div style={{ width: 1, background: 'var(--border-color)' }} />
      <MarkdownPreview ... />
    </>
  )}
  {contextMenu && (
    <EditorContextMenu ... />
  )}
</div>
```

Replace with:
```tsx
<div
  ref={(el) => {
    ;(containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el
    ;(containerRef2 as React.MutableRefObject<HTMLDivElement | null>).current = el
  }}
  onDragOver={handleEditorDragOver}
  onDrop={handleEditorDrop}
  style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}
>
  <div
    ref={editorRef}
    onContextMenu={handleContextMenu}
    style={{
      width: activeTab ? `${splitRatio * 100}%` : '100%',
      flexShrink: 0,
      overflow: 'auto',
      height: '100%',
      background: 'var(--bg-tertiary)'
    }}
  />
  {activeTab && (
    <>
      <div
        onMouseDown={startSplitDrag}
        style={{
          width: 5,
          flexShrink: 0,
          cursor: 'col-resize',
          background: 'var(--border-color)',
          transition: 'background 0.15s'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-color)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--border-color)')}
      />
      <MarkdownPreview
        content={activeTab.content}
        onLinkClick={handleLinkClick}
        fontSize={fontSize}
        lineWidth={lineWidth}
        readableLineLength={readableLineLength}
        vaultPath={vault?.path}
      />
    </>
  )}
  {contextMenu && (
    <EditorContextMenu
      x={contextMenu.x}
      y={contextMenu.y}
      onClose={() => setContextMenu(null)}
      view={viewRef.current}
      containerEl={containerRef.current}
    />
  )}
</div>
```

Note: `containerRef` and `containerRef2` point to the same element. Simplify by using one ref for both — replace the `ref={(el) => {...}}` with just `ref={containerRef}` and change the `startSplitDrag` to read from `containerRef` directly:

```tsx
// Simplified: use containerRef for both drag and drop context
const startSplitDrag = React.useCallback((e: React.MouseEvent) => {
  e.preventDefault()
  const container = containerRef.current
  if (!container) return

  const onMove = (mv: MouseEvent) => {
    const rect = container.getBoundingClientRect()
    const newRatio = Math.max(0.2, Math.min(0.8, (mv.clientX - rect.left) / rect.width))
    setSplitRatio(newRatio)
    try { localStorage.setItem(SPLIT_KEY, String(newRatio)) } catch {}
  }
  const onUp = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}, [])
```

Final editor+preview JSX (no `containerRef2`):
```tsx
<div
  ref={containerRef}
  onDragOver={handleEditorDragOver}
  onDrop={handleEditorDrop}
  style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}
>
  <div
    ref={editorRef}
    onContextMenu={handleContextMenu}
    style={{
      width: activeTab ? `${splitRatio * 100}%` : '100%',
      flexShrink: 0,
      overflow: 'auto',
      height: '100%',
      background: 'var(--bg-tertiary)'
    }}
  />
  {activeTab && (
    <>
      <div
        onMouseDown={startSplitDrag}
        style={{
          width: 5,
          flexShrink: 0,
          cursor: 'col-resize',
          background: 'var(--border-color)',
          transition: 'background 0.15s'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-color)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--border-color)')}
      />
      <MarkdownPreview
        content={activeTab.content}
        onLinkClick={handleLinkClick}
        fontSize={fontSize}
        lineWidth={lineWidth}
        readableLineLength={readableLineLength}
        vaultPath={vault?.path}
      />
    </>
  )}
  {contextMenu && (
    <EditorContextMenu
      x={contextMenu.x}
      y={contextMenu.y}
      onClose={() => setContextMenu(null)}
      view={viewRef.current}
      containerEl={containerRef.current}
    />
  )}
</div>
```

- [ ] **Step 3: Verify the split drag works**

Run: `cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm run dev`

Open a file. Drag the purple divider between editor and preview — both panels should resize. Restart and confirm ratio persists.

- [ ] **Step 4: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
git add src/renderer/src/components/Editor/EditorPane.tsx
git commit -m "feat: resizable editor/preview split with persisted ratio"
```

---

### Task 3: Keyboard shortcuts for markdown formatting

**Files:**
- Create: `meridian/src/renderer/src/components/Editor/extensions/markdownKeymap.ts`
- Modify: `meridian/src/renderer/src/components/Editor/extensions/markdownExtensions.ts`

Add Cmd+B (bold), Cmd+I (italic), Cmd+` (inline code), Cmd+Shift+K (wiki link).

- [ ] **Step 1: Create `markdownKeymap.ts`**

```ts
import { KeyBinding } from '@codemirror/view'
import { EditorView } from '@codemirror/view'

function wrapSelection(view: EditorView, before: string, after: string, placeholder: string): boolean {
  const { state, dispatch } = view
  const sel = state.selection.main
  const hasSelection = sel.from !== sel.to
  const selectedText = hasSelection ? state.sliceDoc(sel.from, sel.to) : placeholder

  const already =
    hasSelection &&
    state.sliceDoc(Math.max(0, sel.from - before.length), sel.from) === before &&
    state.sliceDoc(sel.to, Math.min(state.doc.length, sel.to + after.length)) === after

  if (already) {
    // Unwrap
    dispatch(
      state.update({
        changes: [
          { from: sel.from - before.length, to: sel.from, insert: '' },
          { from: sel.to, to: sel.to + after.length, insert: '' }
        ],
        selection: { anchor: sel.from - before.length, head: sel.to - before.length }
      })
    )
  } else {
    const insert = `${before}${selectedText}${after}`
    dispatch(
      state.update({
        changes: { from: sel.from, to: sel.to, insert },
        selection: hasSelection
          ? { anchor: sel.from, head: sel.from + insert.length }
          : { anchor: sel.from + before.length, head: sel.from + before.length + placeholder.length }
      })
    )
  }
  return true
}

export const markdownKeymap: KeyBinding[] = [
  {
    key: 'Mod-b',
    run: (view) => wrapSelection(view, '**', '**', 'bold text')
  },
  {
    key: 'Mod-i',
    run: (view) => wrapSelection(view, '*', '*', 'italic text')
  },
  {
    key: 'Mod-`',
    run: (view) => wrapSelection(view, '`', '`', 'code')
  },
  {
    key: 'Mod-Shift-k',
    run: (view) => wrapSelection(view, '[[', ']]', 'Note Name')
  }
]
```

- [ ] **Step 2: Import and add to `markdownExtensions.ts`**

Add import at top (after existing imports):
```ts
import { markdownKeymap } from './markdownKeymap'
```

Find the `keymap.of([...])` call in `createMarkdownExtensions` (around line 139):
```ts
keymap.of([
  ...closeBracketsKeymap,
  ...defaultKeymap,
  ...searchKeymap,
  ...historyKeymap,
  ...foldKeymap,
  ...completionKeymap,
  ...lintKeymap
]),
```

Replace with:
```ts
keymap.of([
  ...markdownKeymap,
  ...closeBracketsKeymap,
  ...defaultKeymap,
  ...searchKeymap,
  ...historyKeymap,
  ...foldKeymap,
  ...completionKeymap,
  ...lintKeymap
]),
```

- [ ] **Step 3: Verify shortcuts work**

Run: `cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm run dev`

Open a file, type some text, select it, press:
- Cmd+B → wraps in `**...**`
- Cmd+I → wraps in `*...*`
- Cmd+` → wraps in `` `...` ``
- Cmd+Shift+K → wraps in `[[...]]`
- Press again → unwraps

- [ ] **Step 4: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
git add src/renderer/src/components/Editor/extensions/markdownKeymap.ts src/renderer/src/components/Editor/extensions/markdownExtensions.ts
git commit -m "feat: keyboard shortcuts for markdown formatting (Cmd+B/I/\`/Shift+K)"
```
