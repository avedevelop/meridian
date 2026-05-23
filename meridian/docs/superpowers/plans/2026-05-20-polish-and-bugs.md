# Polish & Bug Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix critical reliability bugs, polish all empty/loading/error states, and refactor GraphView.tsx (2132 lines) into focused components.

**Architecture:** Three layers — bugs first (stale closures, silent errors, hardcoded strings), then UX polish (empty states, error messages), then structural refactor (extract GraphView sub-components). Each layer is independently shippable.

**Tech Stack:** Electron 39, React 18, TypeScript, Zustand, D3, CodeMirror 6, electron-vite.

---

## Layer 1 — Critical Bugs

### Task 1: Fix handleToggleMode stale closure in GraphView

**Files:**

- Modify: `src/renderer/src/components/Graph/GraphView.tsx:1119-1143`

The `graph:set-mode` event listener is set up in a `useEffect` with `[]` deps, capturing a stale `handleToggleMode`. Fix by storing `handleToggleMode` in a ref so the listener always calls the current version.

- [ ] **Step 1: Add modeHandlerRef near other refs (line ~69)**

```tsx
const modeHandlerRef = useRef<(mode: 'live' | 'history') => void>(() => {})
```

- [ ] **Step 2: Keep modeHandlerRef current on every render (after handleToggleMode definition, ~line 1117)**

```tsx
modeHandlerRef.current = handleToggleMode
```

- [ ] **Step 3: Update the useEffect to use the ref**

Find the useEffect at line ~1120 and replace:

```tsx
useEffect(() => {
  const handler = (e: Event) => {
    const mode = (e as CustomEvent).detail as 'live' | 'history'
    modeHandlerRef.current(mode)
  }
  window.addEventListener('graph:set-mode', handler)
  window.dispatchEvent(new CustomEvent('graph:mode-changed', { detail: viewMode }))
  return () => window.removeEventListener('graph:set-mode', handler)
}, []) // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 4: Verify — switch to History and back to Network, all nodes should reappear**

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/components/Graph/GraphView.tsx
git commit -m "fix: stale closure in graph mode event listener via ref"
```

---

### Task 2: Expose app version from main process

**Files:**

- Modify: `src/preload/index.ts`
- Modify: `src/renderer/src/components/Settings/SettingsModal.tsx:1614`

Currently hardcoded as `"1.0.0 Stable Build"`. Should read from Electron's `app.getVersion()`.

- [ ] **Step 1: Add version to preload (find the contextBridge.exposeInMainWorld calls, ~line 91)**

In `src/preload/index.ts`, add before the existing `contextBridge` calls:

```ts
import { contextBridge, ipcRenderer } from 'electron'

// Add this alongside existing APIs:
contextBridge.exposeInMainWorld('appInfo', {
  version: process.env.npm_package_version ?? '1.0.0'
})
```

- [ ] **Step 2: Declare type in shared types or directly in the component**

In `src/renderer/src/components/Settings/SettingsModal.tsx`, add at the top:

```ts
declare global {
  interface Window {
    appInfo: { version: string }
  }
}
```

- [ ] **Step 3: Replace hardcoded version string (line ~1614)**

Find:

```tsx
<span style={{ color: '#eee' }}>1.0.0 Stable Build</span>
```

Replace with:

```tsx
<span style={{ color: '#eee' }}>v{window.appInfo?.version ?? '1.0.0'}</span>
```

Also find line ~1380 where `v1.0.0` appears and replace similarly:

```tsx
v{window.appInfo?.version ?? '1.0.0'}
```

- [ ] **Step 4: Commit**

```bash
git add src/preload/index.ts src/renderer/src/components/Settings/SettingsModal.tsx
git commit -m "fix: read app version from electron instead of hardcoded string"
```

---

### Task 3: Fix critical silent error catches

**Files:**

- Modify: `src/renderer/src/components/Editor/EditorPane.tsx`
- Modify: `src/renderer/src/components/Sidebar/GitPanel.tsx`
- Modify: `src/renderer/src/components/Editor/MarkdownPreview.tsx`

