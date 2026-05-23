# Plan: Graph View — визуальная чистота (меньше «грязи»)

> **Workspace:** `/Users/vladyslav/Desktop/dev/new project/meridian` only.  
> One task = one commit. No new graph features (export video, new layouts) — только читаемость и дефолты.

**Problem (как на скриншоте welcome-vault):**
- Все подписи узлов видны сразу → наложение текста в кластере
- Слабое отталкивание + короткие связи → «комок» в центре
- Glow-halo на каждом узле → визуальный шум
- Легенда внизу перекрывает граф
- Связи одинаковой яркости → «паутина»

**Target:** граф как Obsidian — спокойный на zoom-out, читаемый на zoom-in / hover.

---

## Диагностика (файлы)

| Симптом | Причина в коде |
|---------|----------------|
| Наложение labels | `useGraphVisibility.ts` → `text.attr('opacity', 1)` для всех видимых узлов |
| Плотный кластер | `GraphView.tsx` defaults: `linkDistance=70`, `repulsionStrength=-80`; `forceCollide(nodeR+8)` мало |
| Шум glow | `createD3Simulation.ts` → radial gradient halo на каждом узле |
| Легенда поверх графа | `GraphView.tsx` / CSS — legend overlay bottom-center |
| Слабый preset Default | Совпадает с тесными дефолтами; «Galaxy» (125/-40) не default |

---

## Part 1 — Лучшие дефолты физики (P0, 1 commit)

**Files:** `GraphView.tsx`, `GraphSidebarFilters.tsx`, optional `graphDefaults.ts`

**Changes:**

- [ ] Новые defaults для **live mode** (welcome-sized vaults ~10–30 nodes):
  - `linkDistance`: **70 → 100**
  - `repulsionStrength`: **-80 → -160**
  - `linkThickness`: **1 → 0.8** (тоньше линии)
- [ ] Обновить preset **«По умолчанию»** под те же значения
- [ ] Добавить preset **«Читаемый» / Readable** (новый):
  - `linkDistance: 110`, `repulsion: -200`, `textSize: 10`
- [ ] В `createD3Simulation.ts`:
  - `forceCollide`: `nodeR(d) + 12 + (textSize * 0.5)` — учитывать подпись
  - `forceLink.strength`: **0.4 → 0.25** (меньше стягивания)
  - `sim.alphaDecay(0.02)` и `sim.velocityDecay(0.35)` — быстрее стабилизация
- [ ] После `createD3Simulation`: `sim.tick(120)` до показа (warmup), затем `alphaTarget(0)`

**Verify:** открыть demo-vault graph — узлы не слипаются, кластер шире.

**Commit:** `fix(graph): relax default forces and collision for clearer layout`

---

## Part 2 — Label LOD: подписи по зуму (P0, 1–2 commits)

**Problem:** на overview все labels = каша.

**Files:** `useGraphVisibility.ts`, `useGraphSimulation.ts`, `GraphSidebarFilters.tsx`, i18n

### Task 2.1: Label display mode setting

**Setting** (sidebar «Настройки отображения»):

| Mode | Поведение |
|------|-----------|
| `auto` (default) | Labels только при `zoom >= 1.2` ИЛИ degree ≥ 2 ИЛИ hover |
| `hover` | Labels только hover + выбранный узел |
| `all` | Как сейчас (power users) |

Store in component state or `localStorage` key `meridian:graph-label-mode`.

### Task 2.2: Wire zoom to label opacity

- [ ] В `useGraphSimulation` / zoom handler: read `transform.k` from d3 zoom
- [ ] `updateLabelVisibility(k, hoveredId)`:
  - `auto`: `opacity = (k >= 1.2 || d.degree >= 2 || d.id === hovered) ? 1 : 0`
  - Truncate long names: `name.length > 24 ? name.slice(0,22)+'…' : name`
- [ ] При `opacity 0` оставить **hit area** (transparent circle) для hover

**i18n:** `graph.labelMode.auto`, `hover`, `all`, descriptions.

**Commit:** `feat(graph): label LOD by zoom and display mode`

---

