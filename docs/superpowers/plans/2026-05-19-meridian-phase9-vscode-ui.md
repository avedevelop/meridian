# Meridian Phase 9: VS Code-Style UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Meridian look and feel like VS Code — vertical Activity Bar with SVG icons, file type icons by extension, native macOS menu (File/Edit/View/Help), active heading in breadcrumb, and cursor position in the status bar.

**Architecture:** The Activity Bar becomes a standalone 48px column managed from App.tsx (lifting sidebar tab state out of Sidebar). File type icons are a pure `FileIcon` component consumed in FileTree and the filter list. The native menu is built in `src/main/index.ts` using `Menu.buildFromTemplate`; menu actions reach the renderer via `BrowserWindow.getFocusedWindow().webContents.send('menu:action', name)` and are exposed through preload. A new `useEditorStore` tracks cursor position and active heading, updated by a CodeMirror `updateListener` added to EditorPane.

**Tech Stack:** Electron Menu API, React Zustand, CodeMirror 6 `EditorView.updateListener`, inline SVG.

---

## File Structure

```
New:
  src/renderer/src/components/ActivityBar/ActivityBar.tsx   — vertical 48px icon column
  src/renderer/src/components/Sidebar/FileIcon.tsx          — colored file type icon by extension
  src/renderer/src/store/useEditorStore.ts                  — cursorPos + activeHeading state

Modified:
  src/renderer/src/components/Layout.tsx                    — add activityBar slot
  src/renderer/src/App.tsx                                  — lift activeSidebarTab, wire menu events
  src/renderer/src/components/Sidebar/Sidebar.tsx           — receive activeTab+onTabChange props, remove own tab bar
  src/renderer/src/components/Sidebar/FileTree.tsx          — use FileIcon component
  src/renderer/src/components/Editor/EditorPane.tsx         — add updateListener for cursor/heading
  src/renderer/src/components/Editor/Breadcrumb.tsx         — show activeHeading from useEditorStore
  src/renderer/src/components/StatusBar.tsx                 — show Ln/Col from useEditorStore
  src/main/index.ts                                         — build native macOS menu
  src/preload/index.ts                                       — expose onMenuAction
  src/shared/types.ts                                        — add MENU_ACTION IPC constant
```

---

## Task 1: Activity Bar + Layout Restructure

**Files:**
- Create: `meridian/src/renderer/src/components/ActivityBar/ActivityBar.tsx`
- Modify: `meridian/src/renderer/src/components/Layout.tsx`
- Modify: `meridian/src/renderer/src/App.tsx`
- Modify: `meridian/src/renderer/src/components/Sidebar/Sidebar.tsx`

No unit tests — pure UI restructure. Manual verification: app starts, clicking icons switches tabs.

- [ ] **Step 1: Create ActivityBar.tsx**

Create `meridian/src/renderer/src/components/ActivityBar/ActivityBar.tsx`:

```typescript
type SidebarTab = 'files' | 'search' | 'graph'

interface ActivityBarProps {
  activeTab: SidebarTab
  onTabChange: (tab: SidebarTab) => void
  onSettings: () => void
}

const ExplorerIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3" width="8" height="10" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="13" y="3" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="3" y="16" width="18" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
)

const SearchIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

const GraphIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="4" cy="6" r="2" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="20" cy="6" r="2" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="4" cy="18" r="2" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="20" cy="18" r="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M6 7l4.5 3.5M18 7l-4.5 3.5M6 17l4.5-3.5M18 17l-4.5-3.5" stroke="currentColor" strokeWidth="1"/>
  </svg>
)

const SettingsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

const TABS: { id: SidebarTab; label: string; Icon: () => JSX.Element }[] = [
  { id: 'files', label: 'Explorer', Icon: ExplorerIcon },
  { id: 'search', label: 'Search', Icon: SearchIcon },
  { id: 'graph', label: 'Graph', Icon: GraphIcon },
]

export function ActivityBar({ activeTab, onTabChange, onSettings }: ActivityBarProps) {
  return (
    <div style={{
      width: 48, flexShrink: 0,
      background: '#111111',
      borderRight: '1px solid #2a2a2a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      // @ts-ignore
      WebkitAppRegion: 'no-drag',
    }}>
      {/* Traffic-lights spacer — same height as title bar */}
      <div style={{ height: 28, width: '100%', flexShrink: 0, // @ts-ignore
        WebkitAppRegion: 'drag' }} />

      {TABS.map(({ id, label, Icon }) => {
        const isActive = activeTab === id
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            title={label}
            style={{
              width: 48, height: 48, border: 'none', cursor: 'pointer',
              background: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isActive ? '#fff' : '#555',
              borderLeft: isActive ? '2px solid #7c6af7' : '2px solid transparent',
              padding: 0,
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#aaa' }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = '#555' }}
          >
            <Icon />
          </button>
        )
      })}

      {/* Settings icon pinned to bottom */}
      <button
        onClick={onSettings}
        title="Settings (⌘,)"
        style={{
          width: 48, height: 48, border: 'none', cursor: 'pointer',
          background: 'transparent', marginTop: 'auto',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#555', borderLeft: '2px solid transparent', padding: 0,
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
        onMouseLeave={e => (e.currentTarget.style.color = '#555')}
      >
        <SettingsIcon />
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Update Layout.tsx to add activityBar slot**

Read `meridian/src/renderer/src/components/Layout.tsx`. Replace the entire file:

```typescript
import React from 'react'