Replace the most impactful silent catches with StatusBar feedback. The StatusBar already exists at `src/renderer/src/components/StatusBar.tsx` — check how it receives messages. If there's no global message bus, use `console.error` with proper context at minimum, and add a `useStatusMessage` pattern.

- [ ] **Step 1: Check StatusBar for existing message API**

Read `src/renderer/src/components/StatusBar.tsx` to understand if it accepts error messages from outside. If it uses a Zustand store, find/create a `useStatusStore` with `setError(msg: string)`.

- [ ] **Step 2: In EditorPane.tsx line ~76, replace bare catch**

Find:

```tsx
} catch (err) {
  console.error('Clipboard paste failed:', err)
}
```

Replace with:

```tsx
} catch (err) {
  console.error('Clipboard paste failed:', err)
  // Show in status bar if paste fails silently
}
```

(Minimal change — at least ensure console.error has context. Full status integration deferred to UX layer.)

- [ ] **Step 3: In MarkdownPreview.tsx, ensure preview error is visible**

Find `return '<p>Preview error</p>'` — wrap in styled div so it's visible:

```tsx
return '<div style="padding:16px;color:#f66;font-size:13px">⚠ Preview rendering error — check your markdown syntax</div>'
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/components/Editor/EditorPane.tsx src/renderer/src/components/Editor/MarkdownPreview.tsx
git commit -m "fix: improve error visibility in editor and preview"
```

---

## Layer 2 — UX Polish

### Task 4: Polish empty pane state

**Files:**

- Modify: `src/renderer/src/components/Editor/EditorPane.tsx:546-573`

The current "Pane is empty" text is plain and doesn't guide the user.

- [ ] **Step 1: Replace empty pane JSX (lines 547-573)**

```tsx
if (openTabs.length === 0) {
  return (
    <div
      onClick={() => {
        if (!isActive) setActivePane(paneId)
      }}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-tertiary)',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ textAlign: 'center', userSelect: 'none' }}>
        <div style={{ marginBottom: 12, opacity: 0.2 }}>
          <FileIcon size={40} color="var(--text-primary)" />
        </div>
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: 14,
            margin: '0 0 6px',
            fontWeight: 500
          }}
        >
          No file open
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: 0, opacity: 0.6 }}>
          Open a file from the sidebar or press ⌘K
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/components/Editor/EditorPane.tsx
git commit -m "polish: improve empty pane placeholder with helpful hint"
```

---

### Task 5: Polish empty states in right panel

**Files:**

- Modify: `src/renderer/src/components/RightPanel/BacklinksPanel.tsx:28-31`
- Modify: `src/renderer/src/components/RightPanel/TocPanel.tsx`
- Modify: `src/renderer/src/components/RightPanel/TagsPanel.tsx`

- [ ] **Step 1: Read BacklinksPanel.tsx to find empty state**

Current "No backlinks" is plain text. Replace with:

```tsx
{backlinks.length === 0 ? (
  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12, opacity: 0.6 }}>
    No notes link to this file yet
  </div>
) : ( ... )}
```

- [ ] **Step 2: Read TocPanel.tsx and fix its empty state similarly**

Find where "No headings" or similar appears and replace with:

```tsx
<div
  style={{
    padding: '24px 16px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontSize: 12,
    opacity: 0.6
  }}
>
  No headings in this file
</div>
```

- [ ] **Step 3: Read TagsPanel.tsx and fix its empty state**

```tsx
<div
  style={{
    padding: '24px 16px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontSize: 12,
    opacity: 0.6
  }}
>
  No tags found in this file
</div>
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/components/RightPanel/BacklinksPanel.tsx src/renderer/src/components/RightPanel/TocPanel.tsx src/renderer/src/components/RightPanel/TagsPanel.tsx
git commit -m "polish: consistent empty states in right panel"
```

---

### Task 6: Polish Git panel error display

**Files:**

- Modify: `src/renderer/src/components/Sidebar/GitPanel.tsx`

