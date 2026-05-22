# Plan: Переехавшая масса + стабильный `npm run dev`

> **For agentic workers:** One task = one commit. No new features. Workspace root is **only**:
>
> **`/Users/vladyslav/Desktop/dev/new project`**
>
> App code: `meridian/`. Do **not** edit `~/Documents/antigravity/fearless-hypatia`.

**Goal:**

1. Разбить оставшиеся «тяжёлые» модули (масса после рефакторинга A–E), пока они не снова стали god-файлами.
2. Сделать `npm run dev` надёжным из Cursor, терминала и VS Code (без падения `registerSchemesAsPrivileged`).

**Prerequisite (human):** Нормальный workspace уже открыт на Desktop-пути. Перед стартом агента:

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
npm run test   # must be 120/120
```

---

## Текущие «переехавшие» файлы (2026-05-23)

| Файл | Строк | Лимит | Приоритет |
|------|-------|-------|-----------|
| `Settings/settingsDefinitions.tsx` | ~857 | 500 / split | **P0** |
| `Canvas/CanvasStage.tsx` | ~869 | 500 (legacy exception) | **P1** |
| `Settings/SettingsContent.tsx` | ~708 | 500 (legacy exception) | **P1** |
| `Graph/useGraphSimulation.ts` | ~713 | 250 (hook) | **P1** |
| `Sidebar/Sidebar.tsx` | ~807 | 500 | P2 |
| `Layout.tsx` | ~739 | 500 | P2 |
| `Editor/SketchpadView.tsx` | ~627 | 500 | P2 |
| `Graph/GraphSidebar.tsx` | ~583 | 500 | P3 |
| `Editor/TabBar.tsx` | ~521 | 500 | P3 |

`check-lines` сейчас **игнорирует** часть legacy — цель плана: **сжать файлы**, затем **убрать исключения** из awk в `package.json`.

---

## Part 0 — Workspace hygiene (один раз)

### Task 0.1: Fix ARCHITECTURE.md paths

**Problem:** Ссылки ведут на `file:///Users/.../fearless-hypatia/...`.

**Files:** `meridian/ARCHITECTURE.md`

**Steps:**

- [ ] Replace all `fearless-hypatia` paths with relative markdown links, e.g. `[SettingsModal.tsx](src/renderer/src/components/Settings/SettingsModal.tsx)`.
- [ ] Add top section **Canonical workspace:**

