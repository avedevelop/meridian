# Meridian Phase 4: Content & Organization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add folder creation, daily notes (⌘D), image paste with preview, and a vault-wide tags browser to the right panel.

**Architecture:** Folder creation reuses the existing `VaultManager.createDirectory` backend, adding one IPC channel. Daily notes use a new `openDailyNote` bridge function that creates `Daily/YYYY-MM-DD.md` via the existing file IPC. Image paste is a CodeMirror extension that intercepts clipboard images, saves them via a new `vault:write-binary` IPC, then inserts markdown; preview renders them via a `vault://` Electron custom protocol registered at startup. The tags browser is a second tab in the right panel alongside BacklinksPanel.

**Tech Stack:** Electron `protocol.handle` + `net.fetch` (custom vault:// protocol), Electron 39 IPC, CodeMirror 6 domEventHandlers, existing Zustand stores.

---

## File Structure

```
src/
  main/
    index.ts              MODIFY: register vault:// protocol, import getVaultManager
    ipc.ts                MODIFY: add VAULT_CREATE_DIR + VAULT_WRITE_BINARY handlers
  shared/
    types.ts              MODIFY: add VAULT_CREATE_DIR, VAULT_WRITE_BINARY IPC constants
  preload/
    index.ts              MODIFY: expose createDir + writeBinary on window.vault
  renderer/src/
    hooks/
      useVaultBridge.ts   MODIFY: add createFolder, saveImage, openDailyNote
    components/
      Sidebar/
        FileTree.tsx       MODIFY: context menu for directories (New Folder, New Note)
      Editor/
        extensions/
          imagePaste.ts    CREATE: CM6 extension that intercepts paste clipboard images
        EditorPane.tsx     MODIFY: wire saveImage into extensions
        MarkdownPreview.tsx MODIFY: rewrite relative img src to vault:// URLs
      RightPanel/
        RightPanel.tsx     CREATE: tabbed wrapper (Backlinks | Tags)
        TagsPanel.tsx      CREATE: vault-wide tags list with note counts
        BacklinksPanel.tsx no change
    App.tsx               MODIFY: ⌘D shortcut, pass openDailyNote; swap rightPanel to <RightPanel>
```

---

## Task 1: Folder Creation IPC + Bridge + UI

**Files:**
- Modify: `meridian/src/shared/types.ts`
- Modify: `meridian/src/main/ipc.ts`
- Modify: `meridian/src/preload/index.ts`
- Modify: `meridian/src/renderer/src/hooks/useVaultBridge.ts`
- Modify: `meridian/src/renderer/src/components/Sidebar/FileTree.tsx`

`VaultManager.createDirectory(parentDir, name)` already exists in `src/main/vault.ts`. We just need the IPC plumbing and UI.

- [ ] **Step 1: Add IPC constant to types.ts**

Read `meridian/src/shared/types.ts`. Add after `VAULT_CREATE_FILE`:

```typescript
  VAULT_CREATE_DIR: 'vault:create-dir',
```

- [ ] **Step 2: Add IPC handler to ipc.ts**

Read `meridian/src/main/ipc.ts`. Add after the `VAULT_CREATE_FILE` handler:

```typescript
  ipcMain.handle(IPC.VAULT_CREATE_DIR, async (_event, parentDir: string, name: string) => {
    if (!vaultManager) throw new Error('No vault open')
    return vaultManager.createDirectory(parentDir, name)
  })
```

- [ ] **Step 3: Expose in preload**

Read `meridian/src/preload/index.ts`. Add to `vaultAPI` after `createFile`:

```typescript
  createDir: (parentDir: string, name: string): Promise<string> =>
    ipcRenderer.invoke(IPC.VAULT_CREATE_DIR, parentDir, name),
```

- [ ] **Step 4: Add Window type + createFolder in useVaultBridge**

Read `meridian/src/renderer/src/hooks/useVaultBridge.ts`.

In the `Window.vault` type declaration, add after `createFile`:
```typescript
      createDir: (parentDir: string, name: string) => Promise<string>
```

Add `createFolder` callback after `createFile`:
```typescript
  const createFolder = useCallback(async (parentDir: string) => {
    const name = window.prompt('Folder name:')
    if (!name?.trim()) return
    try {
      await window.vault.createDir(parentDir, name.trim())
      await refreshFiles()
    } catch (e) {
      console.error('[Bridge] createFolder error', e)
    }
  }, [refreshFiles])
```

Add `createFolder` to the return:
```typescript
  return { openVault, refreshFiles, openFile, saveFile, createFile, createFolder, renameFile, deleteFile, openVaultByPath, openDailyNote }
```

Wait — `openDailyNote` is added in Task 2. For now the return is:
```typescript
  return { openVault, refreshFiles, openFile, saveFile, createFile, createFolder, renameFile, deleteFile, openVaultByPath }
```

- [ ] **Step 5: Enable context menu for directories in FileTree**

Read `meridian/src/renderer/src/components/Sidebar/FileTree.tsx`.

Add `onNewFolder?: (parentDir: string) => void` to `FileTreeProps` interface:
```typescript
interface FileTreeProps {
  files: VaultFile[]
  onFileClick: (path: string, name: string) => void
  onRename?: (oldPath: string, newName: string) => void
  onDelete?: (path: string) => void
  onNewFolder?: (parentDir: string) => void
  vaultPath: string
  depth?: number
}
```

Update the component signature to destructure it:
```typescript
export function FileTree({ files, onFileClick, onRename, onDelete, onNewFolder, vaultPath, depth = 0 }: FileTreeProps) {
```

Update `handleContextMenu` — remove the `if (file.isDirectory) return` guard so directories get a menu too:
```typescript
  const handleContextMenu = (e: React.MouseEvent, file: VaultFile) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, file })
  }
```

Update the `ContextMenu` items to be conditional on `file.isDirectory`:
```typescript
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={
            contextMenu.file.isDirectory
              ? [
                  {
                    label: 'New Folder',
                    onClick: () => onNewFolder?.(contextMenu.file.path),
                  },
                  {
                    label: 'New Note',
                    onClick: () => {
                      const name = window.prompt('Note name:')
                      if (name?.trim()) onFileClick(contextMenu.file.path, name.trim())
                    },
                  },
                ]
              : [
                  {
                    label: 'Rename',
                    onClick: () => {
                      setEditing(contextMenu.file.path)
                      setEditValue(contextMenu.file.name)
                    },
                  },
                  {
                    label: 'Delete',
                    danger: true,
                    onClick: () => {
                      if (window.confirm(`Delete "${contextMenu.file.name}"? This cannot be undone.`)) {
                        onDelete?.(contextMenu.file.path)
                      }
                    },
                  },
                ]
          }
        />
      )}
```

Also pass `onNewFolder` to recursive `<FileTree>` instances:
```typescript
            <FileTree
              files={file.children}
              onFileClick={onFileClick}
              onRename={onRename}
              onDelete={onDelete}
              onNewFolder={onNewFolder}
              vaultPath={vaultPath}
              depth={depth + 1}
            />
```

- [ ] **Step 6: Wire createFolder from Sidebar**

Read `meridian/src/renderer/src/components/Sidebar/Sidebar.tsx`.

Add `createFolder` to the destructured `useVaultBridge()`:
```typescript
  const { openFile, createFile, createFolder, openVault, renameFile, deleteFile } = useVaultBridge()
```

Add `onNewFolder={createFolder}` to `<FileTree>`:
```typescript
<FileTree files={files} onFileClick={openFile} onRename={renameFile} onDelete={deleteFile} onNewFolder={createFolder} vaultPath={vault.path} />
```

- [ ] **Step 7: Typecheck and commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm run typecheck 2>&1 | grep -v node_modules | grep "error TS" | head -10
```

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && git add -A && git commit -m "feat: folder creation via right-click context menu on directories"
```

---

## Task 2: Daily Notes (⌘D)

**Files:**
- Modify: `meridian/src/renderer/src/hooks/useVaultBridge.ts`
- Modify: `meridian/src/renderer/src/App.tsx`

Daily notes live at `{vault}/Daily/YYYY-MM-DD.md`. Creating the `Daily/` directory uses the `createDir` IPC from Task 1.

- [ ] **Step 1: Add openDailyNote to useVaultBridge**

Read `meridian/src/renderer/src/hooks/useVaultBridge.ts`.

Add after `createFolder`:

```typescript
  const openDailyNote = useCallback(async () => {
    const vault = useVaultStore.getState().vault
    if (!vault) return

    const today = new Date().toISOString().split('T')[0]  // "2026-05-19"
    const fileName = `${today}.md`
    const dailyDir = `${vault.path}/Daily`
    const fullPath = `${dailyDir}/${fileName}`

    // Check if already indexed
    const existing = useLinkStore.getState().allFiles().find(f => f === fullPath)
    if (existing) {
      await openFile(existing, fileName)
      return
    }

    // Ensure Daily/ dir exists, then create the note
    try {
      await window.vault.createDir(vault.path, 'Daily')
    } catch {}  // already exists — ok

    try {
      const filePath = await window.vault.createFile(dailyDir, fileName)
      const vaultPath = vault.path
      useLinkStore.getState().indexFile(filePath, fileName, '', vaultPath)
      await refreshFiles()
      await openFile(filePath, fileName)
    } catch (e) {
      console.error('[Bridge] openDailyNote error', e)
    }
  }, [openFile, refreshFiles])
```

Add `openDailyNote` to the return:
```typescript
  return { openVault, refreshFiles, openFile, saveFile, createFile, createFolder, renameFile, deleteFile, openVaultByPath, openDailyNote }
```

- [ ] **Step 2: Add ⌘D shortcut in App.tsx**

Read `meridian/src/renderer/src/App.tsx`.

Add `openDailyNote` to the destructured `useVaultBridge()` call. Currently:
```typescript
  const { openFile } = useVaultBridge()
  ...
  const { openVault } = useVaultBridge()
```

This calls `useVaultBridge()` twice — that's fine but slightly wasteful. Merge them OR just add another call:
```typescript
  const { openDailyNote } = useVaultBridge()
```

In the keydown handler, add after the `,` handler:
```typescript
        if (e.key === 'd') { e.preventDefault(); openDailyNote() }
```

So the full keydown block becomes:
```typescript
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'k') { e.preventDefault(); setPaletteOpen(open => !open) }
        if (e.key === 'o') { e.preventDefault(); openVault() }
        if (e.key === ',') { e.preventDefault(); setSettingsOpen(open => !open) }
        if (e.key === 'd') { e.preventDefault(); openDailyNote() }
      }
    }
```

- [ ] **Step 3: Typecheck and commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm run typecheck 2>&1 | grep -v node_modules | grep "error TS" | head -10
```

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && git add -A && git commit -m "feat: daily notes via ⌘D — opens or creates Daily/YYYY-MM-DD.md"
```

---

## Task 3: Image Paste

**Files:**
- Modify: `meridian/src/shared/types.ts`
- Modify: `meridian/src/main/ipc.ts`
- Modify: `meridian/src/preload/index.ts`
- Modify: `meridian/src/main/index.ts`
- Modify: `meridian/src/renderer/src/hooks/useVaultBridge.ts`
- Create: `meridian/src/renderer/src/components/Editor/extensions/imagePaste.ts`
- Modify: `meridian/src/renderer/src/components/Editor/extensions/markdownExtensions.ts`
- Modify: `meridian/src/renderer/src/components/Editor/EditorPane.tsx`
- Modify: `meridian/src/renderer/src/components/Editor/MarkdownPreview.tsx`

### Sub-step A: Backend IPC for binary file writing

- [ ] **Step 1: Add IPC constant**

Read `meridian/src/shared/types.ts`. Add after `VAULT_CREATE_DIR`:
```typescript
  VAULT_WRITE_BINARY: 'vault:write-binary',
```

- [ ] **Step 2: Add IPC handler**

Read `meridian/src/main/ipc.ts`. At the top, `writeFile` is already imported from `'fs/promises'` (it's used in `VaultManager`). Check the existing imports — if `writeFile` isn't directly imported in `ipc.ts`, use `vaultManager.writeFileBinary(...)`. 

Actually, add a helper using `Buffer` directly in the handler. Add after `VAULT_CREATE_DIR` handler:

```typescript
  ipcMain.handle(IPC.VAULT_WRITE_BINARY, async (_event, filePath: string, base64: string) => {
    if (!vaultManager) throw new Error('No vault open')
    // Use VaultManager's path guard by checking the vault path manually
    const { resolve: resolvePath, sep } = await import('path')
    const resolved = resolvePath(filePath)
    const vaultResolved = resolvePath(vaultManager.vaultPath)
    if (!resolved.startsWith(vaultResolved + sep)) throw new Error('Path outside vault')
    const { writeFile: writeFileFn } = await import('fs/promises')
    const { mkdirSync } = await import('fs')
    const dir = resolvePath(filePath, '..')
    mkdirSync(dir, { recursive: true })
    await writeFileFn(filePath, Buffer.from(base64, 'base64'))
    return filePath
  })
```

- [ ] **Step 3: Expose in preload**

Read `meridian/src/preload/index.ts`. Add to `vaultAPI` after `createDir`:
```typescript
  writeBinary: (filePath: string, base64: string): Promise<string> =>
    ipcRenderer.invoke(IPC.VAULT_WRITE_BINARY, filePath, base64),
```

### Sub-step B: vault:// protocol for serving local vault files

- [ ] **Step 4: Register vault:// protocol in main/index.ts**

Read `meridian/src/main/index.ts`. 

Add to the imports at the top:
```typescript
import { app, BrowserWindow, shell, protocol, net } from 'electron'
import { join, resolve as resolvePath } from 'path'
import { getVaultManager } from './ipc'
```

In `app.whenReady().then(() => { ... })`, add the protocol registration BEFORE `registerIpcHandlers(settings)`:

```typescript
app.whenReady().then(() => {
  // Serve vault assets via vault:// custom protocol
  protocol.handle('vault', (request) => {
    const url = new URL(request.url)
    const relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, '')
    const vm = getVaultManager()
    if (!vm) return new Response('No vault open', { status: 503 })
    const fullPath = resolvePath(vm.vaultPath, relativePath)
    // Security: ensure path stays inside vault
    if (!fullPath.startsWith(resolvePath(vm.vaultPath))) {
      return new Response('Forbidden', { status: 403 })
    }
    return net.fetch(`file://${fullPath}`)
  })

  registerIpcHandlers(settings)
  createWindow()
  // ...
})
```

### Sub-step C: Renderer — saveImage bridge + image paste extension

- [ ] **Step 5: Add Window type + saveImage in useVaultBridge**

Read `meridian/src/renderer/src/hooks/useVaultBridge.ts`.

In the `Window.vault` type declaration, add after `createDir`:
```typescript
      writeBinary: (filePath: string, base64: string) => Promise<string>