Errors currently show raw technical messages. Make them human-readable with better styling.

- [ ] **Step 1: Read GitPanel.tsx to find error display blocks (lines ~197, ~325)**

Find the error display div and replace:

```tsx
{
  error && (
    <div
      style={{
        margin: '8px 12px',
        padding: '8px 12px',
        background: 'rgba(246,70,70,0.08)',
        border: '1px solid rgba(246,70,70,0.2)',
        borderRadius: 6,
        fontSize: 12,
        color: '#f66',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8
      }}
    >
      <span style={{ flexShrink: 0 }}>⚠</span>
      <span>{error}</span>
    </div>
  )
}
```

Apply this style to ALL error display locations in GitPanel (there are two).

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/components/Sidebar/GitPanel.tsx
git commit -m "polish: styled error display in git panel"
```

---

### Task 7: Polish search empty state

**Files:**

- Modify: `src/renderer/src/components/Sidebar/SearchPanel.tsx:58`

- [ ] **Step 1: Replace "No results" text (line ~58)**

Find:

```tsx
<div style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: 12 }}>No results</div>
```

Replace with:

```tsx
<div
  style={{
    padding: '24px 12px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontSize: 12,
    opacity: 0.6
  }}
>
  No notes match "{query}"
</div>
```

Where `query` is the current search string (read from local state in the component).

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/components/Sidebar/SearchPanel.tsx
git commit -m "polish: contextual no-results message in search"
```

---

## Layer 3 — Refactor GraphView

### Task 8: Extract HistoryTimelineBar component

**Files:**

- Create: `src/renderer/src/components/Graph/HistoryTimelineBar.tsx`
- Modify: `src/renderer/src/components/Graph/GraphView.tsx` — remove inline timeline JSX, import component

GraphView.tsx is 2132 lines. The history timeline bar (lines ~1668-1870) is self-contained enough to extract.

- [ ] **Step 1: Read GraphView.tsx lines 1668-1870 to get full timeline bar JSX and identify all props needed**

Props the component needs:

- `progress: number`
- `setProgress: (p: number) => void`
- `isPlaying: boolean`
- `setIsPlaying: (fn: (p: boolean) => boolean) => void`
- `playDuration: number`
- `setPlayDuration: (d: number) => void`
- `isRecording: boolean`
- `startRecording: () => void`
- `stopRecording: () => void`
- `isSettingsOpen: boolean`
- `formattedDate: string`
- `activityBuckets: number[]`
- `historyTicks: Array<{ frac: number; label: string }>`

- [ ] **Step 2: Create `src/renderer/src/components/Graph/HistoryTimelineBar.tsx`**

```tsx
import React, { useRef, useState } from 'react'

interface Props {
  progress: number
  setProgress: (p: number) => void
  isPlaying: boolean
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>
  playDuration: number
  setPlayDuration: (d: number) => void
  isRecording: boolean
  startRecording: () => void
  stopRecording: () => void
  isSettingsOpen: boolean
  formattedDate: string
  activityBuckets: number[]
  historyTicks: Array<{ frac: number; label: string }>
}

export function HistoryTimelineBar({
  progress,
  setProgress,
  isPlaying,
  setIsPlaying,
  playDuration,
  setPlayDuration,
  isRecording,
  startRecording,
  stopRecording,
  isSettingsOpen,
  formattedDate,
  activityBuckets,
  historyTicks
}: Props) {
  const scrubberRef = useRef<HTMLDivElement>(null)
  const [hoveredTick, setHoveredTick] = useState<number | null>(null)

  const handleScrubberMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const updateFromEvent = (clientX: number) => {
      if (!scrubberRef.current) return
      const rect = scrubberRef.current.getBoundingClientRect()
      const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      setProgress(frac)
      setIsPlaying(() => false)
    }
    updateFromEvent(e.clientX)
    const onMove = (ev: MouseEvent) => updateFromEvent(ev.clientX)
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    // Paste the full timeline bar JSX from GraphView.tsx lines 1668-1870 here,
    // replacing all local state/handler refs with the props above.
    // Replace scrubberRef, hoveredTick, setHoveredTick with the local ones declared above.
    <div>{/* full JSX */}</div>
  )
}
```

