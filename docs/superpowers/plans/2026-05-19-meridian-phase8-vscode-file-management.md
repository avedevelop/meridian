# Meridian Phase 8: VS Code-Style File Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add VS Code-style file management: drag & drop to move files, Reveal in Finder / Copy Path context menu actions, file tree filter, collapse all, and breadcrumb navigation above the editor.

**Architecture:** Move files uses a new `vault:move-file` IPC (wraps `fs.rename` with path guard) and HTML5 drag-and-drop with a module-level variable to share drag source across recursive FileTree instances. Reveal in Finder uses a new `vault:reveal-file` IPC calling `shell.showItemInFolder`. File tree filter is managed in the Sidebar's Files tab — when active, flattens the tree and shows a filtered flat list. Collapse all uses a counter prop that triggers a `useEffect` reset of `expanded` state in FileTree. Breadcrumb is a standalone component inserted between the TabBar and editor, reading `activeTab.path` relative to `vault.path`.

**Tech Stack:** HTML5 Drag and Drop API, Electron `shell.showItemInFolder`, `navigator.clipboard.writeText`, existing Zustand stores, existing IPC patterns.

---

## File Structure

```
New:
  meridian/src/renderer/src/components/Editor/Breadcrumb.tsx
  meridian/tests/renderer/Breadcrumb.test.tsx

Modified:
  meridian/src/shared/types.ts                              — add VAULT_MOVE_FILE, VAULT_REVEAL_FILE
  meridian/src/main/vault.ts                                — add moveFile method
  meridian/src/main/ipc.ts                                  — add move + reveal handlers
  meridian/src/preload/index.ts                             — expose moveFile, revealFile
  meridian/src/renderer/src/hooks/useVaultBridge.ts         — add moveFile, revealFile
  meridian/src/renderer/src/components/Sidebar/FileTree.tsx — drag & drop, context menu additions, collapseKey
  meridian/src/renderer/src/components/Sidebar/Sidebar.tsx  — filter input, collapse button, pass new props
  meridian/src/renderer/src/components/Editor/EditorPane.tsx — insert Breadcrumb
```

---

## Task 1: Move Files via Drag & Drop

**Files:**
- Modify: `meridian/src/shared/types.ts`
- Modify: `meridian/src/main/vault.ts`
- Modify: `meridian/src/main/ipc.ts`
- Modify: `meridian/src/preload/index.ts`
- Modify: `meridian/src/renderer/src/hooks/useVaultBridge.ts`
- Modify: `meridian/src/renderer/src/components/Sidebar/FileTree.tsx`
- Modify: `meridian/src/renderer/src/components/Sidebar/Sidebar.tsx`

No unit tests — this is drag-and-drop UI. Manual verification.

- [ ] **Step 1: Add IPC constant**

Read `meridian/src/shared/types.ts`. Add after `VAULT_RENAME_FILE`:
```typescript
  VAULT_MOVE_FILE: 'vault:move-file',
```

- [ ] **Step 2: Add moveFile to VaultManager**

Read `meridian/src/main/vault.ts`. `basename` and `join` are already imported from `'path'`. `rename` is imported from `'fs/promises'`. Add after `renameFile`:

```typescript
  async moveFile(sourcePath: string, targetDir: string): Promise<string> {
    this.assertInsideVault(sourcePath)
    this.assertInsideVault(targetDir)
    const name = basename(sourcePath)
    const destPath = join(targetDir, name)
    this.assertInsideVault(destPath)
    if (sourcePath === destPath) return destPath
    await rename(sourcePath, destPath)
    return destPath
  }
```

- [ ] **Step 3: Add IPC handler**

Read `meridian/src/main/ipc.ts`. Add after the `VAULT_RENAME_FILE` handler:

```typescript
  ipcMain.handle(IPC.VAULT_MOVE_FILE, async (_event, sourcePath: string, targetDir: string) => {
    if (!vaultManager) throw new Error('No vault open')
    return vaultManager.moveFile(sourcePath, targetDir)
  })
```

- [ ] **Step 4: Expose in preload**

Read `meridian/src/preload/index.ts`. Add to `vaultAPI` after `renameFile`:

```typescript
  moveFile: (sourcePath: string, targetDir: string): Promise<string> =>
    ipcRenderer.invoke(IPC.VAULT_MOVE_FILE, sourcePath, targetDir),
```

- [ ] **Step 5: Add Window type + moveFile in useVaultBridge**

Read `meridian/src/renderer/src/hooks/useVaultBridge.ts`.