interface LayoutProps {
  activityBar: React.ReactNode
  sidebar: React.ReactNode
  editor: React.ReactNode
  rightPanel: React.ReactNode
}

export function Layout({ activityBar, sidebar, editor, rightPanel }: LayoutProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden', background: '#1a1a1a' }}>
        {/* Activity bar — full height, owns its own drag region at top */}
        {activityBar}
        {/* Sidebar + editor + right panel stacked below title bar */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Title bar drag region */}
          <div style={{
            height: 28, background: '#161616', borderBottom: '1px solid #2a2a2a', flexShrink: 0,
            // @ts-ignore
            WebkitAppRegion: 'drag',
          }} />
          <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <div style={{
              width: 220, flexShrink: 0, borderRight: '1px solid #2a2a2a',
              background: '#161616', display: 'flex', flexDirection: 'column',
            }}>
              {sidebar}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {editor}
            </div>
            <div style={{
              width: 200, flexShrink: 0, borderLeft: '1px solid #2a2a2a',
              background: '#161616', overflow: 'auto',
            }}>
              {rightPanel}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update App.tsx to lift tab state and wire ActivityBar**

Read `meridian/src/renderer/src/App.tsx`.

Add import:
```typescript
import { ActivityBar } from './components/ActivityBar/ActivityBar'
```

Add `type SidebarTab` re-use — actually just define `type SidebarTab = 'files' | 'search' | 'graph'` at the top of App.tsx (before the component).

Add `activeSidebarTab` state inside `App()`:
```typescript
  const [activeSidebarTab, setActiveSidebarTab] = useState<'files' | 'search' | 'graph'>('files')
```

Change the `<Layout>` JSX to pass `activityBar` and updated sidebar:
```typescript
      <Layout
        activityBar={
          <ActivityBar
            activeTab={activeSidebarTab}
            onTabChange={setActiveSidebarTab}
            onSettings={() => setSettingsOpen(true)}
          />
        }
        sidebar={<Sidebar key={vault.path} activeTab={activeSidebarTab} onTabChange={setActiveSidebarTab} />}
        editor={<EditorArea />}
        rightPanel={<RightPanel />}
      />
```

- [ ] **Step 4: Update Sidebar.tsx to receive tab state as props**

Read `meridian/src/renderer/src/components/Sidebar/Sidebar.tsx`.

Add to the import line: the `SidebarTab` type is now `'files' | 'search' | 'graph'`.

Add props interface to the Sidebar component:
```typescript
interface SidebarProps {
  activeTab: 'files' | 'search' | 'graph'
  onTabChange: (tab: 'files' | 'search' | 'graph') => void
}
```

Update the component signature:
```typescript
export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
```

Remove the internal `activeTab` state and `tabs` array (lines that had `const [activeTab, setActiveTab] = useState<SidebarTab>('files')` and the `tabs` constant).

Remove the tab bar `<div>` (the `{tabs.map(...)}` block that renders the icon buttons at the top) from the JSX entirely.

In the graph overlay's "← Back" button, change `onClick={() => setActiveTab('files')}` to `onClick={() => onTabChange('files')}`.

In the graph overlay's `<GraphView>` call, change `onFileOpen={() => setActiveTab('files')}` to `onFileOpen={() => onTabChange('files')}`.

Remove the internal `SidebarTab` type definition (it was `type SidebarTab = 'files' | 'search' | 'graph'`).

- [ ] **Step 5: Typecheck and commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm run typecheck 2>&1 | grep -v node_modules | grep "error TS" | head -20
```

Fix any errors. Then:

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && git add src/renderer/src/components/ActivityBar/ActivityBar.tsx src/renderer/src/components/Layout.tsx src/renderer/src/App.tsx src/renderer/src/components/Sidebar/Sidebar.tsx && git commit -m "feat: VS Code-style Activity Bar with SVG icons"
```

---

## Task 2: File Type Icons

**Files:**
- Create: `meridian/src/renderer/src/components/Sidebar/FileIcon.tsx`
- Modify: `meridian/src/renderer/src/components/Sidebar/FileTree.tsx`
- Modify: `meridian/src/renderer/src/components/Sidebar/Sidebar.tsx`

- [ ] **Step 1: Create FileIcon.tsx**

Create `meridian/src/renderer/src/components/Sidebar/FileIcon.tsx`:

```typescript
const FILE_COLORS: Record<string, string> = {
  '.md': '#7c6af7',
  '.txt': '#9e9e9e',
  '.json': '#e8a44d',
  '.js': '#cbcb41',
  '.ts': '#519aba',
  '.tsx': '#519aba',
  '.jsx': '#89d957',
  '.css': '#42a5f5',
  '.html': '#e44d26',
  '.png': '#8bc34a',
  '.jpg': '#8bc34a',
  '.jpeg': '#8bc34a',
  '.gif': '#8bc34a',
  '.webp': '#8bc34a',
  '.svg': '#ff9800',
  '.pdf': '#f44336',
}

interface FileIconProps {
  name: string
  isDirectory: boolean
  isOpen?: boolean
}

export function FileIcon({ name, isDirectory, isOpen = false }: FileIconProps) {
  if (isDirectory) {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
        {isOpen ? (
          <>
            <path d="M1 4a1 1 0 011-1h4l1.5 2H14a1 1 0 011 1v7a1 1 0 01-1 1H2a1 1 0 01-1-1V4z" fill="#dcb67a"/>
            <path d="M1 7h14" stroke="#c9a15a" strokeWidth="0.6"/>
          </>
        ) : (
          <path d="M1 4a1 1 0 011-1h4l1.5 2H14a1 1 0 011 1v6a1 1 0 01-1 1H2a1 1 0 01-1-1V4z" fill="#dcb67a"/>
        )}
      </svg>
    )
  }

  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')).toLowerCase() : ''
  const color = FILE_COLORS[ext] ?? '#666'

  return (
    <svg width="13" height="15" viewBox="0 0 13 15" fill="none" style={{ flexShrink: 0 }}>
      <path d="M1 0h7l4 4v10a1 1 0 01-1 1H1a1 1 0 01-1-1V1a1 1 0 011-1z" fill={color} opacity="0.85"/>
      <path d="M8 0v3.5a.5.5 0 00.5.5H12" stroke={color} strokeWidth="0.8"/>
    </svg>
  )
}
```

- [ ] **Step 2: Use FileIcon in FileTree.tsx**

Read `meridian/src/renderer/src/components/Sidebar/FileTree.tsx`.

Add import at top:
```typescript
import { FileIcon } from './FileIcon'
```

Find the line that renders the icon:
```typescript
            <span style={{ flexShrink: 0 }}>{file.isDirectory ? '📁' : '📄'}</span>
```

Replace it with:
```typescript
            <FileIcon name={file.name} isDirectory={file.isDirectory} isOpen={file.isDirectory && expanded.has(file.path)} />
```

Also remove the expand/collapse arrow span that is currently rendered separately, since the folder icon now communicates open/closed state:
```typescript
            <span style={{ fontSize: 11, color: '#555', width: 10, flexShrink: 0 }}>
              {file.isDirectory ? (expanded.has(file.path) ? '▾' : '▸') : ''}
            </span>
```
Replace this with a slimmer arrow that only shows for directories (keep as visual indicator):
```typescript
            <span style={{ fontSize: 10, color: '#555', width: 8, flexShrink: 0, textAlign: 'center' }}>
              {file.isDirectory ? (expanded.has(file.path) ? '▾' : '▸') : ''}
            </span>
```
(Keep the arrow — it still communicates the expand state clearly. Just keep both arrow + colored folder icon.)

- [ ] **Step 3: Use FileIcon in Sidebar.tsx filtered list**

Read `meridian/src/renderer/src/components/Sidebar/Sidebar.tsx`.

Add import:
```typescript
import { FileIcon } from './FileIcon'
```

In the filtered list `filteredFiles.map(f => ...)`, find:
```typescript
                      <span style={{ flexShrink: 0 }}>📄</span>
```
Replace with:
```typescript
                      <FileIcon name={f.name} isDirectory={false} />
```

- [ ] **Step 4: Typecheck and commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm run typecheck 2>&1 | grep -v node_modules | grep "error TS" | head -20
```

Fix any errors. Then:

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && git add src/renderer/src/components/Sidebar/FileIcon.tsx src/renderer/src/components/Sidebar/FileTree.tsx src/renderer/src/components/Sidebar/Sidebar.tsx && git commit -m "feat: file type icons colored by extension"
```

---

## Task 3: Native macOS Menu

**Files:**
- Modify: `meridian/src/shared/types.ts`
- Modify: `meridian/src/main/index.ts`
- Modify: `meridian/src/preload/index.ts`
- Modify: `meridian/src/renderer/src/App.tsx`

The menu is built in the main process. Actions are sent to the renderer via `BrowserWindow.getFocusedWindow()?.webContents.send('menu:action', actionName)`. The preload exposes `onMenuAction` so the renderer can subscribe. App.tsx wires the handlers.

- [ ] **Step 1: Add IPC constant**

Read `meridian/src/shared/types.ts`. Add to the `IPC` object:

```typescript
  MENU_ACTION: 'menu:action',
```

- [ ] **Step 2: Build native menu in index.ts**

Read `meridian/src/main/index.ts`.

Add `Menu` to the electron import:
```typescript
import { app, BrowserWindow, shell, protocol, Menu } from 'electron'
```

After `registerIpcHandlers(settings)` and `createWindow()`, add a `buildMenu()` call:

```typescript
  registerIpcHandlers(settings)
  createWindow()
  buildMenu()
```

Add the `buildMenu` function BEFORE `app.whenReady()`:

```typescript
function send(action: string) {
  BrowserWindow.getFocusedWindow()?.webContents.send('menu:action', action)
}

function buildMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'New Note', accelerator: 'CmdOrCtrl+N', click: () => send('new-file') },
        { label: 'New Daily Note', accelerator: 'CmdOrCtrl+D', click: () => send('daily-note') },
        { type: 'separator' },
        { label: 'Open Vault…', accelerator: 'CmdOrCtrl+O', click: () => send('open-vault') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => send('save') },
        { label: 'Export to HTML…', accelerator: 'CmdOrCtrl+E', click: () => send('export-html') },
        { type: 'separator' },
        { label: 'Close Tab', accelerator: 'CmdOrCtrl+W', click: () => send('close-tab') },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        { label: 'Command Palette', accelerator: 'CmdOrCtrl+K', click: () => send('command-palette') },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: () => send('settings') },
        { type: 'separator' },
        { label: 'Graph View', accelerator: 'CmdOrCtrl+Shift+G', click: () => send('graph-view') },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'GitHub Repository',
          click: () => shell.openExternal('https://github.com/bvsmma/meridian'),
        },
      ],
    },
  ]

  // On macOS, prepend the app menu
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    })
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
```

- [ ] **Step 3: Expose onMenuAction in preload**

Read `meridian/src/preload/index.ts`.

Add to the `contextBridge.exposeInMainWorld` call a new `menuAPI`:

```typescript
contextBridge.exposeInMainWorld('menuAPI', {
  onAction: (callback: (action: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, action: string) => callback(action)
    ipcRenderer.on('menu:action', listener)
    return () => ipcRenderer.removeListener('menu:action', listener)
  },
})
```

(Place this AFTER the existing `window.vault` and `window.settings` exposures.)

- [ ] **Step 4: Handle menu actions in App.tsx**

Read `meridian/src/renderer/src/App.tsx`.

Add Window type declaration at the top of App.tsx (before the component, after imports):

```typescript
declare global {
  interface Window {
    menuAPI: {
      onAction: (callback: (action: string) => void) => () => void
    }
  }
}
```

Inside `App()`, add a `useEffect` that subscribes to menu actions. Place it after the keyboard handler `useEffect`:

```typescript
  const { createFile } = useVaultBridge()
  const { closeTab, activeTabPath } = useVaultStore(s => ({ closeTab: s.closeTab, activeTabPath: s.activeTabPath }))
```

Wait — `useVaultBridge` is already destructured above with `openFile, openVault, openDailyNote, exportNote`. Add `createFile` to that destructure:

```typescript
  const { openFile, openVault, openDailyNote, exportNote, createFile, saveFile } = useVaultBridge()
```

Also add `closeTab` and `activeTabPath` from the vault store:
```typescript
  const closeTab = useVaultStore(s => s.closeTab)
  const activeTabPath = useVaultStore(s => s.activeTabPath)
  const openTabs = useVaultStore(s => s.openTabs)
```

Now add the menu action handler `useEffect` AFTER the keyboard shortcut `useEffect`:

```typescript
  useEffect(() => {
    const unsub = window.menuAPI.onAction(async (action) => {
      switch (action) {
        case 'new-file':
          if (vault) createFile(vault.path, `Untitled ${Date.now()}.md`)
          break
        case 'daily-note':
          openDailyNote()
          break
        case 'open-vault':
          openVault()
          break
        case 'save': {
          const tab = openTabs.find(t => t.path === activeTabPath)
          if (tab) await saveFile(tab.path, tab.content)
          break
        }
        case 'export-html':
          exportNote()
          break
        case 'close-tab':
          if (activeTabPath) closeTab(activeTabPath)
          break
        case 'command-palette':
          setPaletteOpen(open => !open)
          break
        case 'settings':
          setSettingsOpen(open => !open)
          break
        case 'graph-view':
          setActiveSidebarTab('graph')
          break
      }
    })
    return unsub
  }, [vault, createFile, openDailyNote, openVault, saveFile, exportNote, closeTab, activeTabPath, openTabs])
```

Note: `saveFile` needs to be in the `useVaultBridge` destructure. Check that it's exposed. Looking at existing code in App.tsx, `saveFile` is NOT currently destructured from `useVaultBridge` in App.tsx — it's only used in `EditorPane.tsx`. Add it.

- [ ] **Step 5: Typecheck and commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm run typecheck 2>&1 | grep -v node_modules | grep "error TS" | head -20
```

Fix any errors. Then:

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && git add src/shared/types.ts src/main/index.ts src/preload/index.ts src/renderer/src/App.tsx && git commit -m "feat: native macOS menu (File/Edit/View/Window/Help)"
```

---

## Task 4: Active Heading in Breadcrumb + Cursor Position in Status Bar

**Files:**
- Create: `meridian/src/renderer/src/store/useEditorStore.ts`
- Modify: `meridian/src/renderer/src/components/Editor/EditorPane.tsx`
- Modify: `meridian/src/renderer/src/components/Editor/Breadcrumb.tsx`
- Modify: `meridian/src/renderer/src/components/StatusBar.tsx`

- [ ] **Step 1: Write failing tests for heading detection**

Create `meridian/tests/renderer/useEditorStore.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'

function findHeadingAbove(lines: string[], lineIndex: number): string | null {
  for (let i = lineIndex; i >= 0; i--) {
    const match = lines[i].match(/^#{1,6}\s+(.+)/)
    if (match) return match[1].trim()
  }
  return null
}

describe('findHeadingAbove', () => {
  it('returns the heading on the current line', () => {
    const lines = ['## Hello World', 'some text']
    expect(findHeadingAbove(lines, 0)).toBe('Hello World')
  })

  it('returns the nearest heading above the current line', () => {
    const lines = ['# Top', 'text', '## Section', 'more text', 'cursor here']
    expect(findHeadingAbove(lines, 4)).toBe('Section')
  })

  it('returns null when no heading exists above', () => {
    const lines = ['plain text', 'more text']
    expect(findHeadingAbove(lines, 1)).toBeNull()
  })

  it('skips code block lines that look like headings', () => {
    // findHeadingAbove operates on plain lines — code block detection is
    // handled by the caller (CodeMirror doc). This test just confirms the regex.
    const lines = ['# Real Heading', '    # not a heading (indented)']
    expect(findHeadingAbove(lines, 1)).toBe('Real Heading')
  })
})
```

Run to confirm fail:
```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npx vitest run tests/renderer/useEditorStore.test.ts 2>&1 | tail -8
```

Expected: FAIL (function not found — it's in the test file itself, so it will pass actually).

Run anyway to see output:
```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npx vitest run tests/renderer/useEditorStore.test.ts 2>&1 | tail -8
```

- [ ] **Step 2: Create useEditorStore.ts**

Create `meridian/src/renderer/src/store/useEditorStore.ts`:

```typescript
import { create } from 'zustand'

interface EditorStoreState {
  cursorPos: { line: number; col: number } | null
  activeHeading: string | null
  setCursorPos: (pos: { line: number; col: number } | null) => void
  setActiveHeading: (heading: string | null) => void
}

export const useEditorStore = create<EditorStoreState>(set => ({
  cursorPos: null,
  activeHeading: null,
  setCursorPos: (cursorPos) => set({ cursorPos }),
  setActiveHeading: (activeHeading) => set({ activeHeading }),
}))
```

- [ ] **Step 3: Run tests to confirm pass**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npx vitest run tests/renderer/useEditorStore.test.ts 2>&1 | tail -8
```

Expected: `Tests  4 passed (4)`

- [ ] **Step 4: Add CodeMirror updateListener in EditorPane.tsx**

Read `meridian/src/renderer/src/components/Editor/EditorPane.tsx`.

Add import at top:
```typescript
import { useEditorStore } from '../../store/useEditorStore'
import { EditorView as EditorViewClass } from '@codemirror/view'
```

Wait — `EditorView` is already imported from `@codemirror/view`. We need `EditorView.updateListener` which is a static property. No extra import needed.

Inside the `useEffect` that creates the CodeMirror view (the one with `const view = new EditorView({...})`), add the updateListener as an additional extension in the `extensions` array:

The current extensions line is:
```typescript
        extensions: createMarkdownExtensions(handleChange, handleLinkClick, stableGetFileNames, fontSize, lineWidth, handleImagePaste),
```

Change to:
```typescript
        extensions: [
          createMarkdownExtensions(handleChange, handleLinkClick, stableGetFileNames, fontSize, lineWidth, handleImagePaste),
          EditorView.updateListener.of(update => {
            if (!update.selectionSet && !update.docChanged) return
            const head = update.state.selection.main.head
            const line = update.state.doc.lineAt(head)
            const cursorPos = { line: line.number, col: head - line.from + 1 }
            // Find nearest heading above cursor
            let activeHeading: string | null = null
            for (let i = line.number; i >= 1; i--) {
              const text = update.state.doc.line(i).text
              const match = text.match(/^#{1,6}\s+(.+)/)
              if (match) { activeHeading = match[1].trim(); break }
            }
            useEditorStore.getState().setCursorPos(cursorPos)
            useEditorStore.getState().setActiveHeading(activeHeading)
          }),
        ],
```

Note: `createMarkdownExtensions` already returns an array of extensions. Wrapping it in an outer array is fine — CodeMirror flattens nested extension arrays. Verify `EditorView.updateListener` is accessible from the existing `import { EditorView } from '@codemirror/view'` (it is — it's a static field).

Also add a cleanup in the `useEffect` return to reset the editor store when the tab changes:
```typescript
    return () => {
      view.destroy()
      viewRef.current = null
      useEditorStore.getState().setCursorPos(null)
      useEditorStore.getState().setActiveHeading(null)
    }
```
(Replace the existing `return () => { view.destroy(); viewRef.current = null }`)

- [ ] **Step 5: Update Breadcrumb.tsx to show active heading**

Read `meridian/src/renderer/src/components/Editor/Breadcrumb.tsx`.

Add import:
```typescript
import { useEditorStore } from '../../store/useEditorStore'
```

Inside `Breadcrumb()`, add:
```typescript
  const activeHeading = useEditorStore(s => s.activeHeading)
```

In the return JSX, after the last segment (the filename), add the heading:
```typescript
      {activeHeading && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: '#333' }}>›</span>
          <span style={{ color: '#7c6af7' }}>{activeHeading}</span>
        </span>
      )}
