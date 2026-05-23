# Meridian — Product Scope

## What Meridian is

Local-first markdown knowledge base for macOS / desktop.
Plain `.md` files on disk, wiki-links, graph, canvas — no cloud lock-in.

## In scope (shipped / maintaining)

- **Vault on disk** — open any folder, no proprietary format
- **Editor** — CodeMirror 6 with syntax highlighting, live preview, split panes, tabs
- **Wiki-links & backlinks** — `[[Note]]`, autocomplete, backlinks panel
- **Tags** — inline `#tag` and frontmatter `tags:` with tag panel
- **Search** — full-text (MiniSearch) + Command Palette (⌘K)
- **Graph view** — force-directed (D3), timeline animation, WebM export, performance limits documented
- **Canvas** — infinite canvas with cards (Konva, `.canvas` files)
- **Sketchpad** — freehand drawing, shapes, text (`.excalidraw` files)
- **Daily notes & templates** — `_templates/` folder, `{{date}}` / `{{title}}` placeholders
- **Export** — HTML (⌘E) and PDF (⌘⇧E)
- **Git panel** — status, diff, commit + optional autocommit plugin
- **Core plugins** — built-in, toggleable in Settings
- **Community plugins** — loaded from `{vault}/.meridian/plugins/` (after Plugin API v1)
- **i18n** — English + Russian
- **Themes** — 8 themes, 5 accent colors, configurable fonts and editor settings

## Out of scope (explicitly not promised)

- Full Obsidian plugin compatibility
- Obsidian Sync / Publish or any cloud sync
- Mobile apps (iOS / Android)
- Real-time collaboration / multiplayer
- Dataview / Bases / advanced query languages
- Plugin marketplace or signed notarization (until separate release task)
- WebGL graph renderer

## Positioning

> Local-first notes app inspired by Obsidian — not a drop-in replacement.

Use this line in README and marketing materials.
See [ARCHITECTURE.md](ARCHITECTURE.md) for codebase structure and contribution rules.

## Next milestones (not v1.0)

- Integrated community plugin registry browser within the app settings.
- Automated hot-reloading for plugin developments on manifest/source file changes.
- Granular sandboxed iframe permission layer for untrusted community plugins.
- Performance optimization timeline features and WebGL force layout rendering.