Add to Window.vault type declaration after `renameFile`:
```typescript
      moveFile: (sourcePath: string, targetDir: string) => Promise<string>
```

Add `moveFile` callback after `renameFile`:

```typescript
  const moveFile = useCallback(async (sourcePath: string, targetDir: string) => {
    try {
      const newPath = await window.vault.moveFile(sourcePath, targetDir)
      const name = newPath.split('/').pop() ?? ''
      // Update open tabs if the moved file was open
      const { openTabs, activeTabPath } = useVaultStore.getState()
      const wasActive = activeTabPath === sourcePath
      useVaultStore.setState({
        openTabs: openTabs.map(t =>
          t.path === sourcePath ? { ...t, path: newPath, name } : t
        ),
        activeTabPath: wasActive ? newPath : activeTabPath,
      })
      // Update link index: remove old path, add new path
      const vault = useVaultStore.getState().vault
      if (vault) {
        const tab = openTabs.find(t => t.path === sourcePath)
        useLinkStore.getState().removeFile(sourcePath, vault.path)
        useLinkStore.getState().indexFile(newPath, name, tab?.content ?? '', vault.path)
      }
      await refreshFiles()
    } catch (e) {
      console.error('[Bridge] moveFile error', e)
      window.alert(`Could not move file: ${e instanceof Error ? e.message : String(e)}`)
    }
  }, [refreshFiles])
```

Add `moveFile` to the return object.

- [ ] **Step 6: Add drag & drop to FileTree**

Read `meridian/src/renderer/src/components/Sidebar/FileTree.tsx`.

Add to `FileTreeProps` interface:
```typescript
  onMove?: (sourcePath: string, targetDir: string) => void
  collapseKey?: number
```

Update component signature to destructure them:
```typescript
export function FileTree({ files, onFileClick, onRename, onDelete, onNewFolder, onMove, collapseKey = 0, vaultPath, depth = 0 }: FileTreeProps) {
```

Add a `useEffect` right after the state declarations that collapses all when `collapseKey` increments:
```typescript
  useEffect(() => {
    setExpanded(new Set())
  }, [collapseKey])
```

Add a module-level variable (before the component, at the top of the file after imports) to share drag source across recursive instances:
```typescript
// Module-level drag state — shared across recursive FileTree instances
let dragSourcePath: string | null = null
```

In the file row `<div>` (the one that has `onClick`, `onDoubleClick`, `onContextMenu`), add these drag event handlers:

```typescript
            draggable={!file.isDirectory}
            onDragStart={e => {
              dragSourcePath = file.path
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData('text/plain', file.path)
            }}
            onDragEnd={() => { dragSourcePath = null }}
            onDragOver={e => {
              if (!file.isDirectory || !dragSourcePath || dragSourcePath === file.path) return
              e.preventDefault()
              e.currentTarget.style.background = '#2a2050'
            }}
            onDragLeave={e => {
              e.currentTarget.style.background = editing === file.path ? 'transparent' : ''
            }}
            onDrop={e => {
              e.preventDefault()
              e.currentTarget.style.background = ''
              if (!dragSourcePath || dragSourcePath === file.path) return
              if (file.isDirectory) {
                onMove?.(dragSourcePath, file.path)
              }
              dragSourcePath = null
            }}
```

Pass `onMove` and `collapseKey` to the recursive `<FileTree>` call:
```typescript
            <FileTree
              files={file.children}
              onFileClick={onFileClick}
              onRename={onRename}
              onDelete={onDelete}
              onNewFolder={onNewFolder}
              onMove={onMove}
              collapseKey={collapseKey}
              vaultPath={vaultPath}
              depth={depth + 1}
            />
```

- [ ] **Step 7: Wire from Sidebar**

Read `meridian/src/renderer/src/components/Sidebar/Sidebar.tsx`.

Add `moveFile` to the `useVaultBridge()` destructuring.

Add `collapseKey` state and a "collapse all" button in the sidebar header. Add to `<FileTree>`:
```typescript
<FileTree
  files={files}
  onFileClick={openFile}
  onRename={renameFile}
  onDelete={deleteFile}
  onNewFolder={createFolder}
  onMove={moveFile}
  collapseKey={collapseKey}
  vaultPath={vault.path}
/>
```

The `collapseKey` state will be added in Task 3. For now just pass `collapseKey={0}`.

- [ ] **Step 8: Typecheck and commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm run typecheck 2>&1 | grep -v node_modules | grep "error TS" | head -10
```

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && git add -A && git commit -m "feat: drag & drop to move files between folders"
```