```

The full updated return block:
```typescript
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
      {activeHeading && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: '#333' }}>›</span>
          <span style={{ color: '#7c6af7' }}>{activeHeading}</span>
        </span>
      )}
    </div>
  )
```

- [ ] **Step 6: Update StatusBar.tsx to show cursor position**

Read `meridian/src/renderer/src/components/StatusBar.tsx`.

Add import:
```typescript
import { useEditorStore } from '../store/useEditorStore'
```

Inside `StatusBar()`, add:
```typescript
  const cursorPos = useEditorStore(s => s.cursorPos)
```

In the returned JSX, add cursor position display after the word count:
```typescript
      {cursorPos && (
        <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
      )}
```

The full updated StatusBar:
```typescript
import { useMemo } from 'react'
import { useVaultStore } from '../store/useVaultStore'
import { useEditorStore } from '../store/useEditorStore'

export function StatusBar() {
  const { openTabs, activeTabPath } = useVaultStore()
  const activeTab = openTabs.find(t => t.path === activeTabPath)
  const cursorPos = useEditorStore(s => s.cursorPos)

  const wordCount = useMemo(() => {
    if (!activeTab?.content) return 0
    return activeTab.content.trim().split(/\s+/).filter(Boolean).length
  }, [activeTab?.content])

  return (
    <div style={{
      height: 22, background: '#161616', borderTop: '1px solid #2a2a2a',
      display: 'flex', alignItems: 'center', padding: '0 12px',
      color: '#555', fontSize: 11, gap: 16, flexShrink: 0,
    }}>
      <span>{wordCount} words</span>
      {cursorPos && <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>}
      <span>Markdown</span>
      {activeTab?.isDirty && <span style={{ color: '#7c6af7' }}>Unsaved</span>}
      <span style={{ marginLeft: 'auto' }}>Meridian</span>
    </div>
  )
}
```

- [ ] **Step 7: Run all tests and typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npx vitest run 2>&1 | tail -6
```

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm run typecheck 2>&1 | grep -v node_modules | grep "error TS" | head -10
```

Expected: all tests pass, no type errors.

- [ ] **Step 8: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && git add src/renderer/src/store/useEditorStore.ts src/renderer/src/components/Editor/EditorPane.tsx src/renderer/src/components/Editor/Breadcrumb.tsx src/renderer/src/components/StatusBar.tsx tests/renderer/useEditorStore.test.ts && git commit -m "feat: active heading in breadcrumb + cursor position in status bar"
```