```

Add `saveImage` callback after `createFolder`:
```typescript
  const saveImage = useCallback(async (base64: string, ext: string): Promise<string | null> => {
    const vault = useVaultStore.getState().vault
    if (!vault) return null
    const timestamp = Date.now()
    const fileName = `image-${timestamp}.${ext}`
    const assetsDir = `${vault.path}/assets`
    const filePath = `${assetsDir}/${fileName}`
    try {
      await window.vault.writeBinary(filePath, base64)
      await refreshFiles()
      return `assets/${fileName}`  // relative path for markdown
    } catch (e) {
      console.error('[Bridge] saveImage error', e)
      return null
    }
  }, [refreshFiles])
```

Add `saveImage` to the return:
```typescript
  return { openVault, refreshFiles, openFile, saveFile, createFile, createFolder, renameFile, deleteFile, openVaultByPath, openDailyNote, saveImage }
```

- [ ] **Step 6: Create imagePaste.ts CodeMirror extension**

Create `meridian/src/renderer/src/components/Editor/extensions/imagePaste.ts`:

```typescript
import { EditorView } from '@codemirror/view'
import { Extension } from '@codemirror/state'

export function imagePasteExtension(
  onImagePaste: (base64: string, ext: string) => Promise<string | null>
): Extension {
  return EditorView.domEventHandlers({
    paste(event, view) {
      const items = event.clipboardData?.items
      if (!items) return false

      for (const item of Array.from(items)) {
        if (!item.type.startsWith('image/')) continue
        event.preventDefault()

        const ext = item.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'
        const blob = item.getAsFile()
        if (!blob) continue

        const reader = new FileReader()
        reader.onload = async () => {
          const dataUrl = reader.result as string
          // Strip the data: header: "data:image/png;base64,<data>"
          const base64 = dataUrl.split(',')[1]
          if (!base64) return

          const relativePath = await onImagePaste(base64, ext)
          if (!relativePath) return

          const cursor = view.state.selection.main.head
          view.dispatch({
            changes: { from: cursor, to: cursor, insert: `![](${relativePath})` },
          })
        }
        reader.readAsDataURL(blob)
        return true  // consumed
      }
      return false
    },
  })
}
```

- [ ] **Step 7: Add imagePasteExtension to createMarkdownExtensions**

Read `meridian/src/renderer/src/components/Editor/extensions/markdownExtensions.ts`.

Add import at top:
```typescript
import { imagePasteExtension } from './imagePaste'
```

Add `onImagePaste` parameter to `createMarkdownExtensions`:
```typescript
export function createMarkdownExtensions(
  onChange?: (content: string) => void,
  onLinkClick?: (linkText: string) => void,
  getFileNames?: () => string[],
  fontSize = 15,
  lineWidth = 720,
  onImagePaste?: (base64: string, ext: string) => Promise<string | null>,
) {
```

Add the extension at the end of the returned array (before the closing `]`):
```typescript
    onImagePaste ? imagePasteExtension(onImagePaste) : [],
