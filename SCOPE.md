# Meridian — Product Scope

## What Meridian is

Local-first markdown knowledge base for macOS and Windows desktop.
Plain `.md` files on disk, wiki-links, graph, canvas — no cloud lock-in.

## In scope (shipped / maintaining)

- **Vault on disk** — open any folder, no proprietary format
- **Editor** — CodeMirror 6 with syntax highlighting, live preview, split panes, tabs
- **Wiki-links & backlinks** — `[[Note]]`, autocomplete, backlinks panel
- **Tags** — inline `#tag` and frontmatter `tags:` with tag panel
- **Properties** — editable YAML frontmatter in the right panel
- **Note types** — project, person, daily note, and task templates
- **Relationships** — frontmatter relationship fields with right-panel browsing
- **Saved Views** — Inbox, Projects, Tasks, and Daily workflow views
- **Search** — full-text (MiniSearch) + Command Palette (⌘K)
- **Graph view** — force-directed (D3), timeline animation, WebM export, performance limits documented
- **Canvas** — infinite canvas with cards (Konva, `.canvas` files)
- **Sketchpad** — freehand drawing, shapes, text (`.excalidraw` files)
- **Daily notes & templates** — `_templates/` folder, `{{date}}` / `{{title}}` placeholders
- **Export** — HTML (⌘E) and PDF (⌘⇧E)
- **Git panel** — status, diff, commit + optional autocommit plugin
- **Note history** — per-note Git history, preview, and restore
- **Ask Vault** — read-only local question panel with cited source notes
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

Done in the lead-up to v1.0 (no longer "next"):

- Plugin API v1 with command palette + onLoad/onUnload hooks
- Hot-reload of community plugin sources (manifest.json / main.js)
- `meridian-plugin://` protocol with vault-rooted path validation
- Graph visual polish (LOD, glow, auto-fit, truncation banner with hidden count)
- Layout refactor under the 450-line target + line-limit CI gate

Remaining backlog (post-v1.0, not blocking release):

- In-app community plugin registry browser (install / update from Settings)
- Sandboxed iframe permission layer for untrusted community plugins
- Plugin marketplace + signing
- WebGL / GPU-accelerated force layout for very large vaults (10k+ nodes)
- Linux QA sign-off and release artifacts
- Notarized / signed macOS DMG (currently unsigned)
- Granular per-plugin permission prompts (vault read, network, settings write)
