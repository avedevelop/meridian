# Meridian — Agent Handoff Document

## Canonical workspace (read first)

- **Only edit:** `/Users/vladyslav/Desktop/dev/new project/meridian`
- **Never use:** `~/Documents/antigravity/fearless-hypatia` or other clones
- **Commands:** `cd meridian` then `npm run dev` | `npm run test` | `npm run check-lines`
- **Modularity rules:** [ARCHITECTURE.md](ARCHITECTURE.md)

## Dev troubleshooting

- `npm run dev` already strips `ELECTRON_RUN_AS_NODE` for Cursor / VS Code shells (`env -u ELECTRON_RUN_AS_NODE electron-vite dev`). If Electron still launches as Node, run `unset ELECTRON_RUN_AS_NODE && npm run dev` or use `npm run dev:kill` to free port 5173.
- Preload changes (`src/preload/index.ts`) need a full restart — Vite HMR does not apply to preload bundles.
- Community plugin loader changes (`src/main/index.ts` protocol handler, `src/main/ipc.ts` PLUGIN_LIST/LOAD/FILE_CHANGED) require restarting `npm run dev` and re-enabling the Sample plugin from Settings → Community Plugins. See [PLUGIN_DEVELOPMENT.md](PLUGIN_DEVELOPMENT.md) "Smoke Checklist".
- Run `npm run typecheck && npm run test && npm run check-lines` before every commit.

## What is this project?

**Meridian** is a macOS desktop app — a free, open-source Obsidian alternative built with Electron + React + TypeScript. Portfolio project by @bvsmma. GitHub: https://github.com/bvsmma/meridian

## Rules & Conventions

- **Language Constraint**: All markdown notes, diaries, and sample content created or modified in `demo-vault` (or any local workspaces for testing) MUST be written in Russian so that the user can easily read and test the application features.

## Graph performance limits

`graphMaxNodes` (in `useSettingsStore`) caps how many notes the force-directed graph renders. Documented values:

| Setting | Renders | Notes |
| ------- | ------- | ----- |
| `200`   | 200     | "Fast" — large vaults, low-end machines |
| `400`   | 400     | **Default** — balanced |
| `800`   | 800     | "Detailed" — strong machines |
| `0`     | All     | Slow path. The renderer prompts on first activation per session via `sessionStorage['meridian:graph-slow-confirmed']`. |

When the eligible note set exceeds the cap, `buildGraphData` keeps the highest-degree nodes (mtime as tiebreaker) and the `GraphView` truncation banner reports `displayed / total / hidden`. Synthetic fixtures live at `tests/fixtures/largeVault.ts`; coverage in `tests/renderer/graphLargeVault.test.ts`.

## Tech Stack

- **Electron 39** (main process + preload + renderer, contextIsolation: true, sandbox: false)
- **electron-vite** for bundling (ESM output in main, Vite for renderer)
- **React 18 + TypeScript** (renderer)
- **CodeMirror 6** (editor with custom extensions)
- **Zustand** (state management: useVaultStore, useLinkStore, useSettingsStore, useEditorStore)
- **D3 v7** (force-directed graph)
- **MiniSearch** (full-text search)
- **remark/rehype** (markdown rendering in preview panel)
- **Vitest + React Testing Library** (tests — 158 passing)