```

- [ ] **Step 8: Wire saveImage in EditorPane.tsx**

Read `meridian/src/renderer/src/components/Editor/EditorPane.tsx`.

Add `saveImage` to the imports from `useVaultBridge`:

Currently the file uses `useVaultBridge` like this:
```typescript
const { saveFile, openFile } = useVaultBridge()
```

Change to also include `saveImage`:
```typescript
const { saveFile, openFile, saveImage } = useVaultBridge()
```

Add a `handleImagePaste` callback after `handleLinkClick`:
```typescript
  const handleImagePaste = useCallback(async (base64: string, ext: string) => {
    return saveImage(base64, ext)
  }, [saveImage])
```

Update the `createMarkdownExtensions` call to pass `handleImagePaste` as the 6th argument:
```typescript
        extensions: createMarkdownExtensions(handleChange, handleLinkClick, stableGetFileNames, fontSize, lineWidth, handleImagePaste),
```

- [ ] **Step 9: Update MarkdownPreview to rewrite image src to vault://`

Read `meridian/src/renderer/src/components/Editor/MarkdownPreview.tsx`.

The component already receives `content` and runs it through the remark pipeline. After `postprocessWikiLinks`, add a step that rewrites relative image src attributes to use `vault://`.

Add a prop `vaultPath?: string` to the interface:
```typescript
interface MarkdownPreviewProps {
  content: string
  onLinkClick?: (linkText: string) => void
  fontSize?: number
  lineWidth?: number
  vaultPath?: string
}
```

