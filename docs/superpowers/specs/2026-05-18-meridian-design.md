# Meridian — Design Spec

**Date:** 2026-05-18  
**Status:** Approved

## Overview

Meridian is a free, open-source macOS desktop application — a full-featured alternative to Obsidian. Built with Electron + React + TypeScript + CodeMirror 6. Notes are stored as plain `.md` files on disk, fully compatible with Obsidian vaults. Distributed as an unsigned DMG (no Apple Developer account required).

## Platform & Stack

| Layer | Choice |
|---|---|
| Desktop runtime | Electron |
| UI framework | React 18 + TypeScript |
| Build tool | Vite + electron-builder |
| Editor | CodeMirror 6 |
| State management | Zustand |
| Graph | D3.js (force-directed) |
| Canvas | Konva.js |
| Search | MiniSearch (in-memory full-text) |
| File watching | chokidar |
| Markdown parsing | remark / unified |
| Distribution | Unsigned DMG (macOS only) |

## Architecture — Layered Monolith

### Main Process (Node.js)
Handles all filesystem operations and OS integration. Never directly accessed by UI code — everything goes through the IPC bridge.

- **VaultManager** — open/create/close vault, read/write/delete files
- **FileWatcher** — chokidar watcher, emits change events to renderer via IPC
- **WindowManager** — create/manage Electron BrowserWindow instances
- **AppSettings** — global settings persisted to `~/.meridian/config.json`
- **IPC Handlers** — typed bridge between main and renderer

### Renderer Process (React)
All UI and business logic. Communicates with main via `contextBridge` / `preload.ts`.

- **EditorModule** — CodeMirror 6 instance, extensions for live preview, wiki-link highlighting, syntax
- **LinkManager** — parses `[[wiki-links]]`, builds backlink index, resolves links to files
- **GraphModule** — D3 force graph of note relationships, interactive (click to open note)
- **SearchModule** — MiniSearch index, full-text search across vault, rebuilt on startup
- **CanvasModule** — Konva.js infinite canvas, `.canvas` JSON file format
- **PluginSystem** — plugin loader, Plugin API, plugin manager UI
- **ThemeSystem** — CSS custom properties, dark/light toggle, custom CSS per-vault
- **CommandPalette** — `⌘K` global command registry with fuzzy search

### IPC Bridge
All IPC calls are typed via shared TypeScript interfaces in `src/shared/ipc.ts`. Renderer calls are async and return typed results.

## Data Storage

```
<vault-root>/
  ├── notes/              # .md files (user-organized, any structure)
  ├── .meridian/
  │   ├── config.json     # vault settings
  │   ├── plugins/        # installed community plugins
  │   │   └── <plugin-id>/
  │   │       ├── manifest.json
  │   │       └── main.js
  │   └── themes/         # custom themes
~/.meridian/
  └── config.json         # global app settings (recent vaults, etc.)
```

Search index is in-memory only — rebuilt from vault files on startup. No SQLite, no separate index file.

## UI Layout

Three-column layout:

- **Left sidebar** (200px) — tabbed: File Explorer / Search / Graph / Tags. File tree with expand/collapse, new note button.
- **Editor area** (flex) — tab bar for open files, three view modes: Source / Split / Reading. Status bar with word count and backlink count.
- **Right sidebar** (180px) — Backlinks panel + Outline (headings). Collapsible.

Editor modes:
- **Source** — raw markdown in CodeMirror
- **Split** — CodeMirror left, rendered preview right
- **Reading** — rendered HTML only

## Plugin System

Plugins are JavaScript modules stored in `.meridian/plugins/<id>/`. They run in the renderer process.

**Manifest (`manifest.json`):**
```json
{
  "id": "plugin-id",
  "name": "Plugin Name",
  "version": "1.0.0",
  "main": "main.js",
  "minAppVersion": "0.1.0"
}
```

**Plugin API (what a plugin can do):**
- Register commands (appear in Command Palette)
- Add CodeMirror extensions (editor decorations, keymaps)
- Register a settings page (shown in Settings modal)
- Add a left/right sidebar panel
- Register a markdown processor (custom syntax)
- Register a file type handler

**Lifecycle:** `load() → onLoad(app) → [running] → onUnload()`

**Security:** Plugins have no direct Node.js or filesystem access. All filesystem operations go through `app.vault.*` API methods which route through IPC.

**Built-in core plugins** (shipped with app, can be disabled):
- Daily Notes — create today's note via template
- Templates — insert template into current note
- Tags — tag panel in sidebar
- Word Count — status bar widget
- Starred — bookmarked notes list
- Random Note — open random note command

## Features by Phase

### Phase 1 — Core MVP
Electron + Vite + React scaffold, VaultManager, file tree sidebar, CodeMirror 6 editor, markdown live preview (split view), multi-tab support.

### Phase 2 — Links & Discovery
`[[wiki-link]]` parsing with autocomplete, backlinks panel, D3 graph view, MiniSearch full-text search, Command Palette (`⌘K`), tags + tag panel.

### Phase 3 — Polish
Theme system (dark/light), custom CSS per-vault, Daily Notes plugin, Templates plugin, Outline panel, Starred notes.

### Phase 4 — Plugin System
Plugin API + loader, plugin manager UI (enable/disable/install from folder), 3 demo community plugins, plugin settings pages.

### Phase 5 — Canvas
Konva.js infinite canvas, note cards on canvas, connections between cards, `.canvas` JSON format (Obsidian-compatible).

## Out of Scope

- iCloud Sync (requires Apple Developer entitlements)
- Mac App Store distribution (requires code signing + notarization)
- Mobile apps
- Paid sync service