## Running the app

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
npm run dev        # dev mode with hot reload (full restart required for preload/main changes)
npm run build:mac  # production DMG build
npx vitest run     # run tests
npm run typecheck  # TypeScript check
```

## Architecture

```
src/
  main/           # Electron main process (Node.js)
    index.ts      # BrowserWindow, vault:// protocol, app lifecycle, native menu
    ipc.ts        # All IPC handlers, exports getVaultManager()
    vault.ts      # VaultManager class (file CRUD, assertInsideVault guard)
    settings.ts   # AppSettings (JSON file in userData/meridian/config.json)
  preload/
    index.ts      # contextBridge: exposes window.vault, window.settings, window.menuAPI
  shared/
    types.ts      # Shared types: VaultFile, VaultConfig, AppConfig, IPC constants
  renderer/src/
    store/
      useVaultStore.ts    # vault config, file tree, open tabs, active tab
      useLinkStore.ts     # link index, search index, tags (module-level singletons)
      useSettingsStore.ts # fontSize, lineWidth (persisted to localStorage)
      useEditorStore.ts   # cursorPos + activeHeading (updated by CodeMirror listener)
    hooks/
      useVaultBridge.ts   # Bridge: calls window.vault.* IPC methods, manages state
      useVaultFileWatcher.ts # Chokidar file watcher bridge
    components/
      ActivityBar/
        ActivityBar.tsx        # VS Code-style 48px vertical icon column (Explorer/Search/Graph/Settings)
      Editor/
        EditorPane.tsx         # CodeMirror editor + tab management + breadcrumb
        MarkdownPreview.tsx    # remark/rehype preview with wiki-link + image support
        TabBar.tsx
        Breadcrumb.tsx         # path + active heading (vault/folder/file.md › ## Heading)
        extensions/
          markdownExtensions.ts  # All CM6 extensions assembled here
          wikiLinkExtension.ts   # [[link]] decoration + Cmd+Click handler
          wikiLinkCompletion.ts  # [[ autocomplete with startCompletion trigger
          imagePaste.ts          # Paste image from clipboard → saves to assets/
      Sidebar/
        Sidebar.tsx     # Receives activeTab+onTabChange props (tab state lifted to App.tsx)
        FileTree.tsx    # File tree with rename (double-click), drag&drop, full context menu
        FileIcon.tsx    # Colored SVG file icons by extension (.md purple, .ts blue, etc.)
        ContextMenu.tsx # Portal-based context menu with separator support
        SearchPanel.tsx # MiniSearch full-text search
      Graph/
        GraphView.tsx   # D3 SVG force graph (nodes = files, edges = [[links]])
      RightPanel/
        RightPanel.tsx      # Tabbed: Links | Tags | ToC
        BacklinksPanel.tsx  # Backlinks + per-note tags for active file
        TagsPanel.tsx       # Vault-wide tag browser with file counts
        TocPanel.tsx        # Table of contents from headings, click to scroll
      CommandPalette/
        CommandPalette.tsx  # ⌘K overlay, fuzzy file search
      Settings/
        SettingsModal.tsx   # ⌘, modal with font size + line width sliders
      Layout.tsx        # 4-column layout: ActivityBar 48px | sidebar 220px | editor flex | right panel 200px
      VaultPicker.tsx   # Start screen with recent vaults list + "New Vault" button
      StatusBar.tsx     # Word count, Ln/Col cursor position, Markdown, Unsaved indicator