Update the function signature:
```typescript
export function MarkdownPreview({ content, onLinkClick, fontSize = 15, lineWidth = 720, vaultPath }: MarkdownPreviewProps) {
```

Update the `useMemo` to also rewrite image paths:
```typescript
  const html = useMemo(() => {
    try {
      const sanitized = String(processor.processSync(content))
      const withLinks = postprocessWikiLinks(sanitized)
      if (!vaultPath) return withLinks
      // Rewrite relative img src to vault:// so Electron can serve the file
      return withLinks.replace(
        /(<img[^>]+src=")(?!https?:\/\/)(?!data:)(?!vault:\/\/)([^"]+)(")/g,
        (_m, pre, src, post) => `${pre}vault://${src}${post}`
      )
    } catch {
      return '<p>Preview error</p>'
    }
  }, [content, vaultPath])
```

- [ ] **Step 10: Pass vaultPath from EditorPane to MarkdownPreview**

Read `meridian/src/renderer/src/components/Editor/EditorPane.tsx`.

Add vault to the destructured useVaultStore:
```typescript
  const { openTabs, activeTabPath, markTabDirty, setTabContent, files: vaultFiles } = useVaultStore()
  const vault = useVaultStore(s => s.vault)
```

Pass `vaultPath` to `<MarkdownPreview>`:
```typescript
<MarkdownPreview
  content={activeTab.content}
  onLinkClick={handleLinkClick}
  fontSize={fontSize}
  lineWidth={lineWidth}
  vaultPath={vault?.path}
