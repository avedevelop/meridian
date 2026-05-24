# Meridian Component & Modularity Architecture

To prevent component bloat and preserve a clean, modular, and maintainable codebase, all developers and AI coding agents must adhere to the rules and guidelines defined below.

---

## Canonical workspace

- **Repo root:** `/Users/vladyslav/Desktop/dev/new project`
- **App (run all npm commands here):** `meridian/`
- **Do not develop** in `~/Documents/antigravity/*` or other duplicate clones.

```bash
cd meridian
npm run dev
npm run test
npm run check-lines
```

---

## 1. File Size Limits

We enforce strict maximum line count limits for files under `src/renderer/src/components`:

| File Type                      | Target Size | Strict Maximum |
| :----------------------------- | :---------- | :------------- |
| **React Components** (`*.tsx`) | ≤ 400 lines | **500 lines**  |
| **Custom Hooks** (`use*.ts`)   | ≤ 200 lines | **250 lines**  |
| **Pure Utilities** (`*.ts`)    | ≤ 150 lines | **200 lines**  |

No legacy exceptions — `npm run check-lines` fails on any component `.tsx` over 500 lines.

---

## 2. Where to Add New Features

Do not expand root orchestrator views. Add code in the focused modules below.

### A. Settings UI

- **Do NOT** modify [SettingsModal.tsx](src/renderer/src/components/Settings/SettingsModal.tsx) for new options.
- **Do** add definitions in [settingsDefinitions/](src/renderer/src/components/Settings/settingsDefinitions/) (e.g. `appearanceSettings.tsx`).
- Plugins / hotkeys / about: [SettingsPluginsSection.tsx](src/renderer/src/components/Settings/SettingsPluginsSection.tsx), [SettingsHotkeysSection.tsx](src/renderer/src/components/Settings/SettingsHotkeysSection.tsx), [SettingsAboutSection.tsx](src/renderer/src/components/Settings/SettingsAboutSection.tsx).
- Controls: `components/Settings/controls/`.

### B. Graph View

- **Do NOT** add simulation, recording, or scrub logic in [GraphView.tsx](src/renderer/src/components/Graph/GraphView.tsx).
- **Do** use:
  - [useGraphSimulation.ts](src/renderer/src/components/Graph/useGraphSimulation.ts) + `Graph/simulation/*`
  - [useGraphTimeline.ts](src/renderer/src/components/Graph/useGraphTimeline.ts)
  - [useGraphRecording.ts](src/renderer/src/components/Graph/useGraphRecording.ts)
  - [GraphControls.tsx](src/renderer/src/components/Graph/GraphControls.tsx)
  - [graphLayout.ts](src/renderer/src/components/Graph/graphLayout.ts)

### C. Canvas View

- **Do NOT** grow [CanvasView.tsx](src/renderer/src/components/Canvas/CanvasView.tsx) for drawing or stage logic.
- **Do** use [CanvasStage.tsx](src/renderer/src/components/Canvas/CanvasStage.tsx), [useCanvasDrawing.ts](src/renderer/src/components/Canvas/useCanvasDrawing.ts), [useCanvasKeys.ts](src/renderer/src/components/Canvas/useCanvasKeys.ts).

### D. Editor & Git

- **Do NOT** add tab/preview logic to [EditorPane.tsx](src/renderer/src/components/Editor/EditorPane.tsx) — use [SinglePaneArea.tsx](src/renderer/src/components/Editor/SinglePaneArea.tsx).
- **Do NOT** grow [GitPanel.tsx](src/renderer/src/components/Sidebar/GitPanel.tsx) — use [useGit.ts](src/renderer/src/components/Sidebar/useGit.ts), [ChangesAccordion.tsx](src/renderer/src/components/Sidebar/ChangesAccordion.tsx), [HistoryAccordion.tsx](src/renderer/src/components/Sidebar/HistoryAccordion.tsx).

### E. Layout & Sidebar

- [Layout.tsx](src/renderer/src/components/Layout.tsx) — shell only; extract new blocks (e.g. [HeaderSearch.tsx](src/renderer/src/components/HeaderSearch.tsx)).
- [Sidebar.tsx](src/renderer/src/components/Sidebar/Sidebar.tsx) — routing only; panels live in `Sidebar/*Panel.tsx`.

---

## 3. Plugins

Meridian has two plugin categories:

### Core plugins (built-in)

Shipped with the app, listed in [SettingsPluginsSection.tsx](src/renderer/src/components/Settings/SettingsPluginsSection.tsx).
Enable/disable state lives in `pluginsEnabled` inside [useSettingsStore.ts](src/renderer/src/store/useSettingsStore.ts) and persists to `settings.json` on disk.

Current core plugins: word counter, daily notes, git autocommit, slash commands, backlinks, outline, table of contents, graph view, templates.

### Community plugins (shipped — Plugin API v1)

Application-wide plugins are loaded from app plugin directories:

- bundled plugins: repository-level `plugins/{id}/`, packaged as app resources
- user-installed plugins: Meridian app data `plugins/{id}/`
- legacy vault plugins: `{vault}/.meridian/plugins/{id}/`, still supported as extras

```
plugins/
  hello-plugin/
    manifest.json        ← id, name, version, main
    main.js              ← ESM module, renderer-only
```

**Registry & lifecycle:**

- `src/shared/pluginUrl.ts` — build/parse `meridian-plugin://` and `meridian-app-plugin://` URLs (single source of truth for plugin schemes)
- `src/main/plugins.ts` — app-level bundled/user plugin discovery and path resolution
- `src/renderer/src/plugins/types.ts` — `MeridianPlugin`, `PluginAPI`, `PluginCommand` interfaces
- `src/renderer/src/plugins/registry.ts` — register, enable/disable, list commands; `pruneCommunityPlugins(keepIds)` for vault switches
- `src/renderer/src/plugins/core/` — core plugins migrated to registry format

**Hooks available to plugins (v1):**

| Hook       | Description                                       |
| ---------- | ------------------------------------------------- |
| `commands` | Register commands visible in Command Palette (⌘K) |
| `onLoad`   | Called when plugin is enabled / vault opens       |
| `onUnload` | Called when plugin is disabled / vault closes     |

**Hot-reload:** Legacy vault-local plugins keep a dedicated chokidar watcher on `{vault}/.meridian/plugins/**/{main.js,manifest.json}` in `src/main/ipc.ts`. App-level plugins can be refreshed from Settings → Community Plugins with **Reload Plugins** or the per-plugin **Reload** button via `window.__meridianReloadPlugin(id)`.

**Security:** Community plugins run renderer-only (no Node `require`). App-level plugins are loaded via the validated `meridian-app-plugin://` scheme, while legacy vault plugins use `meridian-plugin://`. No `eval`. Protocol handlers resolve paths inside the selected plugin root and reject anything that escapes it.

**Where to register new hooks:** Add to `PluginAPI` in `plugins/types.ts`, implement in `plugins/registry.ts`.

See [SCOPE.md](SCOPE.md) for what is and isn't in scope.

---

## 4. Enforcement

```bash
npm run check-lines
npm run typecheck
npm run test
```

---

## 5. Dev launch

`npm run dev` unsets `ELECTRON_RUN_AS_NODE` (required in Cursor/VS Code). See [README.md](README.md) if Electron fails to start.