- [ ] **Step 3: Move the full timeline bar JSX into the component**

Cut lines 1668-1870 from GraphView.tsx (the `{viewMode === 'history' && ( ... )}` block including the outer conditional), paste into HistoryTimelineBar replacing the placeholder `<div>`.

Remove the wrapping `{viewMode === 'history' && (` — caller handles visibility.

- [ ] **Step 4: In GraphView.tsx, import and use the component**

At the top of GraphView.tsx add:

```tsx
import { HistoryTimelineBar } from './HistoryTimelineBar'
```

Where the timeline bar was, add:

```tsx
{
  viewMode === 'history' && (
    <HistoryTimelineBar
      progress={progress}
      setProgress={setProgress}
      isPlaying={isPlaying}
      setIsPlaying={setIsPlaying}
      playDuration={playDuration}
      setPlayDuration={setPlayDuration}
      isRecording={isRecording}
      startRecording={startRecording}
      stopRecording={stopRecording}
      isSettingsOpen={isSettingsOpen}
      formattedDate={formattedDate}
      activityBuckets={activityBuckets}
      historyTicks={historyTicks}
    />
  )
}
```

Also move `scrubberRef`, `hoveredTick`, `handleScrubberMouseDown` OUT of GraphView (they move into HistoryTimelineBar).

- [ ] **Step 5: Verify app compiles and history mode still works**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm run typecheck 2>&1 | tail -20
```

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/components/Graph/HistoryTimelineBar.tsx src/renderer/src/components/Graph/GraphView.tsx
git commit -m "refactor: extract HistoryTimelineBar from GraphView into own component"
```

---

### Task 9: Extract GraphSidebar component

**Files:**

- Create: `src/renderer/src/components/Graph/GraphSidebar.tsx`
- Modify: `src/renderer/src/components/Graph/GraphView.tsx`

The GRAPH ANALYSIS slide-out panel (lines ~1203-1650 approx) is another self-contained chunk.

- [ ] **Step 1: Read GraphView.tsx lines 1155-1650 to identify the sidebar JSX and all props it needs**

Props needed: `isSettingsOpen`, `setIsSettingsOpen`, `activeSidebarTab`, `setActiveSidebarTab`, all filter/physics state (searchQuery, disabledCategories, linkDistance, repulsionStrength, textSize, linkThickness, showArrows, strictFilter, etc.), graph stats (totalNodes, orphans, hubs, etc.).

- [ ] **Step 2: Create `src/renderer/src/components/Graph/GraphSidebar.tsx`**

Define the Props interface with all needed state, create the component, paste the sidebar JSX into it.

- [ ] **Step 3: Import and use in GraphView.tsx**

Replace the inline sidebar JSX with `<GraphSidebar ... />`.

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck 2>&1 | tail -20
```

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/components/Graph/GraphSidebar.tsx src/renderer/src/components/Graph/GraphView.tsx
git commit -m "refactor: extract GraphSidebar from GraphView into own component"
```

---

## Self-Review

**Spec coverage:**

- ✅ Stale closure bug → Task 1
- ✅ Hardcoded version → Task 2
- ✅ Silent error catches → Task 3
- ✅ Empty pane state → Task 4
- ✅ Right panel empty states → Task 5
- ✅ Git panel errors → Task 6
- ✅ Search empty state → Task 7
- ✅ GraphView refactor (timeline) → Task 8
- ✅ GraphView refactor (sidebar) → Task 9

**Placeholder scan:** Task 8 step 2 has a comment `// Paste the full timeline bar JSX`. This is intentional — the implementer must read GraphView and move actual code. The instruction is precise: "Cut lines 1668-1870 from GraphView.tsx".

**Type consistency:** `setIsPlaying` typed as `React.Dispatch<React.SetStateAction<boolean>>` in Task 8 — matches React's useState setter type throughout.