---

## Task 2: Context Menu — Reveal in Finder + Copy Path

**Files:**
- Modify: `meridian/src/shared/types.ts`
- Modify: `meridian/src/main/ipc.ts`
- Modify: `meridian/src/preload/index.ts`
- Modify: `meridian/src/renderer/src/hooks/useVaultBridge.ts`
- Modify: `meridian/src/renderer/src/components/Sidebar/FileTree.tsx`
- Modify: `meridian/src/renderer/src/components/Sidebar/Sidebar.tsx`

- [ ] **Step 1: Add IPC constant**

Read `meridian/src/shared/types.ts`. Add after `VAULT_MOVE_FILE`:
```typescript
  VAULT_REVEAL_FILE: 'vault:reveal-file',
```

- [ ] **Step 2: Add IPC handler**

Read `meridian/src/main/ipc.ts`. `shell` is NOT yet imported in ipc.ts (it's in index.ts). Add `shell` to the electron import at the top:

Current import: `import { BrowserWindow, ipcMain, dialog } from 'electron'`
Change to: `import { BrowserWindow, ipcMain, dialog, shell } from 'electron'`

Add handler after `VAULT_MOVE_FILE`:

```typescript
  ipcMain.handle(IPC.VAULT_REVEAL_FILE, async (_event, filePath: string) => {
    shell.showItemInFolder(filePath)
  })
```

- [ ] **Step 3: Expose in preload**

Read `meridian/src/preload/index.ts`. Add to `vaultAPI` after `moveFile`:

```typescript
  revealFile: (filePath: string): Promise<void> =>
    ipcRenderer.invoke(IPC.VAULT_REVEAL_FILE, filePath),
```

- [ ] **Step 4: Add Window type + revealFile in useVaultBridge**

Read `meridian/src/renderer/src/hooks/useVaultBridge.ts`.

Add to Window.vault type:
```typescript
      revealFile: (filePath: string) => Promise<void>
```

Add `revealFile` callback after `moveFile`:

```typescript
  const revealFile = useCallback(async (path: string) => {
    try {
      await window.vault.revealFile(path)
    } catch (e) {
      console.error('[Bridge] revealFile error', e)
    }
  }, [])
```

Add `revealFile` to the return object.

- [ ] **Step 5: Add context menu items to FileTree**

Read `meridian/src/renderer/src/components/Sidebar/FileTree.tsx`.

Add `onReveal?: (path: string) => void` to `FileTreeProps`.

Update component signature to destructure it.

In the ContextMenu `items` for files (the non-directory branch), add two more items after "Delete":

```typescript
                  {
                    label: 'Reveal in Finder',
                    onClick: () => onReveal?.(contextMenu.file.path),
                  },
                  {
                    label: 'Copy Path',
                    onClick: () => {
                      navigator.clipboard.writeText(contextMenu.file.path).catch(console.error)
                    },
                  },
                  {
                    label: 'Copy Relative Path',
                    onClick: () => {
                      navigator.clipboard.writeText(contextMenu.file.relativePath).catch(console.error)
                    },
                  },
```

Also pass `onReveal` to recursive `<FileTree>` instances.

- [ ] **Step 6: Wire from Sidebar**

Read `meridian/src/renderer/src/components/Sidebar/Sidebar.tsx`. Add `revealFile` to `useVaultBridge()` destructuring and pass `onReveal={revealFile}` to `<FileTree>`.

- [ ] **Step 7: Typecheck and commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm run typecheck 2>&1 | grep -v node_modules | grep "error TS" | head -10
```

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && git add -A && git commit -m "feat: context menu — Reveal in Finder, Copy Path, Copy Relative Path"
```

---

## Task 3: File Tree Filter + Collapse All

**Files:**
- Modify: `meridian/src/renderer/src/components/Sidebar/Sidebar.tsx`
- Modify: `meridian/src/renderer/src/components/Sidebar/FileTree.tsx`

The filter lives in the Sidebar's Files tab. When the filter query is non-empty, a flattened filtered list of matching files is shown instead of the tree. Collapse all is a button that increments a counter passed to FileTree, which resets its `expanded` state.

- [ ] **Step 1: Add filter and collapseKey state in Sidebar**

Read `meridian/src/renderer/src/components/Sidebar/Sidebar.tsx`.

Add state (inside `Sidebar()` after `activeTab` state):
```typescript
  const [filterQuery, setFilterQuery] = useState('')
  const [collapseKey, setCollapseKey] = useState(0)
```

Add a helper to flatten and filter the file tree (place inside the component, before the return):

```typescript
  const filteredFiles = useMemo(() => {
    if (!filterQuery.trim()) return null
    const q = filterQuery.toLowerCase()
    const result: import('@shared/types').VaultFile[] = []
    function walk(items: import('@shared/types').VaultFile[]) {
      for (const f of items) {
        if (!f.isDirectory && f.name.toLowerCase().includes(q)) result.push(f)
        if (f.isDirectory && f.children) walk(f.children)
      }
    }
    walk(files)
    return result.slice(0, 100)
  }, [files, filterQuery])
```

Add `useMemo` import if not present (it's likely in the existing imports).

- [ ] **Step 2: Add filter input and collapse button to the sidebar Files header**

Read the current Files tab header section in `Sidebar.tsx` — it has a div with the vault name, a `⎆` button for openVault, etc.

After the vault name header div, add a filter input row:

```typescript
            <div style={{ padding: '4px 8px', borderBottom: '1px solid #2a2a2a', display: 'flex', gap: 4 }}>
              <input
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                placeholder="Filter files..."
                style={{
                  flex: 1, padding: '4px 8px', borderRadius: 4,
                  background: '#2a2a2a', border: 'none', outline: 'none',
                  color: '#ccc', fontSize: 12,
                }}
              />
              {filterQuery && (
                <button
                  onClick={() => setFilterQuery('')}
                  style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', padding: '0 4px' }}
                >
                  ×
                </button>
              )}
              <button
                onClick={() => setCollapseKey(k => k + 1)}
                title="Collapse all folders"
                style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', padding: '0 4px', fontSize: 12 }}
                onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
                onMouseLeave={e => (e.currentTarget.style.color = '#555')}
              >
                ⊟
              </button>
            </div>
```

- [ ] **Step 3: Use filteredFiles when filter is active**

In Sidebar, replace the `<FileTree>` render with a conditional:

```typescript
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
              {filteredFiles ? (
                // Flat filtered list
                filteredFiles.length === 0 ? (
                  <div style={{ padding: '8px 12px', color: '#444', fontSize: 12 }}>No files match.</div>
                ) : (
                  filteredFiles.map(f => (
                    <div
                      key={f.path}
                      onClick={() => openFile(f.path, f.name)}
                      style={{
                        padding: '3px 12px', cursor: 'pointer', color: '#ccc', fontSize: 13,
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#2a2a2a')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span style={{ flexShrink: 0 }}>📄</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {f.name}
                      </span>
                      <span style={{ color: '#444', fontSize: 11, flexShrink: 0 }}>
                        {f.relativePath.split('/').slice(0, -1).join('/')}
                      </span>
                    </div>
                  ))
                )
              ) : (
                <FileTree
                  files={files}
                  onFileClick={openFile}
                  onRename={renameFile}
                  onDelete={deleteFile}
                  onNewFolder={createFolder}
                  onMove={moveFile}
                  onReveal={revealFile}
                  collapseKey={collapseKey}
                  vaultPath={vault.path}
                />
              )}
            </div>
```

- [ ] **Step 4: Typecheck and commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm run typecheck 2>&1 | grep -v node_modules | grep "error TS" | head -10
```

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && git add -A && git commit -m "feat: file tree filter input + collapse all folders button"
```

---

## Task 4: Breadcrumb Navigation

**Files:**
- Create: `meridian/src/renderer/src/components/Editor/Breadcrumb.tsx`
- Create: `meridian/tests/renderer/Breadcrumb.test.tsx`
- Modify: `meridian/src/renderer/src/components/Editor/EditorPane.tsx`

- [ ] **Step 1: Write failing tests for getSegments**

Create `meridian/tests/renderer/Breadcrumb.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest'
import { getSegments } from '../../src/renderer/src/components/Editor/Breadcrumb'

describe('getSegments', () => {
  it('splits a relative path into segments', () => {
    expect(getSegments('Projects/Notes/ideas.md')).toEqual([
      { name: 'Projects', isLast: false },
      { name: 'Notes', isLast: false },
      { name: 'ideas.md', isLast: true },
    ])
  })

  it('handles a root-level file', () => {
    expect(getSegments('README.md')).toEqual([
      { name: 'README.md', isLast: true },
    ])
  })

  it('returns empty array for empty string', () => {
    expect(getSegments('')).toEqual([])
  })
})
```

Run to confirm fail:
```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npx vitest run tests/renderer/Breadcrumb.test.tsx 2>&1 | tail -8
```

- [ ] **Step 2: Create Breadcrumb.tsx**

Create `meridian/src/renderer/src/components/Editor/Breadcrumb.tsx`:

```typescript
import { useVaultStore } from '../../store/useVaultStore'

export interface BreadcrumbSegment {
  name: string
  isLast: boolean
}

export function getSegments(relativePath: string): BreadcrumbSegment[] {
  if (!relativePath) return []
  const parts = relativePath.split('/').filter(Boolean)
  return parts.map((name, i) => ({ name, isLast: i === parts.length - 1 }))
}

export function Breadcrumb() {
  const { openTabs, activeTabPath } = useVaultStore()
  const vault = useVaultStore(s => s.vault)
  const activeTab = openTabs.find(t => t.path === activeTabPath)

  if (!activeTab || !vault) return null

  const relativePath = activeTab.path.startsWith(vault.path + '/')
    ? activeTab.path.slice(vault.path.length + 1)
    : activeTab.name

  const segments = getSegments(relativePath)
  if (segments.length === 0) return null

  return (
    <div style={{
      height: 28, display: 'flex', alignItems: 'center',
      padding: '0 16px', gap: 4, flexShrink: 0,
      background: '#1a1a1a', borderBottom: '1px solid #2a2a2a',
      fontSize: 12, color: '#555', overflowX: 'auto', whiteSpace: 'nowrap',
    }}>
      <span style={{ color: '#444' }}>{vault.name}</span>
      {segments.map((seg, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: '#333' }}>/</span>
          <span style={{ color: seg.isLast ? '#aaa' : '#555' }}>{seg.name}</span>
        </span>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Run tests to confirm pass**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npx vitest run tests/renderer/Breadcrumb.test.tsx 2>&1 | tail -8
```

Expected: `Tests  3 passed (3)`

- [ ] **Step 4: Insert Breadcrumb into EditorPane**

Read `meridian/src/renderer/src/components/Editor/EditorPane.tsx`.

Add import at the top:
```typescript
import { Breadcrumb } from './Breadcrumb'
```

Find the return statement for the active tabs case (when `openTabs.length > 0`). It currently has:
```typescript
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <TabBar />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
```

Add `<Breadcrumb />` between `<TabBar />` and the editor/preview container:
```typescript
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <TabBar />
      <Breadcrumb />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
```

- [ ] **Step 5: Run all tests and typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npx vitest run 2>&1 | tail -6
npm run typecheck 2>&1 | grep -v node_modules | grep "error TS" | head -10
```

Expected: all tests pass, no new errors.

- [ ] **Step 6: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && git add -A && git commit -m "feat: breadcrumb navigation showing current file path above editor"
```

---

## Self-Review

**Spec coverage:**
- ✅ Drag & drop to move files — Task 1 (vault:move-file IPC + HTML5 DnD in FileTree)
- ✅ Reveal in Finder — Task 2 (vault:reveal-file IPC + context menu item)
- ✅ Copy Path / Copy Relative Path — Task 2 (context menu items, renderer-only clipboard)
- ✅ File tree filter — Task 3 (filter input, flat filtered list)
- ✅ Collapse all folders — Task 3 (collapseKey counter prop, ⊟ button)
- ✅ Breadcrumb navigation — Task 4 (Breadcrumb.tsx, inserted in EditorPane)

**Placeholder scan:** None found — all code blocks complete.

**Type consistency:**
- `FileTreeProps.onMove?: (sourcePath: string, targetDir: string) => void` — matches `moveFile` signature in bridge ✅
- `FileTreeProps.onReveal?: (path: string) => void` — matches `revealFile` signature ✅
- `FileTreeProps.collapseKey?: number` — initialized as `0`, incremented by `setCollapseKey(k => k + 1)` ✅
- `getSegments(relativePath: string): BreadcrumbSegment[]` — called in `Breadcrumb` with `activeTab.path.slice(...)` ✅
- `BreadcrumbSegment.isLast: boolean` — used to style the last segment ✅
- `moveFile(sourcePath, targetDir)` — `window.vault.moveFile` matches preload declaration ✅
- `revealFile(path)` — `window.vault.revealFile` matches preload declaration ✅

**Task order matters:**
- Task 1 adds `collapseKey` and `onMove` to FileTreeProps and `moveFile` to the return of useVaultBridge
- Task 2 adds `onReveal` to FileTreeProps and `revealFile` to the return
- Task 3 wires `collapseKey` properly (adds state) and uses both `moveFile` and `revealFile` — must come after Tasks 1 & 2
- Task 4 is independent
