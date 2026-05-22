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

| File Type | Target Size | Strict Maximum |
| :--- | :--- | :--- |
| **React Components** (`*.tsx`) | ≤ 400 lines | **500 lines** |
| **Custom Hooks** (`use*.ts`) | ≤ 200 lines | **250 lines** |
| **Pure Utilities** (`*.ts`) | ≤ 150 lines | **200 lines** |

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

## 3. Enforcement

```bash
npm run check-lines
npm run typecheck
npm run test
```

---

## 4. Dev launch

`npm run dev` unsets `ELECTRON_RUN_AS_NODE` (required in Cursor/VS Code). See [README.md](README.md) if Electron fails to start.
