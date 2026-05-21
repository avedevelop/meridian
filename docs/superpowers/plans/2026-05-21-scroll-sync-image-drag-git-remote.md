# Scroll Sync + Image Drag + Git Remote Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three UX improvements: editor/preview scroll sync, image drag-and-drop from Finder, and Git remote setup from the UI.

**Architecture:** Scroll sync uses a shared `syncingRef` lock and forwards the preview scroll container ref from `SinglePaneArea`. Image drag extends the existing drop handler with FileReader. Git remote adds one IPC handler (`git:set-remote`) and a setup UI in `GitPanel`.

**Tech Stack:** React, CodeMirror 6, Electron IPC, TypeScript

---

## Task 1: Scroll sync between editor and preview

**Files:**
- Modify: `meridian/src/renderer/src/components/Editor/MarkdownPreview.tsx` — accept forwarded ref
- Modify: `meridian/src/renderer/src/components/Editor/EditorPane.tsx` — sync scroll on CM scroll events

### Context

`SinglePaneArea` in `EditorPane.tsx` creates the CM view (`viewRef`) and renders `<MarkdownPreview>`. The preview has an internal `containerRef` that is its scroll container. To sync scroll, `SinglePaneArea` needs a ref to the preview's scroll div.

`MarkdownPreview` currently wraps `React.forwardRef` — check first. If not, convert it to forward its outer div ref.

The sync algorithm: on CM `scrollDOM` scroll, compute `ratio = scrollTop / max(1, scrollHeight - clientHeight)` and apply `preview.scrollTop = ratio * max(1, preview.scrollHeight - preview.clientHeight)`. A `syncingRef` boolean prevents feedback loops.

- [ ] **Step 1: Add `React.forwardRef` to `MarkdownPreview`**

Read `src/renderer/src/components/Editor/MarkdownPreview.tsx`.

The component currently ends with:
```tsx
export function MarkdownPreview({ ... }: MarkdownPreviewProps) {
  ...
  const containerRef = useRef<HTMLDivElement>(null)
  ...
  return (
    <div
      ref={containerRef}
      ...
    />
  )
}
```

Convert to forward the outer div ref so callers can attach to the scroll container:

```tsx
export const MarkdownPreview = React.forwardRef<HTMLDivElement, MarkdownPreviewProps>(
  function MarkdownPreview({ content, onLinkClick, fontSize = 15, lineWidth = 720, readableLineLength = true, vaultPath }, scrollRef) {
    const { fontFamily, fontWeight, lineHeight } = useSettingsStore()
    const { files } = useVaultStore()
    const containerRef = useRef<HTMLDivElement>(null)

    // Merge the forwarded ref with the internal containerRef
    const setRef = (el: HTMLDivElement | null) => {
      (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el
      if (typeof scrollRef === 'function') scrollRef(el)
      else if (scrollRef) scrollRef.current = el
    }

    // ... rest of component unchanged ...

    return (
      <div
        ref={setRef}
        className="markdown-preview"
        dangerouslySetInnerHTML={{ __html: html }}
        onClick={handleClick}
        style={{ ... }}
      />
    )
  }
)
```

- [ ] **Step 2: Add scroll sync in `SinglePaneArea` in `EditorPane.tsx`**

Read `src/renderer/src/components/Editor/EditorPane.tsx`.

Add these refs inside `SinglePaneArea` (after existing `useRef` declarations):

```tsx
const previewScrollRef = useRef<HTMLDivElement>(null)
const scrollSyncRef = useRef(false)
```

After the CodeMirror initialization `useEffect` (the one that creates `new EditorView(...)`), add a new `useEffect` for scroll sync:

