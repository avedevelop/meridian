# Meridian — Agent Handoff Document

## What is this project?

**Meridian** is a macOS desktop app — a free, open-source Obsidian alternative built with Electron + React + TypeScript. Portfolio project by @bvsmma. GitHub: https://github.com/bvsmma/meridian

## Tech Stack

- **Electron 39** (main process + preload + renderer, contextIsolation: true, sandbox: false)
- **electron-vite** for bundling (ESM output in main, Vite for renderer)
- **React 18 + TypeScript** (renderer)
- **CodeMirror 6** (editor with custom extensions)
- **Zustand** (state management: useVaultStore, useLinkStore, useSettingsStore)
- **D3 v7** (force-directed graph)
- **MiniSearch** (full-text search)
- **remark/rehype** (markdown rendering in preview panel)
- **Vitest + React Testing Library** (tests)

## Running the app

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
npm run dev        # dev mode with hot reload
npm run build:mac  # production DMG build
npx vitest run     # run tests
npm run typecheck  # TypeScript check
```

## Architecture

```
src/
  main/           # Electron main process (Node.js)
    index.ts      # BrowserWindow, vault:// protocol, app lifecycle
    ipc.ts        # All IPC handlers, exports getVaultManager()
    vault.ts      # VaultManager class (file CRUD, assertInsideVault guard)
    settings.ts   # AppSettings (JSON file in userData/meridian/config.json)
  preload/
    index.ts      # contextBridge: exposes window.vault and window.settings
  shared/
    types.ts      # Shared types: VaultFile, VaultConfig, AppConfig, IPC constants
  renderer/src/
    store/
      useVaultStore.ts    # vault config, file tree, open tabs, active tab
      useLinkStore.ts     # link index, search index, tags (module-level singletons)
      useSettingsStore.ts # fontSize, lineWidth (persisted to localStorage)
    hooks/
      useVaultBridge.ts   # Bridge: calls window.vault.* IPC methods, manages state
    components/
      Editor/
        EditorPane.tsx         # CodeMirror editor, tab management
        MarkdownPreview.tsx    # remark/rehype preview with wiki-link + image support
        TabBar.tsx
        extensions/
          markdownExtensions.ts  # All CM6 extensions assembled here
          wikiLinkExtension.ts   # [[link]] decoration + Cmd+Click handler
          wikiLinkCompletion.ts  # [[ autocomplete with startCompletion trigger
          imagePaste.ts          # Paste image from clipboard → saves to assets/
      Sidebar/
        Sidebar.tsx     # Tabs: Files / Search / Graph (graph is full-screen overlay)
        FileTree.tsx    # File tree with rename (double-click), context menu (right-click)
        ContextMenu.tsx # Portal-based context menu (Rename/Delete for files, New Folder for dirs)
        SearchPanel.tsx # MiniSearch full-text search
      Graph/
        GraphView.tsx   # D3 SVG force graph (nodes = files, edges = [[links]])
      RightPanel/
        RightPanel.tsx      # Tabbed: Links | Tags
        BacklinksPanel.tsx  # Backlinks + per-note tags for active file
        TagsPanel.tsx       # Vault-wide tag browser with file counts
      CommandPalette/
        CommandPalette.tsx  # ⌘K overlay, fuzzy file search
      Settings/
        SettingsModal.tsx   # ⌘, modal with font size + line width sliders
      Layout.tsx        # 3-column layout (sidebar 220px | editor flex | right panel 200px)
      VaultPicker.tsx   # Start screen with recent vaults list
      StatusBar.tsx     # Word count, Markdown, Unsaved indicator
```

## IPC Channels (src/shared/types.ts → IPC object)

| Channel | Direction | Description |
|---------|-----------|-------------|
| vault:open-dialog | renderer→main | Open system folder picker, returns VaultConfig |
| vault:open-by-path | renderer→main | Open vault at known path (recent vaults) |
| vault:list-files | renderer→main | Returns VaultFile[] tree |
| vault:read-file | renderer→main | Returns file content as UTF-8 string |
| vault:write-file | renderer→main | Writes text file |
| vault:create-file | renderer→main | Creates empty file, returns full path |
| vault:create-dir | renderer→main | Creates directory (recursive) |
| vault:delete-file | renderer→main | Deletes file or directory (recursive) |
| vault:rename-file | renderer→main | Renames file, returns new path |
| vault:write-binary | renderer→main | Writes base64 data as binary file (for image paste) |
| settings:get | renderer→main | Returns AppConfig |
| settings:set | renderer→main | Sets lastVault |

## Custom Protocol: vault://

Registered in `src/main/index.ts` via `protocol.handle('vault', ...)`.

- Purpose: serve vault files (images, etc.) to the renderer
- Usage in preview: `![](assets/img.png)` → `<img src="vault:///assets/img.png">`
- **Important**: Chromium normalizes `vault:///a/b.png` → `vault://a/b.png` (a=host, b.png=path). Handler reconstructs: `hostname + pathname` = full relative path
- Registered as privileged: `protocol.registerSchemesAsPrivileged([{ scheme: 'vault', privileges: { secure: true, standard: true, ... } }])` — must be BEFORE `app.whenReady()`
- CSP in `src/renderer/index.html` includes `vault:` in `img-src`

## Key State Flows

**Opening a vault:**
`openVault()` → dialog → `initVault(config)` → listFiles → index all .md files → setVault + setFiles

**Opening a file:**
`openFile(path, name)` → if tab already open: just activate it (NO re-read from disk, preserves unsaved edits) → else: openTab + readFile + setTabContent

**Saving:**
`⌘S` → `saveFile(path, content)` → writeFile IPC → markTabDirty(false) → re-index in useLinkStore