```markdown
## Canonical workspace

- Repo root: `/Users/vladyslav/Desktop/dev/new project`
- App: `meridian/`
- Do not develop in `~/Documents/antigravity/*` copies.
```

**Commit:** `docs: fix ARCHITECTURE paths, declare canonical workspace`

---

### Task 0.2: AGENTS.md workspace banner

**Files:** `meridian/AGENTS.md` (top of file, after title)

**Steps:**

- [ ] Add 5-line box: workspace path, `npm run dev` from `meridian/`, never use Antigravity clone.

**Commit:** `docs: AGENTS.md canonical workspace note`

---

## Part 1 — Стабильный dev launch (сделать первым, быстрый win)

### Symptom

```
TypeError: Cannot read properties of undefined (reading 'registerSchemesAsPrivileged')
```

Main process запускается как **Node**, не как **Electron**, когда в окружении выставлен `ELECTRON_RUN_AS_NODE=1` (Cursor, некоторые IDE, CI).

### Task 1.1: Safe dev script in package.json

**Files:** `meridian/package.json`

**Steps:**

- [ ] Change scripts:

```json
"dev": "env -u ELECTRON_RUN_AS_NODE electron-vite dev",
"dev:raw": "electron-vite dev"
```

(`env -u` works on macOS/Linux; removes the var for child process only.)

- [ ] Optional convenience:

```json
"dev:kill": "lsof -ti :5173 | xargs kill -9 2>/dev/null || true"
```

**Verify:**

```bash
cd meridian
ELECTRON_RUN_AS_NODE=1 npm run dev
```

Окно Electron должно открыться без TypeError.

**Commit:** `fix: unset ELECTRON_RUN_AS_NODE in dev script`

---

### Task 1.2: VS Code / Cursor launch config

**Files:** `meridian/.vscode/launch.json`, `meridian/.vscode/tasks.json` (create if missing)

**Steps:**

- [ ] In **Debug Main Process** `env`, add:

```json
"ELECTRON_RUN_AS_NODE": ""
```

Or use `env` block that unsets (VS Code: omit key or set empty — test on Mac).

- [ ] Add `tasks.json` task **Meridian: Dev**:

```json
{
  "label": "Meridian: Dev",
  "type": "shell",
  "command": "npm run dev",
  "options": { "cwd": "${workspaceFolder}/meridian", "env": {} },
  "isBackground": true,
  "problemMatcher": []
}
```

If workspace root is repo root (`new project`), `cwd` must be `${workspaceFolder}/meridian`.

- [ ] Document in `meridian/README.md` § Запуск:

```bash
cd meridian
npm run dev
```

If fails: `unset ELECTRON_RUN_AS_NODE && npm run dev`.

**Commit:** `fix: vscode launch and dev task for meridian`

---

### Task 1.3: Root README dev troubleshooting

**Files:** `README.md` or `meridian/README.md`

**Steps:**

- [ ] Short subsection «Dev не стартует» с симптомом, `env -u`, порт 5173 (`npm run dev:kill`).

**Commit:** `docs: dev launch troubleshooting`

**Part 1 done when:** `ELECTRON_RUN_AS_NODE=1 npm run dev` works; smoke: app opens, Settings ⌘, opens.

---

## Part 2 — P0: `settingsDefinitions.tsx` (Task A6)

**Target structure:**

```
components/Settings/
  settingsDefinitions/
    index.ts                    # buildSettingsDefinitions() merges arrays
    types.ts                    # re-export SettingDefinition if needed
    editorSettings.tsx
    filesSettings.tsx
    appearanceSettings.tsx
    canvasSettings.tsx
    pluginsSettings.tsx
    exportSettings.tsx
    syncSettings.tsx
    hotkeysSettings.tsx
    aboutSettings.tsx
```

### Task 2.1: Create category modules

**Steps:**

- [ ] Each file exports `buildXxxSettings(t: TFunction): SettingDefinition[]` — copy-paste blocks from current file by `category: 'editor'` etc.
- [ ] Shared render imports: controls from `../controls/`, `i18n` only in builders.
- [ ] `index.ts`:

```ts
export function buildSettingsDefinitions(t: TFunction): SettingDefinition[] {
  return [
    ...buildEditorSettings(t),
    ...buildFilesSettings(t),
    // ...
  ]
}
```

- [ ] Delete old monolith `settingsDefinitions.tsx` OR make it re-export from `./settingsDefinitions/index.ts` (update imports in `SettingsModal` / `SettingsContent`).

**Limits:** Each `*Settings.tsx` ≤ **400** lines; if one category >400, split further (e.g. `appearanceTheme.ts` + `appearanceTypography.ts`).

**Verify:** `npm run typecheck`, `npm run test`, Settings: every category shows rows, language switch ru/en works.

**Commit:** `refactor(settings): split settingsDefinitions by category`

---

### Task 2.2: Tighten check-lines for settingsDefinitions

**Files:** `meridian/package.json` — `check-lines` awk

**Steps:**

- [ ] Remove `settingsDefinitions` from exception regex once file is a folder of smaller files.
- [ ] `npm run check-lines` passes.

**Commit:** `chore: enforce check-lines on settings definitions modules`

---

## Part 3 — P1: `useGraphSimulation.ts` (~713)

### Task 3.1: Split simulation hook

**Target:**

```
Graph/
  useGraphSimulation.ts       # ≤200: orchestrator only
  simulation/
    buildGraphData.ts         # nodes, links, slice(400), degree
    createD3Simulation.ts       # forces, tick wiring
    graphNodeStyles.ts        # nodeR, colors (or keep in graphLayout.ts)
    useGraphVisibility.ts     # updateVisibility / birthtimes (from timeline overlap)
```

**Steps:**

- [ ] Extract pure functions first (no React), testable.
- [ ] Hook composes: data → sim → refs cleanup (ResizeObserver unchanged).
- [ ] **Do not** change `MAX_GRAPH_NODES = 400` behavior; add constant + comment in `buildGraphData.ts`.
- [ ] Optional small UI follow-up (separate commit): banner in `GraphControls` when `files.length > 400` — product, not refactor.

**Verify:** Graph opens, scrub, play, node click, record if present.

**Commit:** `refactor(graph): split useGraphSimulation into modules`

---

## Part 4 — P1: `CanvasStage.tsx` (~869)

### Task 4.1: Split Konva layers

**Target:**

```
Canvas/
  CanvasStage.tsx             # ≤350: Stage + Layer composition
  stages/
    CanvasNodesLayer.tsx      # cards / notes
    CanvasLinksLayer.tsx
    CanvasSelectionLayer.tsx
  canvasNodeRenderers.tsx     # per-node type render (if huge block)
```

**Steps:**

- [ ] Identify natural JSX blocks in `CanvasStage` (map over items, tool modes).
- [ ] Pass props down; no behavior change.
- [ ] Keep pointer handlers in `useCanvasDrawing.ts` — only move JSX that belongs to stage.

**Commit:** `refactor(canvas): split CanvasStage layers`

---

### Task 4.2: `SettingsContent.tsx` (~708)

**Steps:**

- [ ] Extract `SettingRow.tsx` (single row: label, description, render child) if not exists.
- [ ] Extract `SettingsCategoryHeader.tsx`.
- [ ] Extract list mapping to `SettingsDefinitionList.tsx`.
- [ ] Target `SettingsContent.tsx` ≤ **350** lines.

**Commit:** `refactor(settings): split SettingsContent`

---

## Part 5 — P2/P3 (optional, после Part 2–4)

| Task | File | Approach |
|------|------|----------|
| 5.1 | `Sidebar.tsx` | Extract panels already mounted? Move tab switcher + layout to `SidebarShell.tsx`, each panel lazy |
| 5.2 | `Layout.tsx` | Extract `MainEditorLayout`, `RightSidebarLayout`, icon bar |
| 5.3 | `SketchpadView.tsx` | Same as Canvas: toolbar / stage / tools |
| 5.4 | `GraphSidebar.tsx` | Filters vs stats vs actions — 3 files |
| 5.5 | `TabBar.tsx` | `TabItem.tsx`, `useTabDrag.ts` |

После каждого: commit, test, smoke.

---

## Part 6 — Убрать legacy exceptions из `check-lines`

**When:** All P0–P1 files ≤500 (components) / ≤250 (hooks).

**Files:** `meridian/package.json`, `meridian/ARCHITECTURE.md`

**Steps:**

- [ ] Shrink awk exception list to zero or only `Layout.tsx` if still slightly over after 5.2.
- [ ] Update ARCHITECTURE table — remove «Legacy exceptions» row or list none.
- [ ] `npm run check-lines` is the gate for PRs.

**Commit:** `chore: remove legacy exceptions from check-lines`

---

## Verification matrix (every task)

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
npm run typecheck
npm run test          # 120/120
npm run check-lines   # after Part 2.2+
```

| Area | Smoke |
|------|--------|
| Dev | App window opens |
| Settings | ⌘, → all categories → language ru/en |
| Graph | ⌘⇧G → timeline |
| Canvas | open `.canvas` → draw → undo |
| Editor | open `.md` → save ⌘S |

---

## Execution order (strict)

```
Part 0 (docs)     → 15 min
Part 1 (dev fix)  → 30 min   ← пользователь сразу перестаёт страдать
Part 2 (settings) → 1–2 sessions
Part 3 (graph hook)
Part 4 (canvas + settings content)
Part 5 (optional)
Part 6 (check-lines cleanup)
```

**Do not** run Part 2 and Part 3 in one commit.

---

## Prompt template for AI

> Workspace: `/Users/vladyslav/Desktop/dev/new project` only.  
> Read `docs/superpowers/plans/2026-05-23-relocated-mass-and-dev-launch.md`.  
> Execute **Task 1.1 only** (dev script `env -u ELECTRON_RUN_AS_NODE`).  
> Verify with `ELECTRON_RUN_AS_NODE=1 npm run dev`. One commit. Do not start Task 1.2.

---

## Success metrics

| Metric | Now | Target |
|--------|-----|--------|
| `npm run dev` with `ELECTRON_RUN_AS_NODE=1` | fails | passes |
| Files >500 lines (no exceptions) | ~8 | ≤2 optional |
| `settingsDefinitions` monolith | 1×857 | folder, each <400 |
| `useGraphSimulation` | 713 | ≤250 orchestrator + utils |
| ARCHITECTURE links | wrong path | relative / repo |
| Second workspace edits | risk | documented never |

---

## Anti-patterns

- ❌ Править `fearless-hypatia`
- ❌ Новые фичи в refactor PR
- ❌ Менять i18n keys при переносе строк
- ❌ Один коммит на Part 2+3+4
- ❌ Удалять `slice(0,400)` без отдельного UX task

---

## Estimated effort

| Part | Commits | Time (agent) |
|------|---------|----------------|
| 0 | 2 | 20 min |
| 1 | 3 | 45 min |
| 2 | 2 | 2–3 h |
| 3 | 1–2 | 2 h |
| 4 | 2 | 2–3 h |
| 5 | 0–5 | optional |
| 6 | 1 | 15 min |

**Total:** ~8–12 commits for «must have» (Part 0–4 + 6).
