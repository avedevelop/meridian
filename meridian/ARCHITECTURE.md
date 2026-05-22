# Meridian Component & Modularity Architecture

To prevent component bloat and preserve a clean, modular, and maintainable codebase, all developers and AI coding agents must adhere to the rules and guidelines defined below.

---

## 1. File Size Limits

We enforce strict maximum line count limits for files under the components and features tree to keep modules single-purpose and easy to review:

| File Type | Target Size | Strict Maximum Limit | Description / Exceptions |
| :--- | :--- | :--- | :--- |
| **React Components** (`*.tsx`) | **≤ 400 lines** | **500 lines** | UI layout, composition, and event handling. Legacy exceptions: `CanvasStage.tsx`, `SettingsContent.tsx`, `SketchpadView.tsx`. |
| **Custom Hooks** (`use*.ts`) | **≤ 200 lines** | **250 lines** | State management, side-effects, and subscription wiring. |
| **Pure Utilities** (`*.ts`) | **≤ 150 lines** | **200 lines** | Pure data processing, helpers, and types. |

---

## 2. Where to Add New Features

Before adding logic to any root orchestrator component, locate the correct target files or create new focused sub-modules. Do not expand main views directly.

### A. Settings UI
- **Do NOT** modify [SettingsModal.tsx](file:///Users/vladyslav/Documents/antigravity/fearless-hypatia/meridian/src/renderer/src/components/Settings/SettingsModal.tsx) to add new configurations.
- **Do** define settings definitions and custom rendering logic inside [settingsDefinitions.tsx](file:///Users/vladyslav/Documents/antigravity/fearless-hypatia/meridian/src/renderer/src/components/Settings/settingsDefinitions.tsx).
- Add new controls in `components/Settings/controls/`.

### B. Graph View
- **Do NOT** add force layout calculations, recording, or scrub logic directly in [GraphView.tsx](file:///Users/vladyslav/Documents/antigravity/fearless-hypatia/meridian/src/renderer/src/components/Graph/GraphView.tsx).
- **Do** place new logic in respective hooks:
  - Simulation behavior: [useGraphSimulation.ts](file:///Users/vladyslav/Documents/antigravity/fearless-hypatia/meridian/src/renderer/src/components/Graph/useGraphSimulation.ts)
  - Playback and timeline: [useGraphTimeline.ts](file:///Users/vladyslav/Documents/antigravity/fearless-hypatia/meridian/src/renderer/src/components/Graph/useGraphTimeline.ts)
  - Media/video recording: [useGraphRecording.ts](file:///Users/vladyslav/Documents/antigravity/fearless-hypatia/meridian/src/renderer/src/components/Graph/useGraphRecording.ts)
- Add timeline button controls in [GraphControls.tsx](file:///Users/vladyslav/Documents/antigravity/fearless-hypatia/meridian/src/renderer/src/components/Graph/GraphControls.tsx).

### C. Canvas View
- **Do NOT** modify [CanvasView.tsx](file:///Users/vladyslav/Documents/antigravity/fearless-hypatia/meridian/src/renderer/src/components/Canvas/CanvasView.tsx) for drawing, stage rendering, or zoom events.
- **Do** update the Konva layers and stage wrappers in [CanvasStage.tsx](file:///Users/vladyslav/Documents/antigravity/fearless-hypatia/meridian/src/renderer/src/components/Canvas/CanvasStage.tsx).
- Put mouse/pointer interaction logic in [useCanvasDrawing.ts](file:///Users/vladyslav/Documents/antigravity/fearless-hypatia/meridian/src/renderer/src/components/Canvas/useCanvasDrawing.ts) and keyboard events in [useCanvasKeys.ts](file:///Users/vladyslav/Documents/antigravity/fearless-hypatia/meridian/src/renderer/src/components/Canvas/useCanvasKeys.ts).

### D. Editor & Git Panel
- **Do NOT** add tab handling or preview pane toggles directly to [EditorPane.tsx](file:///Users/vladyslav/Documents/antigravity/fearless-hypatia/meridian/src/renderer/src/components/Editor/EditorPane.tsx). Update [SinglePaneArea.tsx](file:///Users/vladyslav/Documents/antigravity/fearless-hypatia/meridian/src/renderer/src/components/Editor/SinglePaneArea.tsx) instead.
- **Do NOT** place Git panel operations or accordions inside [GitPanel.tsx](file:///Users/vladyslav/Documents/antigravity/fearless-hypatia/meridian/src/renderer/src/components/Sidebar/GitPanel.tsx). Place them in [useGit.ts](file:///Users/vladyslav/Documents/antigravity/fearless-hypatia/meridian/src/renderer/src/components/Sidebar/useGit.ts), [ChangesAccordion.tsx](file:///Users/vladyslav/Documents/antigravity/fearless-hypatia/meridian/src/renderer/src/components/Sidebar/ChangesAccordion.tsx), or [HistoryAccordion.tsx](file:///Users/vladyslav/Documents/antigravity/fearless-hypatia/meridian/src/renderer/src/components/Sidebar/HistoryAccordion.tsx).

---

## 3. Enforcement

Run the following command before committing any component modifications to check for file-size limit violations:
```bash
npm run check-lines
```
