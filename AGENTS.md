# Meridian — AI Agent Context & Handoff Document

This document provides context, architectural details, and guidelines for AI coding assistants working on **Meridian**.

---

## 1. Project Overview

**Meridian** is an open-source, desktop Markdown knowledge-base and note-taking application (an Obsidian alternative) built with **Electron + React + TypeScript**.

### Key Features:
- **Dual Editor Modes**:
  - **Live Preview Mode**: An interactive editor (CodeMirror 6) where Markdown syntax formatting (headers, bold, lists, strikethrough, etc.) is rendered visually. Line markup is revealed when the cursor sits on that line.
  - **Source Mode**: A side-by-side split screen showing raw Markdown editor next to a live HTML preview.
- **Interactive Canvas**: Visual mapping of notes. Supports double-clicking file nodes to edit them inline, drawing connection edges, and adding/editing custom labels on connection edges.
- **Force-Directed Graph**: Visualizes note connections. Supports color grouping rules configured by path wildcards (e.g. `/daily/*`), tags (e.g. `#todo`), or filename matches.
- **Full-Text Global Search**: Fully indexed search powered by MiniSearch, displaying results with highlighted match snippets.
- **Split-Pane Layout**: Dynamic layout allowing horizontal and vertical panel splits (via context menus on tabs and the sidebar).
- **Core Obsidian-like Features**: Command Palette (`Cmd/Ctrl + K`), Table of Contents outline, tags panel, calendar journal notes, and automatic local saving.

---

## 2. Tech Stack

- **Framework**: Electron 39 (Main + Preload + Renderer processes)
- **Bundler**: `electron-vite` (ESM for Main/Preload, Vite for Renderer)
- **Frontend**: React 18 + TypeScript + Zustand (State Management)
- **Editor**: CodeMirror 6
- **Graphing/Canvas**: D3 v7 (Graph View) & Konva (Canvas View)
- **Search**: MiniSearch
- **HTML Preview**: remark & rehype
- **Testing**: Vitest + React Testing Library

---

## 3. Directory Structure

```
.
├── meridian/
│   ├── src/
│   │   ├── main/           # Electron main process (Node.js)
│   │   │   ├── index.ts    # App lifecycle, BrowserWindow creation, custom vault:// protocol
│   │   │   ├── ipc.ts      # IPC communication handlers
│   │   │   ├── settings.ts # Configuration files management
│   │   │   └── vault.ts    # Local filesystem vault CRUD operations
│   │   ├── preload/        # Secure electron bridge
│   │   │   ├── index.ts    # Exposes window.vault, window.settings, etc.
│   │   │   └── index.d.ts  # Types for global window scope
│   │   ├── shared/         # Shared interfaces, constants, and types
│   │   │   └── types.ts
│   │   └── renderer/       # Frontend React Application
│   │       ├── index.html
│   │       └── src/
│   │           ├── App.tsx
│   │           ├── main.tsx
│   │           ├── assets/ # App stylesheets (meridian.css)
│   │           ├── store/  # Zustand state stores:
│   │           │   ├── useVaultStore.ts    # Vault state, active tabs, layout splits
│   │           │   ├── useLinkStore.ts     # Global link index, tags index
│   │           │   ├── useSettingsStore.ts # Editor settings (font size, lines, mode)
│   │           │   └── useEditorStore.ts   # Cursor position and active headings
│   │           ├── hooks/  # Custom hooks (Git sync, file watchers, etc.)
│   │           └── components/
│   │               ├── ActivityBar/
│   │               ├── Canvas/      # CanvasView.tsx
│   │               ├── CommandPalette/
│   │               ├── Editor/      # EditorPane.tsx, MarkdownPreview.tsx, extensions/
│   │               ├── Graph/       # GraphView.tsx, GraphSidebar.tsx
│   │               ├── RightPanel/  # Backlinks, Tag panel, Table of Contents
│   │               ├── Sidebar/     # FileTree.tsx, SearchPanel.tsx, CalendarPanel.tsx
│   │               └── Settings/    # SettingsModal.tsx
│   └── tests/              # Vitest suite (main process and renderer components)
```

---

## 4. Development & Running the App

All commands should be executed from within the `meridian` subdirectory:

```bash
cd meridian

# Install dependencies (if needed)
npm install

# Start the Electron development server
npm run dev

# Run all automated tests (vitest)
npm run test -- --run

# Run TypeScript checks
npm run typecheck
```

---

## 5. Coding Guidelines & Conventions

- **Safe Edits**: Always make sure edits do not break compilation or existing tests. Run `npm run typecheck` and `npm run test` after any major modification.
- **Russian Language for Demos**: When creating mock data, notes, or diaries for manual testing, write them in **Russian** to match user expectations.
- **UI & Aesthetics**: The UI uses custom dark-themed variables (like `--accent-glow`). Keep components highly polished, reactive, and visually premium. Do not import or mix unnecessary utility libraries unless requested.
- **Vault Operations**: Always use the IPC-bridged APIs exposed via `window.vault` to read, write, or query files on the filesystem. Do not attempt direct Node `fs` calls from the renderer.
