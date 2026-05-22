# Refactor Plan: «Ширина без дисциплины» — разбиение длинных файлов

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. **One task = one commit.** Do not mix refactor with new features. After each task: `npm run typecheck`, `npm run test`, manual smoke (open affected screen).

**Goal:** Снизить размер god-компонентов Meridian до поддерживаемых модулей без изменения поведения UI.

**Problem:** AI добавляет фичи в существующий файл → монолиты 1000–2200 строк. Ревью, тесты и следующие AI-сессии ломаются.

**Architecture (target):** Каждый экран = тонкий `*View.tsx` (разметка + wiring) + `hooks/` + `utils/` + `components/` + опционально `types.ts`. Данные настроек/графа — в отдельных `*.ts`, не внутри JSX.

**Discipline rules (обязательны на весь план):**

| Правило | Значение |
|--------|----------|
| Макс. строк в `*.tsx` компоненте | **400** (жёсткий потолок **500**) |
| Макс. строк в `use*.ts` хуке | **250** |
| Макс. строк в pure `*.ts` util | **200** |
| Новые фичи во время плана | **Запрещены** — только `refactor:` коммиты |
| Поведение | Идентично до/после (пиксель-паритет не нужен, функциональный паритет — да) |
| Стили | На первых 3 задачах **не** выносить в CSS-модули; копировать `style={{}}` как есть |
| i18n | Все `t('...')` ключи **сохранять**; при переносе не менять строки |
| Импорты | Публичный API папки через `index.ts` re-export только если уже есть паттерн в проекте |

**Verification (каждая задача):**

```bash
cd meridian
npm run typecheck
npm run test
```

Smoke checklist в конце задачи — открыть экран, 2–3 клика по критичным действиям.

---

## Current state (2026-05-22)

| Файл | Строк | Приоритет |
|------|-------|-----------|
| `Settings/SettingsModal.tsx` | ~2233 | P0 |
| `Canvas/CanvasView.tsx` | ~1758 | P1 |
| `Graph/GraphView.tsx` | ~1447 | P1 |
| `Editor/EditorPane.tsx` | ~968 | P2 |
| `Sidebar/GitPanel.tsx` | ~861 | P2 |
| `Sidebar/Sidebar.tsx` | ~807 | P3 |

---

## File map (итоговая структура)

### Settings (после Phase A)

```
components/Settings/
  SettingsModal.tsx              # ≤350 строк: shell, layout, category routing
  settingsTypes.ts               # SettingCategory, SettingDefinition, props
  settingsDefinitions.tsx        # массив definitions + render fns (или split по category)
  settingsCategories.ts          # categoriesList metadata
  SettingsNav.tsx                # левая колонка + search
  SettingsContent.tsx            # правая колонка + filtered list
  SettingsGitHubSection.tsx      # GitHub device flow (из SettingsModal)
  controls/
    Toggle.tsx
    Slider.tsx
    Dropdown.tsx
    TextInput.tsx
    TextAreaInput.tsx
    ColorPicker.tsx
    SettingRow.tsx               # обёртка label + description + children
  categories/
    EditorSettings.tsx           # optional: если definitions слишком большой
    AppearanceSettings.tsx
    FilesSettings.tsx
    PluginsSettings.tsx
    SyncSettings.tsx
    ...
```

### Graph (после Phase B)

```
components/Graph/
  GraphView.tsx                  # ≤350: container, refs, compose hooks
  graphTypes.ts                  # GNode, GLink, D3State
  graphLayout.ts                 # flattenFiles, nodeR, nodeColor, degree calc
  useGraphSimulation.ts          # D3 sim build, tick, resize observer
  useGraphTimeline.ts            # progress, play, birthtimes
  useGraphRecording.ts           # canvas capture, MediaRecorder
  GraphControls.tsx              # нижняя панель play/scrub/record
  GraphCanvas.tsx                # svg mount div (если нужно)
```

### Canvas (после Phase C)

```
components/Canvas/
  CanvasView.tsx                 # ≤400
  canvasTypes.ts
  useCanvasTools.ts
  useCanvasSelection.ts
  CanvasToolbar.tsx
  CanvasStage.tsx                # Konva Stage wiring
```

---

## Phase A — SettingsModal (P0)

**Why first:** Самый большой файл; дублирует UI primitives; ломается при i18n; AI чаще всего правит именно его.

### Task A1: Extract shared setting controls

**Files:**
- Create: `components/Settings/controls/Toggle.tsx`, `Slider.tsx`, `Dropdown.tsx`, `TextInput.tsx`, `TextAreaInput.tsx`, `ColorPicker.tsx`
- Modify: `SettingsModal.tsx` — delete inline components, import from `./controls/`

**Steps:**
- [ ] Cut-paste `Toggle`, `Slider`, `Dropdown`, `TextInput`, `TextAreaInput`, `ColorPicker` без логических изменений
- [ ] Export types for `Dropdown` props if generic
- [ ] `SettingsModal.tsx` должен уменьшиться на ~300–400 строк
- [ ] typecheck + test + smoke: open Settings ⌘,

