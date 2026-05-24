# Changelog

All notable changes to Meridian. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versions follow [SemVer](https://semver.org/spec/v2.0.0.html).

## [1.0.2] — 2026-05-24

### Changed

- Community plugins are now application-wide instead of being tied to the active vault.
- Bundled community plugins live in the repository-level `plugins/` folder and are packaged into releases.
- Settings → Community Plugins now lists app-level plugins first and still supports legacy vault-local plugins as extras.

### Fixed

- Newly bundled plugins now appear for every user regardless of which vault is open.

## [1.0.1] — 2026-05-24

### Added

- Bundled demo community plugins for quick capture, vault indexing, broken-link reports, and starter template installation.
- Tests that verify demo plugin manifests and entry files are loadable.

### Changed

- Community plugin commands registered through `api.registerCommand` now refresh the Command Palette immediately.
- Plugin-owned commands are now tracked and removed when the plugin unloads.
- Demo community plugin files are excluded from app lint rules because they are vault-installed browser ESM examples.

### Fixed

- Community plugin commands registered during `onLoad` no longer remain available after disabling or reloading the plugin.

## [1.0.0] — 2026-05-23

First public release. Local-first markdown knowledge base for macOS desktop, inspired by Obsidian — not a drop-in replacement.

### Added

#### Editor

- CodeMirror 6 markdown editor with syntax highlighting and live preview
- Wiki-links `[[Note]]` with autocomplete (`[[` triggers completion), Cmd+Click navigation, and decoration
- Wiki-embeds: `![[image.png]]` for images, `![[Other Note]]` for inline note transclusion
- Tabs with drag-to-rearrange, drag-between-panes, split panes (horizontal and vertical)
- Auto-save (debounced, on blur, on `Alt+Tab`)
- Slash commands (`/` at line start) for headings, lists, tables, and callouts
- Image paste from clipboard → saved to `assets/`
- Properties (frontmatter) editor in the right panel — read and write YAML as form fields

#### Markdown rendering

- GitHub Flavored Markdown tables, callouts, `==highlights==`
- Mermaid diagrams (` ```mermaid `) rendered as SVG
- `vault://` protocol for resolving relative image paths
- Sanitized HTML output (`rehype-sanitize`) with relative-URL allowance for vault images

#### Files & search

- Full file tree with create / rename / delete, drag-and-drop move, sort A→Z / Z→A / mtime
- Context menu: Reveal in Finder, Copy Path, Copy Relative Path
- Full-text search via MiniSearch
- Command Palette (`⌘K`) with fuzzy file matching, command mode (`>`), and recent files
- Backlinks panel, tag panel (inline `#tag` and `tags:` frontmatter), Table of Contents panel

#### Graph view

- D3-based force-directed graph of the entire vault
- Timeline animation by note birth date with WebM video export (`MediaRecorder` → `vault:save-video`)
- Label LOD: labels appear by zoom level, node degree, or hover, with `auto / hover / all` modes
- Performance-aware truncation with `graphMaxNodes` ladder (200 / 400 / 800 / 0 = "all"); high-degree hubs preserved when truncating
- Truncation banner reports `displayed / total / hidden` and offers one-click `Increase limit`
- Slow-path confirm prompt for `graphMaxNodes=0` on large vaults, dismissible per session
- Auto-fit viewport on first load, softer default forces for clearer layouts
- Local connections graph in the right panel
- Recenter, zoom in / out, pause physics, sidebar collapse, reset view controls (all localized)

#### Canvas & Sketchpad

- Infinite spatial canvas (`*.canvas`, Konva) with cards, edges, pan, zoom, dot grid
- Sketchpad (`*.excalidraw`) with pen, shapes, text, partial-eraser, `⌘Z` undo

#### Daily notes & templates

- `⌘D` opens today's daily note in `Daily/` (auto-created)
- `_templates/*.md` with `{{date}}` and `{{title}}` placeholders, applied via `⌘K → > → Insert Template…`

#### Export

- HTML export (`⌘E`) — standalone HTML with embedded CSS
- PDF export (`⌘⇧E`) via Electron `printToPDF`

#### Git panel

- Status, diff, commit, push/pull (when remote configured)
- GitHub device-flow login (`gh`-style), per-vault token storage
- Optional autocommit core plugin (every 5 minutes + on window minimize)

#### Plugin API v1

- **Core plugins** (built-in, toggleable): word counter, daily notes, git autocommit, slash commands, backlinks, outline, table of contents, graph view, templates
- **Community plugins** loaded from `{vault}/.meridian/plugins/{id}/`:
  - `manifest.json` (`id`, `name`, `version`, `main`, optional `author` / `description` / `minAppVersion`)
  - `main.js` ESM module exporting a class or object with `onLoad(api)` / `onUnload()` / `commands[]`
- `meridian-plugin://` protocol with vault-rooted path validation; CSP whitelisted for `script-src` and `connect-src`
- `PluginAPI`: `vault`, `settings.get/set`, `ui.toast`, `ui.openSettings`, `app.openDailyNote`, `registerCommand`
- Hot reload: chokidar watcher on `{vault}/.meridian/plugins/**/{main.js,manifest.json}` debounced 300ms; renderer disables, drops, and re-imports affected plugins automatically
- Manual per-plugin **Reload** button next to the toggle in Settings → Community Plugins
- Sample plugin (`demo-vault/.meridian/plugins/meridian-sample`) as a working reference

#### Settings & i18n

- 8 themes (dark, midnight, indigo, cyberpunk, forest, nord, dracula, obsidian) and 5 accent colors
- Editor fonts: Georgia, Inter, Fira Code, JetBrains Mono, system-ui
- Configurable font size, line height, line width, line numbers, bracket matching, auto-save mode
- Native macOS menu (File / Edit / View / Window / Help) with `Menu.buildFromTemplate`
- Hotkeys panel
- Full UI translation: English and Russian

#### Architecture & tooling

- Strict per-file line limits enforced by `npm run check-lines` (500-line ceiling on components, 250 on hooks, 200 on utils)
- TypeScript split into `tsconfig.node.json` + `tsconfig.web.json` for main/preload vs renderer
- Vitest with 162 passing tests covering the link index, search, graph layout, plugin registry, plugin URL helper, settings store, vault, and large-vault truncation
- GitHub Actions CI (`.github/workflows/meridian-ci.yml`) runs `typecheck + test + check-lines` on every push and PR
- Manual smoke test matrix at [`docs/TESTING.md`](docs/TESTING.md) for pre-release verification

### Changed

- Graph default forces relaxed (link distance 100, repulsion -160, collision 8) for clearer layouts on small vaults
- Graph link rendering: thinner default stroke, optional glow, legend moved off canvas
- Sidebar starts collapsed by default to put the graph front-and-center
- `Layout.tsx` split into `LayoutHeader.tsx` + `LayoutResizer.tsx` (495 → 258 lines, well under the 450-line target)
- `meridian-plugin://` URL building/parsing extracted into `src/shared/pluginUrl.ts` as the single source of truth
- Community plugin registry pruned on vault switch — stale ids from a previous vault no longer surface as load errors

### Fixed

- Community plugin loader: failure toasts now include the underlying error message and originate from a single code path (no duplicate notifications)
- Vault switch: plugins enabled in settings but absent from the new vault are silently skipped instead of throwing
- Plugin enable errors are rethrown so the App-level catch can surface them, while `App.tsx` keeps core plugins from crashing the renderer on load failure
- CSP allows `meridian-plugin:` for `script-src` and `connect-src`, fixing community plugin module loads in dev and production
- Settings → Community Plugins refetches when the tab becomes active and depends on the current vault
- `npm run dev` strips `ELECTRON_RUN_AS_NODE` so it works under Cursor / VS Code shells without manual unset

### Known limitations

- Currently macOS only (Windows / Linux pending QA sign-off)
- macOS DMG is **not** notarized — Gatekeeper will warn on first launch (right-click → Open)
- No Obsidian plugin compatibility, no cloud sync, no mobile, no marketplace, no WebGL graph (see [SCOPE.md](SCOPE.md))

[1.0.2]: https://github.com/bvsmma/meridian/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/bvsmma/meridian/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/bvsmma/meridian/releases/tag/v1.0.0