```tsx
useEffect(() => {
  const view = viewRef.current
  const preview = previewScrollRef.current
  if (!view || !preview || isCanvasFile || isDrawingFile || isDiffFile) return

  const onEditorScroll = () => {
    if (scrollSyncRef.current) return
    const el = view.scrollDOM
    const ratio = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight)
    scrollSyncRef.current = true
    preview.scrollTop = ratio * Math.max(1, preview.scrollHeight - preview.clientHeight)
    requestAnimationFrame(() => { scrollSyncRef.current = false })
  }

  const onPreviewScroll = () => {
    if (scrollSyncRef.current) return
    const ratio = preview.scrollTop / Math.max(1, preview.scrollHeight - preview.clientHeight)
    scrollSyncRef.current = true
    view.scrollDOM.scrollTop = ratio * Math.max(1, view.scrollDOM.scrollHeight - view.scrollDOM.clientHeight)
    requestAnimationFrame(() => { scrollSyncRef.current = false })
  }

  view.scrollDOM.addEventListener('scroll', onEditorScroll, { passive: true })
  preview.addEventListener('scroll', onPreviewScroll, { passive: true })

  return () => {
    view.scrollDOM.removeEventListener('scroll', onEditorScroll)
    preview.removeEventListener('scroll', onPreviewScroll)
  }
}, [activeTabPath, isCanvasFile, isDrawingFile, isDiffFile])
```

Pass `previewScrollRef` to `<MarkdownPreview>`:

```tsx
<MarkdownPreview
  ref={previewScrollRef}
  content={activeTab.content}
  onLinkClick={handleLinkClick}
  fontSize={fontSize}
  lineWidth={lineWidth}
  readableLineLength={readableLineLength}
  vaultPath={vault?.path}
/>
```

- [ ] **Step 3: Typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm run typecheck 2>&1 | tail -10
```

Expected: 0 errors. If TypeScript complains about `forwardRef` types, ensure the generic parameters match: `React.forwardRef<HTMLDivElement, MarkdownPreviewProps>`.

- [ ] **Step 4: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
git add src/renderer/src/components/Editor/MarkdownPreview.tsx \
        src/renderer/src/components/Editor/EditorPane.tsx
git commit -m "feat: scroll sync between editor and preview"
```

---

## Task 2: Image drag-and-drop from Finder

**Files:**
- Modify: `meridian/src/renderer/src/components/Editor/EditorPane.tsx` — `handleEditorDragOver` + `handleEditorDrop`

### Context

`handleEditorDragOver` currently only accepts `application/meridian-file` or `text/plain`. Finder image drags have type `Files` in `e.dataTransfer.types`.

`handleEditorDrop` reads only custom mime type and plain text. Need to check `e.dataTransfer.files` for images first, read them with `FileReader`, call existing `saveImage(base64, ext)` (already wired), then insert `![image](assets/filename.ext)` at cursor using `viewRef.current`.

Supported extensions: `png`, `jpg`, `jpeg`, `gif`, `webp`.

- [ ] **Step 1: Extend `handleEditorDragOver` to accept image files**

Find `handleEditorDragOver` in `EditorPane.tsx`. Currently:

```tsx
const handleEditorDragOver = useCallback((e: React.DragEvent) => {
  const types = e.dataTransfer.types
  if (types.includes('application/meridian-file') || types.includes('text/plain')) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }
}, [])
```

Replace with:

```tsx
const handleEditorDragOver = useCallback((e: React.DragEvent) => {
  const types = e.dataTransfer.types
  if (
    types.includes('application/meridian-file') ||
    types.includes('text/plain') ||
    types.includes('Files')
  ) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }
}, [])
```

- [ ] **Step 2: Handle image files in `handleEditorDrop`**

Find `handleEditorDrop`. Add image handling at the very top, before the existing logic:

```tsx
const handleEditorDrop = useCallback(
  async (e: React.DragEvent) => {
    e.preventDefault()

    // Handle image files dragged from Finder
    const imageExts = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp'])
    const droppedFiles = Array.from(e.dataTransfer.files)
    const imageFile = droppedFiles.find((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
      return imageExts.has(ext)
    })

    if (imageFile) {
      const ext = imageFile.name.split('.').pop()?.toLowerCase() ?? 'png'
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          resolve(result.split(',')[1] ?? '')
        }
        reader.onerror = reject
        reader.readAsDataURL(imageFile)
      })
      const savedPath = await saveImage(base64, ext)
      if (savedPath) {
        const view = viewRef.current
        if (view) {
          const sel = view.state.selection.main
          const insertText = `![image](${savedPath})`
          view.dispatch({
            changes: { from: sel.from, to: sel.to, insert: insertText },
            selection: { anchor: sel.from + insertText.length }
          })
          view.focus()
        }
      }
      return
    }

    // ... existing wiki-link drop logic unchanged below ...
```