**Commit:** `refactor(settings): extract setting control components`

---

### Task A2: Extract types and category icons

**Files:**
- Create: `settingsTypes.ts`, `settingsCategoryIcons.tsx` (or `.ts` if no JSX)
- Modify: `SettingsModal.tsx`

**Steps:**
- [ ] Move `SettingCategory`, `SettingDefinition`, `SettingsModalProps`, helper types → `settingsTypes.ts`
- [ ] Move `getCategoryIcon` → `settingsCategoryIcons.tsx`
- [ ] Re-export types from `settingsTypes.ts` for consumers

**Commit:** `refactor(settings): extract types and category icons`

---

### Task A3: Extract GitHub sync block

**Files:**
- Create: `SettingsGitHubSection.tsx`
- Modify: `SettingsModal.tsx`

**Steps:**
- [ ] Move state: `ghConnecting`, `ghUserCode`, `ghConnected`, `ghUsername`, `ghError`
- [ ] Move handlers: `handleGithubConnect`, poll logic
- [ ] Pass `store` / callbacks as props
- [ ] SettingsModal only renders `<SettingsGitHubSection />` in sync category

**Commit:** `refactor(settings): extract GitHub settings section`

---

### Task A4: Extract settings definitions

**Files:**
- Create: `settingsDefinitions.tsx` (or split `settingsDefinitions/editor.ts`, `appearance.ts`, … if single file >500 lines)
- Modify: `SettingsModal.tsx`

**Steps:**
- [ ] Move `settingsDefinitions` array + factory `buildSettingsDefinitions(t: TFunction, ...)` 
- [ ] Function receives `t`, `store` accessors, `i18n` for language onChange
- [ ] **Critical:** `useMemo` dependency array must include `t` and `language` exactly as before (reactive i18n)
- [ ] `SettingsModal` calls `const defs = useMemo(() => buildSettingsDefinitions(...), [deps])`

**Commit:** `refactor(settings): extract settings definitions builder`

---

### Task A5: Split modal shell vs content

**Files:**
- Create: `SettingsNav.tsx`, `SettingsContent.tsx`
- Modify: `SettingsModal.tsx` → orchestrator only

**Steps:**
- [ ] `SettingsNav`: title, close, search input, category list
- [ ] `SettingsContent`: maps `filteredSettings` → `SettingRow` + render fn
- [ ] `SettingsModal`: `isOpen`, overlay, `activeCategory`, wires children
- [ ] Target: `SettingsModal.tsx` **≤350 lines**

**Commit:** `refactor(settings): split nav and content panels`

---

### Task A6 (optional): Split definitions by category

Only if `settingsDefinitions.tsx` still >500 lines.

- [ ] `categories/editorSettings.ts`, `appearanceSettings.ts`, …
- [ ] `buildSettingsDefinitions` merges arrays

**Commit:** `refactor(settings): split definitions by category`

**Phase A done when:** `SettingsModal.tsx` ≤400 lines, all tests green, Settings smoke passed.

---

## Phase B — GraphView (P1)

### Task B1: Extract pure graph helpers

**Files:**
- Create: `graphTypes.ts`, `graphLayout.ts`
- Modify: `GraphView.tsx`

**Steps:**
- [ ] Move `GNode`, `GLink`, `D3State`, `GraphViewProps`
- [ ] Move `flattenFiles`, `nodeR`, `nodeColor`, `labelColor`, `getNodeGroup`
- [ ] Move edge/node building logic (degree map, slice 400) into `buildGraphData(files, outlinks): { nodes, links }`
- [ ] Add **comment + optional UI later**: `MAX_GRAPH_NODES = 400` constant with JSDoc «vault truncated»

**Commit:** `refactor(graph): extract layout helpers and types`

---

### Task B2: Extract timeline + playback hook

**Files:**
- Create: `useGraphTimeline.ts`
- Modify: `GraphView.tsx`

**Steps:**
- [ ] Move `progress`, `isPlaying`, `playDuration`, `birthtimes`, `minTime`, `maxTime`, `updateVisibility`, play `useEffect`
- [ ] Return `{ progress, setProgress, isPlaying, togglePlay, formattedDate, updateVisibility, ... }`

**Commit:** `refactor(graph): extract useGraphTimeline hook`

---

### Task B3: Extract D3 simulation hook

**Files:**
- Create: `useGraphSimulation.ts`
- Modify: `GraphView.tsx`

**Steps:**
- [ ] Move `containerRef`, `d3Ref`, ResizeObserver, sim build/teardown
- [ ] Hook accepts `nodes`, `links`, `onNodeClick`, `indexVersion`
- [ ] Expose `svgEl` ref for recording

**Commit:** `refactor(graph): extract useGraphSimulation hook`

---

### Task B4: Extract recording + controls UI

**Files:**
- Create: `useGraphRecording.ts`, `GraphControls.tsx`
- Modify: `GraphView.tsx`