## Part 3 — Визуальный шум (P1, 1–2 commits)

### Task 3.1: Glow halo — опционально

- [ ] Sidebar toggle: «Свечение узлов» (default **off** for new users, or off when nodes > 15)
- [ ] `createD3Simulation.ts`: skip glow circle when disabled

### Task 3.2: Links — иерархия яркости

- [ ] Default link opacity: **0.12** (было 0.22)
- [ ] Highlight on hover: incident links **0.45**, rest **0.06**
- [ ] Optional: hide links between low-degree nodes when `zoom < 0.8`

### Task 3.3: Legend position

- [ ] Перенести легенду в **sidebar** (compact rows) или bottom-left с `pointer-events: none` + полупрозрачный фон
- [ ] Убрать дублирование: legend в sidebar уже есть в «Интерактивная легенда» — **удалить overlay на canvas**

**Commit:** `refactor(graph): reduce link noise, optional glow, move legend off canvas`

---

## Part 4 — Авто-fit и orphan spacing (P1, 1 commit)

**Files:** `GraphView.tsx`, `useGraphSimulation.ts`

- [ ] После simulation warmup: `zoomToFit` (d3 zoom transform) с padding 40px
- [ ] `forceX` / `forceY` слабые к центру вместо жёсткого `forceCenter` — меньше «выбросов» типа orphan слева
- [ ] Orphan nodes: слабый `forceRadial` на внешнее кольцо (optional, only if degree === 0)

**Commit:** `feat(graph): auto-fit viewport on load and softer centering`

---

## Part 5 — Sidebar UX (P2, 1 commit)

- [ ] При открытии графа sidebar **свёрнут по умолчанию** на маленьких окнах (`width < 1200`) — больше места canvas
- [ ] Кнопка «Сбросить вид» — reset zoom + forces to defaults
- [ ] Подсказка при первом открытии: «Увеличьте масштаб для подписей» (once, sessionStorage)

**Commit:** `feat(graph): sidebar collapse default and reset view button`

---

## Part 6 — Tests (P1)

**File:** `tests/renderer/graphLabelLod.test.ts` (unit pure functions)

Extract helpers:
```ts
export function shouldShowLabel(mode, zoomK, degree, isHovered): boolean
export function truncateLabel(name: string, maxLen: number): string
```

**Commit:** `test(graph): label LOD helpers`

---

## Execution order

```
Part 1 (defaults)  → сразу видно на скриншоте
Part 2 (label LOD) → главный fix «грязи»
Part 3 (visual)    → polish
Part 4 (fit)       → framing
Part 5 (UX)        → optional
Part 6 (tests)     → with Part 2
```

**Do NOT** bundle Part 1+2 in one commit.

---

## Verification

```bash
cd meridian && npm run typecheck && npm run test && npm run check-lines
```

**Smoke (demo-vault / meridian-welcome):**

1. Open Graph — кластер не «комок», orphan не прилипает к центру
2. Zoom out — **подписи скрыты** (mode auto)
3. Zoom in на кластер — подписи появляются
4. Hover узла — label + соседние links ярче
5. Toggle glow off — чище
6. Legend не перекрывает центр графа
7. Preset «Galaxy» / новый «Readable» — заметно различимы

---

## Success metrics

| Metric | Before | After |
|--------|--------|-------|
| Readable labels at default zoom | No | Yes (hover/zoom) |
| Default cluster overlap | High | Low |
| Legend over graph content | Yes | No |
| New files > 500 lines | — | No |

---

## Anti-patterns

- ❌ Canvas/WebGL rewrite
- ❌ Edge bundling library (scope creep)
- ❌ Менять `MAX_GRAPH_NODES` logic
- ❌ Все labels всегда on по умолчанию

---

## Prompt template

```
Read docs/superpowers/plans/2026-05-24-graph-visual-polish.md and meridian/ARCHITECTURE.md.
Workspace: /Users/vladyslav/Desktop/dev/new project/meridian only.

Execute Part 1 only (default physics + collide + warmup ticks). One commit.
Run typecheck, test, check-lines. Smoke on meridian-welcome graph.
```