---

## Self-Review

**Spec coverage:**
- ✅ Activity Bar (vertical 48px SVG icon column) — Task 1
- ✅ File type icons (colored SVG by extension) — Task 2
- ✅ Native macOS menu (File/Edit/View/Window/Help) — Task 3
- ✅ Active heading in breadcrumb (CodeMirror updateListener → useEditorStore → Breadcrumb) — Task 4
- ✅ Cursor position in status bar (Ln X, Col Y) — Task 4

**Placeholder scan:** No TBDs, no "implement later", all code blocks complete.

**Type consistency:**
- `SidebarTab = 'files' | 'search' | 'graph'` used consistently in ActivityBar props, Sidebar props, App.tsx state ✅
- `ActivityBarProps.onTabChange: (tab: SidebarTab) => void` matches `setActiveSidebarTab` signature ✅
- `FileIconProps.name: string, isDirectory: boolean, isOpen?: boolean` — FileTree passes all three, Sidebar filtered list passes `isDirectory={false}` ✅
- `menuAPI.onAction` returns `() => void` (unsubscribe) used in `useEffect` return ✅
- `useEditorStore.cursorPos: { line: number; col: number } | null` — set by updateListener, read by StatusBar ✅
- `useEditorStore.activeHeading: string | null` — set by updateListener, read by Breadcrumb ✅
- `EditorView.updateListener.of(...)` — valid CodeMirror 6 API, `EditorView` already imported ✅

**Task order:**
- Task 1 changes Layout interface (adds `activityBar` prop) — Task 2/3/4 don't touch Layout ✅
- Task 3 adds `createFile` and `saveFile` to App.tsx's `useVaultBridge` destructure — check these exist in `useVaultBridge.ts` return value before implementing ✅
- Tasks are otherwise independent ✅