/>
```

- [ ] **Step 11: Typecheck and commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm run typecheck 2>&1 | grep -v node_modules | grep "error TS" | head -10
```

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && git add -A && git commit -m "feat: image paste — saves to vault/assets/, displays via vault:// protocol"
```

---

## Task 4: Tags Panel in Right Sidebar

**Files:**
- Create: `meridian/src/renderer/src/components/RightPanel/TagsPanel.tsx`
- Create: `meridian/src/renderer/src/components/RightPanel/RightPanel.tsx`
- Modify: `meridian/src/renderer/src/App.tsx`

The existing `BacklinksPanel` already shows per-note tags. This task adds a vault-wide tags browser as a second tab in the right panel. `useLinkStore().allTags()` returns `Map<string, string[]>` (tag → file paths). We call it on mount and refresh when `activeTabPath` changes (after saves).

- [ ] **Step 1: Create TagsPanel.tsx**

Create `meridian/src/renderer/src/components/RightPanel/TagsPanel.tsx`:

```typescript
import React, { useMemo } from 'react'
import { useLinkStore } from '../../store/useLinkStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'

export function TagsPanel() {
  const linkStore = useLinkStore()
  const { openFile } = useVaultBridge()

  const tags = useMemo(() => {
    const map = linkStore.allTags()
    const entries = Array.from(map.entries())
      .sort((a, b) => b[1].length - a[1].length)  // sort by file count desc
    return entries
  }, [linkStore])

  if (tags.length === 0) {
    return (
      <div style={{ padding: '12px', color: '#444', fontSize: 12 }}>
        No tags found. Use #tag in your notes.
      </div>
    )
  }

  return (
    <div style={{ padding: '8px 0', fontSize: 12 }}>
      {tags.map(([tag, files]) => (
        <details key={tag} style={{ borderBottom: '1px solid #222' }}>
          <summary style={{
            padding: '6px 12px', cursor: 'pointer', color: '#aaa',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            userSelect: 'none', listStyle: 'none',
          }}>
            <span style={{ color: '#7c6af7' }}>#{tag}</span>
            <span style={{ color: '#444', fontSize: 11 }}>{files.length}</span>
          </summary>
          <div style={{ paddingBottom: 4 }}>
            {files.map(filePath => {
              const name = filePath.split('/').pop() ?? ''
              return (
                <div
                  key={filePath}
                  onClick={() => openFile(filePath, name)}
                  style={{ padding: '3px 20px', cursor: 'pointer', color: '#777', fontSize: 11 }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#ccc')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#777')}
                >
                  {name.replace(/\.md$/, '')}
                </div>
              )
            })}
          </div>
        </details>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create RightPanel.tsx (tabbed wrapper)**

Create `meridian/src/renderer/src/components/RightPanel/RightPanel.tsx`:

```typescript
import React, { useState } from 'react'
import { BacklinksPanel } from './BacklinksPanel'
import { TagsPanel } from './TagsPanel'

type RightTab = 'backlinks' | 'tags'

export function RightPanel() {
  const [activeTab, setActiveTab] = useState<RightTab>('backlinks')

  const tabs: { id: RightTab; label: string }[] = [
    { id: 'backlinks', label: 'Links' },
    { id: 'tags', label: 'Tags' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', borderBottom: '1px solid #2a2a2a', flexShrink: 0,
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '6px 0', border: 'none', cursor: 'pointer', fontSize: 11,
              fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
              background: activeTab === tab.id ? '#1a1a1a' : 'transparent',
              color: activeTab === tab.id ? '#fff' : '#555',
              borderBottom: activeTab === tab.id ? '2px solid #7c6af7' : '2px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'backlinks' && <BacklinksPanel />}
        {activeTab === 'tags' && <TagsPanel />}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Swap rightPanel in App.tsx**

Read `meridian/src/renderer/src/App.tsx`.

Add import:
```typescript
import { RightPanel } from './components/RightPanel/RightPanel'
```

Replace `rightPanel={<BacklinksPanel />}` with:
```typescript
        rightPanel={<RightPanel />}
```

Remove the `BacklinksPanel` import since it's now used inside `RightPanel`:
```typescript
// Remove: import { BacklinksPanel } from './components/RightPanel/BacklinksPanel'
```

- [ ] **Step 4: Typecheck and commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm run typecheck 2>&1 | grep -v node_modules | grep "error TS" | head -10
```

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && git add -A && git commit -m "feat: tags panel in right sidebar — vault-wide tag browser with note counts"
```

---

## Self-Review

**Spec coverage:**
- ✅ Folder creation via right-click on directories → Task 1
- ✅ Daily notes ⌘D → Task 2
- ✅ Image paste → clipboard → vault/assets/ → preview via vault:// → Task 3
- ✅ Tags panel in right sidebar → Task 4

**Placeholder scan:** None — all code blocks are complete.

**Type consistency:**
- `createFolder(parentDir: string)` — called with `file.path` (directory path) ✅
- `saveImage(base64, ext)` returns `Promise<string | null>` — used in `handleImagePaste` ✅
- `imagePasteExtension(onImagePaste)` — `onImagePaste` type matches `saveImage` signature ✅
- `createMarkdownExtensions(onChange, onLinkClick, getFileNames, fontSize, lineWidth, onImagePaste)` — 6th param added, backwards compatible (optional with default undefined) ✅
- `MarkdownPreview` gains `vaultPath?: string` — optional, passed from EditorPane ✅
- `openDailyNote()` — uses `window.vault.createDir(vault.path, 'Daily')` which matches `createDir(parentDir, name)` in preload ✅
- `RightPanel` imports `BacklinksPanel` and `TagsPanel` — both exist in `RightPanel/` directory ✅
- `tags` in TagsPanel: `linkStore.allTags()` returns `Map<string, string[]>` — destructured as `[tag, files]` ✅

**Task dependencies (order matters):**
- Task 2 (daily notes) depends on Task 1's `VAULT_CREATE_DIR` IPC — implement Task 1 first
- Task 3 (image paste) adds a 6th param to `createMarkdownExtensions` — no dep on Tasks 1-2
- Task 4 (tags panel) is fully independent
