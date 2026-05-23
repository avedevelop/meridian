# Manual Smoke Test Matrix

This is the canonical pre-release smoke list for Meridian. Run it before tagging a build, after any change to the editor / vault / plugin loader / graph subsystems, and any time someone asks "did we test that?".

CI (`.github/workflows/meridian-ci.yml`) covers `typecheck + test + check-lines` on every push and PR. Everything below is **manual** — Electron rendering, native menu, and IPC paths are not exercised by Vitest.

## How to run

```bash
cd meridian
npm install
npm run dev
```

If Electron fails to start as Node: see [README.md](../README.md) "Dev не стартует?".

Each section below should be quick (≤2 minutes). If a step fails, file an issue and stop the matrix.

---

## 1. Vault open / switch

- [ ] Welcome vault: file tree renders, `Добро пожаловать.md` opens in the editor
- [ ] Open another folder via **File → Open Vault** (or vault picker) — file tree updates, no stale tabs from the previous vault
- [ ] Recent vaults dropdown shows the previous vault and reopens it on click
- [ ] Vault switch does **not** trigger any «Failed to load community plugin» toast for plugins that exist only in the previous vault

## 2. Editor + tabs

- [ ] Create a note (`⌘N` or `+` button) — appears in tree, opens as a new tab
- [ ] Save (`⌘S`) — status bar dirty marker clears
- [ ] Type `[[`, autocomplete pops, picking a name inserts `[[Note]]`
- [ ] Cmd-click on a wiki-link opens the linked note in a new tab
- [ ] Close tab with `⌘W` — neighbor tab activates, no lost edits

## 3. Search and command palette

- [ ] `⌘K`: type 2+ chars, fuzzy file matches appear, Enter opens
- [ ] `⌘K` then `>`: command list appears (incl. plugin commands when enabled)
- [ ] Recent files section in `⌘K` shows the last 5 opened files

## 4. Graph view

- [ ] `⌘⇧G` or sidebar Graph tab opens the global graph
- [ ] Nodes render, links visible, drag works, scroll-to-zoom works
- [ ] **Recenter / fit view** button (⊙) reframes everything inside the viewport
- [ ] In a synthetic / large vault (≥ 500 markdown notes):
  - Default `graphMaxNodes=400`: truncation banner shows `displayed / total / hidden`
  - Set `graphMaxNodes=800` in Settings: banner updates immediately, more nodes appear
  - Set `graphMaxNodes=0`: confirm dialog fires once per session, declining drops back to 400
  - Reload while still on `graphMaxNodes=0`: confirm does **not** fire again (sessionStorage `meridian:graph-slow-confirmed`)
- [ ] LOD: zoom out — labels disappear except for high-degree hubs

## 5. Canvas / Sketchpad

- [ ] Create `Test.canvas` from the `+` Canvas action — Konva stage opens, dot grid visible
- [ ] Pan / zoom with trackpad
- [ ] Add a card, drag it, save (`⌘S`)
- [ ] Sketchpad: `New Sketch` from palette opens an `.excalidraw` file, pen tool draws

## 6. Daily notes / templates

- [ ] `⌘D` opens today's daily note in `Daily/` (creates if missing)
- [ ] `⌘K` → `>` → "Insert Template…" lists `_templates/*.md` if present
- [ ] Picking a template fills `{{date}}` and `{{title}}` correctly

## 7. Export

- [ ] `⌘E` (HTML): save dialog, exported `.html` opens standalone in a browser with embedded CSS
- [ ] `⌘⇧E` (PDF): save dialog, exported `.pdf` opens in Preview with the note rendered

## 8. Git panel

- [ ] In a vault that is a git repo: status panel shows changed files
- [ ] Commit with message → `git log` in terminal confirms commit
- [ ] Sync (push/pull) when a remote is configured — toast confirms

## 9. Community plugins (Plugin API v1)

- [ ] Settings → **Community Plugins** lists the bundled Sample plugin
- [ ] Enable Sample → toast «Hello from sample plugin!» (or equivalent)
- [ ] `⌘K` → run **Sample: Show Greeting Toast** → toast fires again
- [ ] DevTools (⌥⌘I) console: **no** `Refused to load … because it violates the following Content Security Policy directive` errors. CSP in `src/renderer/index.html` must whitelist `meridian-plugin:` for `script-src` and `connect-src`.
- [ ] Hot reload: edit `demo-vault/.meridian/plugins/meridian-sample/main.js` (e.g. change toast text). Within ~300ms the plugin re-imports without a manual reload click.
- [ ] Per-plugin **Reload** button next to the toggle: clicking it triggers the same hot-reload pipeline.
- [ ] Switch to a vault without the sample plugin — no «Failed to load» toast, registry pruned.

## 10. Settings + i18n

- [ ] Switch theme — UI restyles immediately
- [ ] Switch language to Russian — Settings, Graph tooltips, Community Plugins tab all switch (no English fallbacks for graph zoom / recenter / physics)
- [ ] Switch back to English — no missing keys

## 11. Build

- [ ] `npm run build:mac` from `meridian/` produces a DMG in `dist/` without errors
- [ ] DMG mounts and the app launches from `/Applications` (or the mounted volume)
- [ ] Native macOS menu (File / Edit / View / Window / Help) is present and `⌘,` opens settings

---

## What to record

When you finish the matrix, paste the result into the release PR description:

```
Smoke matrix: <date>
- 1 ✅  2 ✅  3 ✅  4 ✅  5 ✅  6 ✅  7 ✅  8 ✅  9 ✅  10 ✅  11 ✅
Notes: <anything weird, deferred bugs, regressions found>
```

If any section fails, do **not** tag a release. File the issue, fix, and re-run from section 1.