Keep the rest of `handleEditorDrop` exactly as it is.

Also add `saveImage` to the destructured values from `useVaultBridge()` if it isn't already there. Check line ~281:

```tsx
const { saveFile, openFile, saveImage } = useVaultBridge()
```

`saveImage` is already there — no change needed.

- [ ] **Step 3: Typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm run typecheck 2>&1 | tail -10
```

Expected: 0 errors. If TypeScript complains about `handleEditorDrop` not being `async` — it already returns a promise, the `useCallback` wrapper is fine.

- [ ] **Step 4: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
git add src/renderer/src/components/Editor/EditorPane.tsx
git commit -m "feat: drag-and-drop images from Finder into editor"
```

---

## Task 3: Git remote setup from UI

**Files:**
- Modify: `meridian/src/shared/types.ts` — add `GIT_SET_REMOTE` IPC constant
- Modify: `meridian/src/main/ipc.ts` — add `git:set-remote` handler
- Modify: `meridian/src/preload/index.ts` — expose `gitSetRemote` on `window.vault`
- Modify: `meridian/src/renderer/src/hooks/useVaultBridge.ts` — add `gitSetRemote` to window type declaration
- Modify: `meridian/src/renderer/src/components/Sidebar/GitPanel.tsx` — add remote setup UI

### Context

Currently when `gitSync()` returns `{ noRemote: true }`, `GitPanel` shows a message but gives the user no way to fix it. We need:
1. IPC: `git remote add origin <url>` (or `git remote set-url origin <url>` if remote exists)
2. UI: small input + button shown when `noRemote` state is detected

The `noRemote` state isn't stored in `gitState` — it's only shown as a temporary info message. We'll add a `hasRemote: boolean` field to `gitState` by checking in `gitStatus`.

- [ ] **Step 1: Add `GIT_SET_REMOTE` to `src/shared/types.ts`**

Read the file. Find the IPC constants block:
```ts
GIT_LOG: 'git:log',
GIT_SHOW_HEAD: 'git:show-head',
```

Add after:
```ts
GIT_SET_REMOTE: 'git:set-remote',
```

- [ ] **Step 2: Update `gitStatus` IPC to return `hasRemote`**

In `src/main/ipc.ts`, find `ipcMain.handle(IPC.GIT_STATUS, ...)`. Currently it returns `{ isRepo: true, clean, changesCount, changes }`.

After the git status check, add a remote check:

```ts
// Inside the try block, after getting the status lines:
let hasRemote = false
try {
  const { stdout: remoteOut } = await execFileAsync('git', ['remote'], { cwd })
  hasRemote = remoteOut.trim().length > 0
} catch {
  hasRemote = false
}

return {
  isRepo: true,
  clean: lines.length === 0,
  changesCount: lines.length,
  changes,
  hasRemote   // ← add this
}
```

- [ ] **Step 3: Add `git:set-remote` IPC handler in `ipc.ts`**

After the `GIT_SHOW_HEAD` handler, add:

```ts
ipcMain.handle(IPC.GIT_SET_REMOTE, async (_event, url: string) => {
  if (!vaultManager) throw new Error('No vault open')
  const cwd = vaultManager.vaultPath
  const { execFile } = await import('child_process')
  const { promisify } = await import('util')
  const execFileAsync = promisify(execFile)

  try {
    // Check if remote already exists
    const { stdout } = await execFileAsync('git', ['remote'], { cwd })
    const hasOrigin = stdout.trim().split('\n').includes('origin')
    if (hasOrigin) {
      await execFileAsync('git', ['remote', 'set-url', 'origin', url], { cwd })
    } else {
      await execFileAsync('git', ['remote', 'add', 'origin', url], { cwd })
    }
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || String(e) }
  }
})
```