**Steps:**
- [ ] Recording logic → hook
- [ ] Bottom bar JSX → `GraphControls.tsx`
- [ ] `GraphView.tsx` ≤350 lines

**Commit:** `refactor(graph): extract recording hook and controls bar`

**Phase B done when:** `GraphView.tsx` ≤400 lines, graph opens ⌘⇧G, scrub + play work.

---

## Phase C — CanvasView (P1)

### Task C1: Extract types + tool constants

**Files:** `canvasTypes.ts`, `canvasTools.ts`

### Task C2: Extract toolbar UI

**Files:** `CanvasToolbar.tsx`

### Task C3: Extract Konva stage subtree

**Files:** `CanvasStage.tsx` + `useCanvasDrawing.ts` (pointer handlers)

### Task C4: Thin `CanvasView.tsx`

**Commit pattern:** one commit per task, same verification.

**Phase C done when:** `CanvasView.tsx` ≤400 lines, create/open `.canvas`, draw, undo ⌘Z.

---

## Phase D — EditorPane + GitPanel (P2)

Same pattern:
1. Extract hooks (`useEditorTabs`, `useSpellCheck`, …)
2. Extract subcomponents (`EditorToolbar`, `SplitPaneLayout`, …)
3. Leave thin orchestrator

**Do not** refactor CodeMirror extensions in same PR — only move files, keep `extensions/` as-is.

---

## Phase E — Guardrails for future AI (P3)

### Task E1: Add `meridian/ARCHITECTURE.md` (short)

Contents:
- Max file sizes table (from this plan)
- «Where to add a new setting» → `settingsDefinitions/` not `SettingsModal.tsx`
- «Where to add graph feature» → `useGraph*.ts` or `GraphControls.tsx`

### Task E2: Add CI or pre-commit line check (optional)

```bash
# Example check script — fail if any component tsx > 500 lines
find src/renderer/src/components -name '*.tsx' -exec wc -l {} + | awk '$1 > 500 { exit 1 }'
```

### Task E3: Update root `README.md` roadmap

Mark phases 2–5 as done; add «Maintenance: file size limits» link to ARCHITECTURE.md.

**Commit:** `docs: add component size limits and architecture guide`

---

## Agent workflow (how to execute)

```
FOR each Task A1 → A6, B1 → B4, C1 → C4:
  1. Read ONLY the target file(s) for this task
  2. Create new file(s) via move/refactor — no behavior change
  3. Run typecheck + test
  4. Smoke test (see below)
  5. git commit with message from task
  6. STOP — do not start next task in same commit
```

**If typecheck fails:** fix imports/types in scope of task; do not «fix unrelated».

**If test fails:** update test imports only; do not change assertions unless test was coupling to private implementation (prefer exporting moved symbol).

---

## Smoke tests (minimal)

| Phase | Steps |
|-------|--------|
| A Settings | ⌘, → switch categories → change language en/ru → toggle one plugin → close |
| B Graph | ⌘⇧G → scrub timeline → play → open node |
| C Canvas | Open `.canvas` → draw → undo |
| D Editor | Open `.md` → split view → save ⌘S |
| D Git | Open Git panel → status loads (no crash) |

---

## Anti-patterns (AI must NOT do)

- ❌ «Заодно улучшу Graph» — новые фичи в refactor PR
- ❌ Переписать на CSS modules / Tailwind в середине плана
- ❌ Объединять Phase A + B в один коммит
- ❌ Менять `useLinkStore` singleton pattern без отдельного плана
- ❌ Удалять `slice(0, 400)` без отдельного product task
- ❌ Переименовывать i18n keys «для порядка»

---

## Success metrics

| Metric | Before | After (target) |
|--------|--------|----------------|
| Files >1000 lines in `components/` | 3 | 0 |
| Largest component | ~2233 | ≤400 |
| Tests passing | 120 | 120 |
| Time per AI task | whole file context | one module |

---

## Prompt template for a new AI session

Copy-paste:

> Read `docs/superpowers/plans/2026-05-22-refactor-long-files.md` and `meridian/AGENTS.md`. Execute **Task A1 only** (extract setting controls). Rules: no new features, no style migration, keep i18n keys. Run `npm run typecheck` and `npm run test` in `meridian/`. One commit. Do not start Task A2.

Replace `A1` with next task after previous is merged.

---

## Estimated effort

| Phase | Tasks | Agent sessions (approx) |
|-------|-------|-------------------------|
| A Settings | 5–6 | 5–6 |
| B Graph | 4 | 4 |
| C Canvas | 4 | 4 |
| D Editor/Git | 6–8 | 6–8 |
| E Docs/CI | 2–3 | 1 |

**Total:** ~20–25 focused commits over 3–5 days of agent work (not calendar — depends on review).

---

## Order of execution (strict)

1. Phase A (Settings) — highest ROI  
2. Phase B (Graph) — user has file open often  
3. Phase C (Canvas)  
4. Phase D (Editor, Git)  
5. Phase E (guardrails)  

**Stop condition:** Any phase can pause after its tasks; each task is shippable.