```

## IPC Channels (src/shared/types.ts → IPC object)

| Channel            | Direction     | Description                                                    |
| ------------------ | ------------- | -------------------------------------------------------------- |
| vault:open-dialog  | renderer→main | Open system folder picker, returns VaultConfig                 |
| vault:open-by-path | renderer→main | Open vault at known path (recent vaults)                       |
| vault:list-files   | renderer→main | Returns VaultFile[] tree                                       |
| vault:read-file    | renderer→main | Returns file content as UTF-8 string                           |
| vault:write-file   | renderer→main | Writes text file                                               |
| vault:create-file  | renderer→main | Creates empty file, returns full path                          |
| vault:create-dir   | renderer→main | Creates directory (recursive)                                  |
| vault:delete-file  | renderer→main | Deletes file or directory (recursive)                          |
| vault:rename-file  | renderer→main | Renames file, returns new path                                 |
| vault:write-binary | renderer→main | Writes base64 data as binary file (for image paste)            |
| vault:move-file    | renderer→main | Moves file to target directory, returns new path               |
| vault:reveal-file  | renderer→main | Opens Finder at file location (shell.showItemInFolder)         |
| vault:export-html  | renderer→main | Save dialog + write HTML file                                  |
| vault:save-video   | renderer→main | Save dialog + write WebM video (Uint8Array) — PLANNED Phase 10 |
| settings:get       | renderer→main | Returns AppConfig                                              |
| settings:set       | renderer→main | Sets lastVault                                                 |
| file:changed       | main→renderer | Push: chokidar file system change event                        |
| menu:action        | main→renderer | Native menu item clicked (new-file, save, export-html, etc.)   |

## VaultFile type (src/shared/types.ts)

```typescript
export interface VaultFile {
  name: string // filename with extension
  path: string // absolute path
  relativePath: string // relative to vault root
  isDirectory: boolean
  children?: VaultFile[]
  mtime: number // last modified timestamp (ms)
  birthtime: number // file creation timestamp (ms) — PLANNED Phase 10, add to listFiles/getFile
}
```

**NOTE:** `birthtime` is planned for Phase 10 but NOT yet added. When implementing, add `birthtime: info.birthtimeMs` in `src/main/vault.ts` `listFiles()` and `getFile()`, and add the field to the `VaultFile` interface.

## Native Menu (src/main/index.ts)

Built with `Menu.buildFromTemplate`. Menu actions sent to renderer via:

```typescript
BrowserWindow.getFocusedWindow()?.webContents.send('menu:action', actionName)
```

Actions handled in `src/renderer/src/App.tsx` via `window.menuAPI.onAction(callback)`.

Supported actions: `new-file`, `daily-note`, `open-vault`, `save`, `export-html`, `close-tab`, `command-palette`, `settings`, `graph-view`.

## Key State Flows

**Opening a vault:**
`openVault()` → dialog → `initVault(config)` → listFiles → index all .md files → setVault + setFiles

**Opening a file:**
`openFile(path, name)` → if tab already open: just activate (NO re-read, preserves unsaved edits) → else: openTab + readFile + setTabContent

**Saving:**
`⌘S` → `saveFile(path, content)` → writeFile IPC → markTabDirty(false) → re-index in useLinkStore

**Programmatic editor content sync (avoids dirty flag bug):**
`isProgrammaticUpdate.current = true` → `view.dispatch({changes})` → `isProgrammaticUpdate.current = false`
The `handleChange` callback checks `isProgrammaticUpdate.current` and skips `markTabDirty` if true.

**Wiki-link autocomplete:**
`wikiLinkCompletion.ts` → `autocompletion({ override: [...] })` + `EditorView.updateListener` that calls `startCompletion()` when `[[` is typed

**Image paste:**
`imagePaste.ts` → intercepts clipboard paste event → FileReader → base64 → `saveImage()` → `vault:write-binary` IPC → inserts `![](assets/image-{timestamp}.ext)` at cursor

**Cursor position + active heading:**
CodeMirror `updateListener` in `EditorPane.tsx` → `useEditorStore.getState().setCursorPos()` + `setActiveHeading()` → read by `Breadcrumb.tsx` and `StatusBar.tsx`

**Activity Bar tab switching:**
`activeSidebarTab` state lives in `App.tsx` → passed to `ActivityBar` (controls which icon is active) and `Sidebar` (controls which panel is shown).

**Drag & drop file move:**
Module-level `let dragSourcePath: string | null = null` in `FileTree.tsx` → shared across recursive instances → `onDrop` calls `onMove(dragSourcePath, targetDir)` → `moveFile` in `useVaultBridge`.

## Known Patterns & Gotchas

1. **useLinkStore singletons**: `linkIndex` and `searchIndex` are module-level singletons mutated directly (not reactive). `tagsVersion: number` and `indexVersion: number` in the store are incremented on `indexFile`/`removeFile` to trigger re-renders.

2. **Editor recreates on tab switch or settings change**: The CodeMirror editor `useEffect` depends on `[activeTabPath, fontSize, lineWidth]`. When any changes, the editor is destroyed and recreated. Content is preserved in the store.

3. **closeBrackets() and wiki-links**: CodeMirror's `closeBrackets()` auto-closes `[` → `[]`. When user types `[[`, the editor state has `[[]]` with cursor inside. The autocomplete handles this by looking ahead for `]]` in the `apply` function.

4. **rehype-sanitize**: Custom `sanitizeSchema` allows relative URLs in `img[src]` (empty string `''` in protocols.src).

5. **Vault path security**: All IPC handlers call `vaultManager.assertInsideVault(path)` which uses `resolve()` + `startsWith(vaultPath + sep)` to prevent path traversal.

6. **ESM in electron-vite**: Main process is compiled as ESM. Use `import` not `require`. Dynamic imports: `await import('fs/promises')` works.

7. **vault:// protocol**: Chromium normalizes `vault:///a/b.png` → `vault://a/b.png` (a=host, b.png=path). Handler reconstructs path from `hostname + pathname`. Registered as privileged BEFORE `app.whenReady()`.

8. **Context menu separators**: `ContextMenu.tsx` supports `{ separator: true }` items alongside `{ label, onClick, danger? }` items. Check for `'separator' in item` to distinguish.

9. **preload changes require full app restart**: Changes to `src/preload/index.ts` are NOT picked up by HMR. Must stop and restart `npm run dev`.

## What's been built (Phases 1–9)

### Phase 1: Core MVP

Vault picker, file tree (create/rename/delete), CodeMirror editor, tab system, ⌘S save, markdown preview, status bar, error boundary.

### Phase 2: Links & Discovery

`[[wiki-links]]` decoration + Cmd+Click, `[[` autocomplete, backlinks panel, #tags, MiniSearch search, ⌘K command palette, D3 force graph.

### Phase 3: Polish

Settings modal (font size/line width), right-click context menu, file deletion confirm, recent vaults, macOS DMG build.

### Phase 4: Content & Organization

⌘D daily notes, image paste (clipboard → assets/), right panel tabs (Links | Tags), vault:// protocol.

### Phase 5: Reliability & Sync

Chokidar file watcher, reactive file tree, auto-reload clean tabs, link index sync on external changes.

### Phase 6 (Codex)

Chokidar watcher fully integrated, GraphView uses live vault file tree, ghost-node bug fixed.

### Phase 7: Demo Features

Table of Contents panel (parseHeadings, click to scroll), Export to HTML (remark pipeline, save dialog), Create New Vault button on VaultPicker.

### Phase 8: VS Code File Management

Drag & drop to move files, context menu (Reveal in Finder, Copy Path, Copy Relative Path), file tree filter input + collapse all (⊟), breadcrumb navigation above editor.

### Phase 9: VS Code UI

- **Activity Bar**: 48px vertical SVG-icon column (Explorer/Search/Graph/Settings), tab state lifted to App.tsx
- **File type icons**: colored SVG file shape by extension (FileIcon.tsx)
- **Native macOS menu**: File/Edit/View/Window/Help via `Menu.buildFromTemplate`
- **Active heading in breadcrumb**: CodeMirror updateListener → useEditorStore → Breadcrumb shows `› ## Current Section` in purple
- **Cursor position**: Ln X, Col Y in status bar
- **Context menu**: Full menu for both files and folders with separators, New Note/New Note Here

## ⚡ NEXT: Phase 10 — Animated Graph + Video Export

**Plan file:** `docs/superpowers/plans/2026-05-19-meridian-phase10-animated-graph-video.md`

**What to implement:** Two tasks.

### Phase 10 Task 1: birthtime + save-video IPC

**Files to modify:**

**`src/shared/types.ts`** — add to `VaultFile`:

```typescript
birthtime: number // file creation timestamp (ms)
```

Add to `IPC` object:

```typescript
  VAULT_SAVE_VIDEO: 'vault:save-video',
```

**`src/main/vault.ts`** — in `listFiles()` and `getFile()`, add to the VaultFile object construction:

```typescript
  birthtime: info.birthtimeMs,
```

(`info` is already from `await stat(fullPath)` — `birthtimeMs` is available on macOS.)

**`src/main/ipc.ts`** — add handler after last `ipcMain.handle`:

```typescript
ipcMain.handle(IPC.VAULT_SAVE_VIDEO, async (_event, data: Uint8Array) => {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Export Graph Animation',
    defaultPath: 'meridian-graph.webm',
    filters: [{ name: 'WebM Video', extensions: ['webm'] }]
  })
  if (!filePath) return null
  const { writeFile } = await import('fs/promises')
  await writeFile(filePath, data)
  return filePath
})
```

**`src/preload/index.ts`** — add to `vaultAPI`:

```typescript
  saveVideo: (data: Uint8Array): Promise<string | null> =>
    ipcRenderer.invoke(IPC.VAULT_SAVE_VIDEO, data),
```

**`src/renderer/src/hooks/useVaultBridge.ts`** — add to `Window.vault` type declaration:

```typescript
saveVideo: (data: Uint8Array) => Promise<string | null>
```

Commit: `git commit -m "feat: add birthtime to VaultFile + vault:save-video IPC"`

---

### Phase 10 Task 2: Animated GraphView with timeline + video recording

**File to rewrite:** `src/renderer/src/components/Graph/GraphView.tsx`

**Full replacement code** (read the current file first to understand what's being replaced):

```typescript
import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import * as d3 from 'd3'
import { useLinkStore } from '../../store/useLinkStore'
import { useVaultStore } from '../../store/useVaultStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'
import type { VaultFile } from '@shared/types'

interface GNode extends d3.SimulationNodeDatum {
  id: string
  name: string
  degree: number
}

interface GLink extends d3.SimulationLinkDatum<GNode> {
  source: string | GNode
  target: string | GNode
}

interface GraphViewProps {
  onFileOpen?: () => void
}

interface D3State {
  sim: d3.Simulation<GNode, GLink>
  nodeG: d3.Selection<SVGGElement, GNode, SVGGElement, unknown>
  linkSel: d3.Selection<SVGLineElement, GLink, SVGGElement, unknown>
  dateLabel: d3.Selection<SVGTextElement, unknown, null, undefined>
  svgEl: SVGSVGElement
}

function flattenFiles(files: VaultFile[]): VaultFile[] {
  return files.flatMap(f => f.children ? [f, ...flattenFiles(f.children)] : [f])
}

const nodeR = (d: GNode) => d.degree > 0 ? 7 + Math.min(d.degree * 2, 10) : 5
const nodeColor = (d: GNode) => d.degree > 0 ? '#7c6af7' : '#3a3560'
const labelColor = (d: GNode) => d.degree > 0 ? '#bbb' : '#555'

export function GraphView({ onFileOpen }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const d3Ref = useRef<D3State | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const progressRef = useRef(1)

  const files = useVaultStore(s => s.files)
  const outlinks = useLinkStore(s => s.outlinks)
  const indexVersion = useLinkStore(s => s.indexVersion)
  const { openFile } = useVaultBridge()

  const [progress, setProgress] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playDuration, setPlayDuration] = useState(20000)
  const [isRecording, setIsRecording] = useState(false)

  progressRef.current = progress

  const { birthtimes, minTime, maxTime } = useMemo(() => {
    const bt = new Map<string, number>()
    flattenFiles(files).forEach(f => { if (!f.isDirectory) bt.set(f.path, f.birthtime ?? f.mtime) })
    const times = Array.from(bt.values())
    return {
      birthtimes: bt,
      minTime: times.length > 0 ? Math.min(...times) : Date.now() - 86_400_000,
      maxTime: Date.now(),
    }
  }, [files])

  const currentTimestamp = minTime + (maxTime - minTime) * progress

  const formattedDate = new Date(currentTimestamp).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const updateVisibility = useCallback((prog: number) => {
    const state = d3Ref.current
    if (!state) return
    const ts = minTime + (maxTime - minTime) * prog

    state.nodeG.each(function(d) {
      const birth = birthtimes.get(d.id)
      const visible = birth !== undefined && birth <= ts
      d3.select(this)
        .transition().duration(visible ? 500 : 150)
        .attr('opacity', visible ? 1 : 0)
        .style('pointer-events', visible ? 'auto' : 'none')
    })

    state.linkSel.each(function(d) {
      const sb = birthtimes.get((d.source as GNode).id)
      const tb = birthtimes.get((d.target as GNode).id)
      const visible = sb !== undefined && tb !== undefined && sb <= ts && tb <= ts
      d3.select(this).transition().duration(300).attr('opacity', visible ? 0.6 : 0)
    })

    state.dateLabel.text(
      new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    )
  }, [birthtimes, minTime, maxTime])

  useEffect(() => { updateVisibility(progress) }, [progress, updateVisibility])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let sim: d3.Simulation<GNode, GLink> | null = null

    const build = () => {
      el.innerHTML = ''
      const width = el.clientWidth
      const height = el.clientHeight
      if (!width || !height) return

      const allMd = flattenFiles(files)
        .filter(f => !f.isDirectory && f.name.endsWith('.md'))
        .map(f => f.path)
        .slice(0, 400)
      const liveSet = new Set(allMd)
      const degree: Record<string, number> = {}
      const edgeSet = new Set<string>()
      const links: GLink[] = []

      for (const file of allMd) {
        for (const target of outlinks(file)) {
          if (!liveSet.has(target)) continue
          const key = [file, target].sort().join('|')
          if (edgeSet.has(key)) continue
          edgeSet.add(key)
          links.push({ source: file, target })
          degree[file] = (degree[file] ?? 0) + 1
          degree[target] = (degree[target] ?? 0) + 1
        }
      }

      const nodes: GNode[] = allMd.map(f => ({
        id: f,
        name: f.split('/').pop()?.replace(/\.md$/, '') ?? '',
        degree: degree[f] ?? 0,
        x: width / 2 + (Math.random() - 0.5) * 100,
        y: height / 2 + (Math.random() - 0.5) * 100,
      }))

      sim = d3.forceSimulation(nodes)
        .force('link', d3.forceLink<GNode, GLink>(links).id(d => d.id).distance(70).strength(0.4))
        .force('charge', d3.forceManyBody().strength(-80).distanceMax(300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide<GNode>(d => nodeR(d) + 8))

      const svg = d3.select(el).append('svg')
        .attr('width', width).attr('height', height)
        .style('cursor', 'grab').style('display', 'block')

      const defs = svg.append('defs')
      const filter = defs.append('filter').attr('id', 'glow')
      filter.append('feGaussianBlur').attr('stdDeviation', 3).attr('result', 'coloredBlur')
      const merge = filter.append('feMerge')
      merge.append('feMergeNode').attr('in', 'coloredBlur')
      merge.append('feMergeNode').attr('in', 'SourceGraphic')
      const pattern = defs.append('pattern')
        .attr('id', 'dotgrid').attr('width', 28).attr('height', 28).attr('patternUnits', 'userSpaceOnUse')
      pattern.append('circle').attr('cx', 14).attr('cy', 14).attr('r', 0.6).attr('fill', '#1e1e2a')

      svg.append('rect').attr('width', width).attr('height', height).attr('fill', '#161616')
      svg.append('rect').attr('width', width).attr('height', height).attr('fill', 'url(#dotgrid)')

      const root = svg.append('g')

      svg.call(
        d3.zoom<SVGSVGElement, unknown>()
          .scaleExtent([0.1, 5])
          .on('zoom', ({ transform }) => root.attr('transform', transform.toString()))
          .on('start', () => svg.style('cursor', 'grabbing'))
          .on('end', () => svg.style('cursor', 'grab'))
      )

      const linkSel = root.append('g').selectAll<SVGLineElement, GLink>('line')
        .data(links).join('line')
        .attr('stroke', '#4a4080').attr('stroke-width', 1).attr('opacity', 0)

      const nodeG = root.append('g').selectAll<SVGGElement, GNode>('g')
        .data(nodes).join('g')
        .attr('opacity', 0)
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
          if (event.defaultPrevented) return
          openFile(d.id, d.name + '.md')
          onFileOpen?.()
        })
        .on('mouseover', function(_e, d) {
          d3.select(this).select('circle.vis').attr('fill', '#a89df7').attr('r', nodeR(d) + 3)
            .style('filter', 'url(#glow)')
          d3.select(this).select('text').attr('fill', '#fff').attr('font-size', 13)
        })
        .on('mouseout', function(_e, d) {
          d3.select(this).select('circle.vis').attr('fill', nodeColor(d)).attr('r', nodeR(d))
            .style('filter', null)
          d3.select(this).select('text').attr('fill', labelColor(d)).attr('font-size', 11)
        })
        .call(
          d3.drag<SVGGElement, GNode>()
            .on('start', (event, d) => { if (!event.active) sim!.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
            .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
            .on('end', (event, d) => { if (!event.active) sim!.alphaTarget(0); d.fx = null; d.fy = null })
        )

      nodeG.append('circle').attr('r', d => Math.max(nodeR(d) + 10, 16)).attr('fill', 'transparent')
      nodeG.append('circle').attr('class', 'vis')
        .attr('r', d => nodeR(d)).attr('fill', d => nodeColor(d))
        .attr('stroke', d => d.degree > 0 ? '#6a5af7' : '#444').attr('stroke-width', 1.5)
      nodeG.append('text').text(d => d.name)
        .attr('font-size', 11).attr('font-family', '-apple-system, sans-serif')
        .attr('fill', d => labelColor(d)).attr('text-anchor', 'middle')
        .attr('dy', d => nodeR(d) + 13)
        .style('pointer-events', 'none').style('user-select', 'none')

      const dateLabel = svg.append('text')
        .attr('x', width - 16).attr('y', height - 16)
        .attr('text-anchor', 'end').attr('font-size', 13)
        .attr('font-family', '-apple-system, sans-serif')
        .attr('fill', 'rgba(255,255,255,0.35)')

      sim.on('tick', () => {
        linkSel
          .attr('x1', d => (d.source as GNode).x!)
          .attr('y1', d => (d.source as GNode).y!)
          .attr('x2', d => (d.target as GNode).x!)
          .attr('y2', d => (d.target as GNode).y!)
        nodeG.attr('transform', d => `translate(${d.x},${d.y})`)
      })

      d3Ref.current = { sim, nodeG, linkSel, dateLabel, svgEl: svg.node()! }
      updateVisibility(progressRef.current)
    }

    const ro = new ResizeObserver(build)
    ro.observe(el)
    build()

    return () => { ro.disconnect(); sim?.stop(); el.innerHTML = ''; d3Ref.current = null }
  }, [files, outlinks, openFile, indexVersion])

  useEffect(() => {
    if (!isPlaying) return
    const startTime = performance.now()
    const startProgress = progressRef.current
    let raf: number
    const tick = (now: number) => {
      const newProgress = Math.min(startProgress + (now - startTime) / playDuration, 1)
      setProgress(newProgress)
      if (newProgress >= 1) { setIsPlaying(false); return }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isPlaying, playDuration])

  const renderFrameToCanvas = useCallback(() => {
    const state = d3Ref.current
    const canvas = canvasRef.current
    if (!state || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const data = new XMLSerializer().serializeToString(state.svgEl)
    const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#161616'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
    }
    img.src = url
  }, [])

  useEffect(() => {
    if (isRecording) renderFrameToCanvas()
  }, [progress, isRecording, renderFrameToCanvas])

  useEffect(() => {
    if (isRecording && !isPlaying && progress >= 1) {
      const t = setTimeout(() => mediaRecorderRef.current?.stop(), 600)
      return () => clearTimeout(t)
    }
  }, [isRecording, isPlaying, progress])

  const startRecording = useCallback(() => {
    const el = containerRef.current
    const canvas = canvasRef.current
    if (!el || !canvas) return
    canvas.width = el.clientWidth
    canvas.height = el.clientHeight
    const stream = canvas.captureStream(15)
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
    chunksRef.current = []
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = async () => {
      setIsRecording(false)
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      const buf = await blob.arrayBuffer()
      await window.vault.saveVideo(new Uint8Array(buf))
    }
    recorder.start(200)
    mediaRecorderRef.current = recorder
    setIsRecording(true)
    setProgress(0)
    setIsPlaying(true)
  }, [])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
    setIsPlaying(false)
  }, [])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div ref={containerRef} style={{ flex: 1, position: 'relative' }}>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
      <div style={{
        height: 60, background: '#111', borderTop: '1px solid #2a2a2a',
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, color: '#666', minWidth: 136, flexShrink: 0 }}>
          {formattedDate}
        </span>
        <input
          type="range" min={0} max={1000} value={Math.round(progress * 1000)}
          onChange={e => { setProgress(Number(e.target.value) / 1000); setIsPlaying(false) }}
          style={{ flex: 1, accentColor: '#7c6af7', cursor: 'pointer', height: 4 }}
        />
        <button
          onClick={() => { if (progress >= 1) setProgress(0); setIsPlaying(p => !p) }}
          style={{ background: '#7c6af7', border: 'none', borderRadius: 6, color: '#fff', padding: '5px 14px', cursor: 'pointer', fontSize: 15, flexShrink: 0 }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <select
          value={playDuration}
          onChange={e => setPlayDuration(Number(e.target.value))}
          style={{ background: '#1e1e1e', border: '1px solid #3a3a3a', color: '#aaa', borderRadius: 4, padding: '4px 6px', fontSize: 12, cursor: 'pointer' }}
        >
          <option value={10000}>10s</option>
          <option value={20000}>20s</option>
          <option value={40000}>40s</option>
          <option value={60000}>60s</option>
        </select>
        {isRecording ? (
          <button onClick={stopRecording} style={{ background: '#c62828', border: 'none', borderRadius: 6, color: '#fff', padding: '5px 14px', cursor: 'pointer', fontSize: 13, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
            Stop
          </button>
        ) : (
          <button onClick={startRecording} title="Record graph animation as WebM video" style={{ background: '#1e1e1e', border: '1px solid #3a3a3a', borderRadius: 6, color: '#ccc', padding: '5px 14px', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>
            ⏺ Record
          </button>
        )}
      </div>
    </div>
  )
}
```

Commit: `git commit -m "feat: animated graph with timeline scrubber + video export"`

---

After both tasks:

```bash
npm run typecheck   # must be clean
npx vitest run      # all tests must pass
git push
```

## How to continue in another AI session

Start the session and say:

> **"Read AGENTS.md in `/Users/vladyslav/Desktop/dev/new project/meridian` to understand the project, then implement Phase 10 exactly as described in the '⚡ NEXT: Phase 10' section of AGENTS.md. Do Task 1 first (birthtime + save-video IPC), then Task 2 (GraphView rewrite). Run typecheck and all tests after each task. Do not start the dev server."**

The complete code for both tasks is in this file. No additional context needed.