- [ ] **Step 4: Expose `gitSetRemote` in preload**

Read `src/preload/index.ts`. Find where other git methods are exposed (e.g. `gitSync`, `gitLog`).

Add alongside them:
```ts
gitSetRemote: (url: string) =>
  ipcRenderer.invoke(IPC.GIT_SET_REMOTE, url),
```

- [ ] **Step 5: Add `gitSetRemote` to window type declaration in `useVaultBridge.ts`**

Find the `window.vault` interface declaration (around line 23). Find `gitLog` and add after it:
```ts
gitSetRemote: (url: string) => Promise<{ success: boolean; error?: string }>
```

Also update `gitStatus` return type to include `hasRemote`:
```ts
gitStatus: () => Promise<{
  isRepo: boolean
  clean?: boolean
  changesCount?: number
  hasRemote?: boolean
  changes?: { path: string; status: 'modified' | 'added' | 'deleted' | 'untracked' | 'unknown' }[]
}>
```

- [ ] **Step 6: Update `GitPanel.tsx` to show remote setup UI**

Read `src/renderer/src/components/Sidebar/GitPanel.tsx`.

Add `remoteUrl` state and update the git state type:

```tsx
const [remoteUrl, setRemoteUrl] = useState('')
const [settingRemote, setSettingRemote] = useState(false)
```

Update `gitState` type to include `hasRemote?: boolean`.

Add a `handleSetRemote` function after `handleSync`:

```tsx
const handleSetRemote = async () => {
  if (!remoteUrl.trim()) return
  setSettingRemote(true)
  setError(null)
  try {
    const res = await window.vault.gitSetRemote(remoteUrl.trim())
    if (res.success) {
      setRemoteUrl('')
      setInfoMessage('Remote configured! Click Sync to push.')
      setTimeout(() => setInfoMessage(null), 5000)
      await fetchStatus()
    } else {
      setError(res.error ?? 'Failed to set remote')
    }
  } catch (e: any) {
    setError(e.message || String(e))
  } finally {
    setSettingRemote(false)
  }
}
```

In the render, find where `infoMessage` is shown (the "Configure a remote" message area). Replace it with a proper setup section shown when `gitState.isRepo && !gitState.hasRemote`:

```tsx
{gitState?.isRepo && !gitState.hasRemote && (
  <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-color)' }}>
    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8 }}>
      Connect to a remote to enable sync (GitHub, GitLab, etc.)
    </div>
    <input
      value={remoteUrl}
      onChange={(e) => setRemoteUrl(e.target.value)}
      placeholder="https://github.com/user/vault.git"
      onKeyDown={(e) => { if (e.key === 'Enter') handleSetRemote() }}
      style={{
        width: '100%',
        padding: '6px 8px',
        borderRadius: 5,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        outline: 'none',
        color: 'var(--text-primary)',
        fontSize: 11,
        boxSizing: 'border-box',
        marginBottom: 6
      }}
    />
    <button
      onClick={handleSetRemote}
      disabled={settingRemote || !remoteUrl.trim()}
      style={{
        width: '100%',
        padding: '6px 0',
        borderRadius: 5,
        background: 'var(--accent-color)',
        color: '#fff',
        border: 'none',
        fontSize: 12,
        cursor: settingRemote || !remoteUrl.trim() ? 'not-allowed' : 'pointer',
        opacity: settingRemote || !remoteUrl.trim() ? 0.6 : 1
      }}
    >
      {settingRemote ? 'Connecting…' : 'Set Remote'}
    </button>
  </div>
)}
```

Also update `fetchStatus` to store `hasRemote` in `gitState`:
The existing `setGitState(res)` already stores everything from the IPC response — no change needed, since we added `hasRemote` to the IPC return value.

- [ ] **Step 7: Typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm run typecheck 2>&1 | tail -10
```

Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
git add src/shared/types.ts \
        src/main/ipc.ts \
        src/preload/index.ts \
        src/renderer/src/hooks/useVaultBridge.ts \
        src/renderer/src/components/Sidebar/GitPanel.tsx
git commit -m "feat: git remote setup UI — configure origin without terminal"
```