**Wiki-link autocomplete:**
`wikiLinkCompletion.ts` → `autocompletion({ override: [...] })` + `EditorView.updateListener` that calls `startCompletion()` when `[[` is typed

**Image paste:**
`imagePaste.ts` → intercepts clipboard paste event → FileReader → base64 → `saveImage()` → `vault:write-binary` IPC → inserts `![](assets/image-{timestamp}.ext)` at cursor

## Known Patterns & Gotchas

1. **useLinkStore singletons**: `linkIndex` and `searchIndex` are module-level singletons mutated directly (not reactive). `tagsVersion: number` in the store is incremented on `indexFile`/`removeFile` to trigger re-renders for components that need reactivity (TagsPanel).

2. **Editor recreates on tab switch or settings change**: The CodeMirror editor `useEffect` depends on `[activeTabPath, fontSize, lineWidth]`. When any changes, the editor is destroyed and recreated. Content is preserved in the store.

3. **closeBrackets() and wiki-links**: CodeMirror's `closeBrackets()` auto-closes `[` → `[]`. When user types `[[`, the editor state has `[[]]` with cursor inside. The autocomplete handles this by looking ahead for `]]` in the `apply` function.

4. **rehype-sanitize**: Custom `sanitizeSchema` allows relative URLs in `img[src]` (empty string `''` in protocols.src) and allows `span[data-link]` and `span[style]` for wiki-link rendering.

5. **Vault path security**: All IPC handlers call `vaultManager.assertInsideVault(path)` which uses `resolve()` + `startsWith(vaultPath + sep)` to prevent path traversal.

6. **ESM in electron-vite**: Main process is compiled as ESM. Use `import` not `require`. Dynamic imports: `await import('fs/promises')` works.

## What's been built (Phases 1-5)

### Phase 1: Core MVP
- Vault picker + recent vaults
- File tree with create/rename (double-click)/delete (right-click)
- Folder creation (right-click on folder)
- CodeMirror editor with markdown syntax highlighting + Georgia serif theme
- Tab system with unsaved indicator
- ⌘S save
- Markdown preview (remark/rehype)
- Status bar (word count)
- Error boundary

### Phase 2: Links & Discovery
- `[[wiki-links]]` in editor: purple underline decoration, Cmd+Click to open
- `[[` autocomplete dropdown with vault file names
- Backlinks panel (right sidebar)
- Per-note tags display (#tag)
- MiniSearch full-text search (sidebar Search tab)
- ⌘K command palette
- D3 force-directed graph view (sidebar Graph tab, full-screen overlay)
- Link index (forward + backward links, case-insensitive resolution)

### Phase 3: Polish
- Settings modal ⌘, (font size 13-22px, line width 600-960px, persisted to localStorage)
- Settings applied to editor (recreates on change) and preview (inline style)
- Right-click context menu (Rename/Delete for files, New Folder for dirs)
- File deletion with confirm dialog
- Recent vaults on start screen (loads from AppConfig via settings IPC)
- macOS DMG build configured (arm64 + x64)

### Phase 4: Content & Organization
- ⌘D Daily notes → creates/opens `Daily/YYYY-MM-DD.md` (uses local date, not UTC)
- Image paste: Ctrl+V in editor → saves to `vault/assets/image-{ts}.ext` → shows in preview
- Right panel is now tabbed: Links (backlinks) | Tags (vault-wide tag browser)
- Tags panel shows all `#tags` sorted by frequency, expandable with file lists
- `vault://` custom Electron protocol for serving vault assets to preview

### Phase 5: Reliability & Sync
- Main process starts a `chokidar` watcher whenever a vault opens and emits typed `file:changed` events to renderer windows
- Renderer `useVaultFileWatcher` batches file-tree refreshes and syncs markdown add/change/delete events into the link/search/tag index
- Clean open tabs update automatically when their file changes externally; dirty tabs are preserved to avoid overwriting unsaved work
- Deleted files and deleted folders are removed from the link index, and clean tabs under deleted paths are closed
- GraphView builds nodes from the live file tree and subscribes to `indexVersion`, so deleted files cannot remain as ghost nodes even if the link index briefly lags
- Command palette and active search results refresh as the link/search index changes
- ESLint config now matches the existing implicit-return React style while preserving useful unused-variable checks

## Current bugs / known issues

1. **External rename behavior**: filesystem renames arrive as `unlink` + `add`. The file tree and index update correctly, but an open clean tab for the old path is closed rather than rebound to the new path.

2. **Dirty tab conflict UX**: if a file changes externally while its tab has unsaved edits, Meridian preserves the dirty tab and updates the disk-backed index, but there is no conflict banner or merge UI yet.

3. **Rename flow**: renameFile correctly updates the link index (remove old + add new). But if a file was renamed BEFORE this fix, the graph may show the old name until vault is reopened.

## What could come next (Phase 6 ideas)

- **Note templates**: create new notes from template files in `templates/` folder
- **External change conflict UI**: show a small banner when disk content changes while the open tab is dirty
- **Spellcheck**: CodeMirror spellcheck extension or native
- **Export to HTML/PDF**: export current note
- **Better onboarding**: "Create new vault" option (currently only "Open existing folder")
- **Drag & drop**: reorder files in tree
- **Multiple vaults**: tabbed vault switching
- **Publish**: notarize the macOS build for distribution

## How to continue with Codex

Start a Codex session in the terminal from the project directory:

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
codex
```

Then say: **"Read AGENTS.md to understand the project, then [your task]"**

Codex will read this file and have full context. Example prompts:
- "Read AGENTS.md. Add note templates — when creating a new note, offer to pick from markdown files in a templates/ folder"
- "Read AGENTS.md. Add conflict UI for external file changes when a tab has unsaved edits"
- "Read AGENTS.md. Add export to HTML/PDF for the active note"
