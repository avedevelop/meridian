# Plan: Meridian — дорожная карта до релиза (релиз в конце)

> **Workspace:** `/Users/vladyslav/Desktop/dev/new project/meridian` only.  
> **Repo root:** `/Users/vladyslav/Desktop/dev/new project`  
> One task = one commit. Read `meridian/ARCHITECTURE.md` + `meridian/SCOPE.md` before coding.

**Принцип:** сначала продукт стабилен локально (плагины, граф, доки, тесты), **релизная инфраструктура — последняя часть**.

**Уже сделано (не повторять):**

- Plugin API v1, community settings, sample в `demo-vault` / `meridian-welcome`
- Graph polish Parts 1–5 (LOD, физика, glow, auto-fit, sidebar UX)
- CSP fix `meridian-plugin:` (коммит `dcc1df3`, может быть не на GitHub)
- Stabilize v1 (toasts, plugin list refetch, SCOPE milestones)

---

## Промпты (копировать в новый чат)

### Мастер-промпт (вся дорожная карта, без релиза)

```
Read these files first:
- docs/superpowers/plans/2026-05-24-meridian-roadmap-to-release.md
- meridian/ARCHITECTURE.md
- meridian/SCOPE.md

Workspace: /Users/vladyslav/Desktop/dev/new project/meridian ONLY (not Antigravity clones).

Execute Parts 0→7 in order from the roadmap plan. Skip Part 8 (release) unless I explicitly say "do Part 8".

Rules:
- One task = one commit (see plan for commit message hints)
- After each Part: npm run typecheck && npm run test && npm run check-lines
- Do not bundle multiple Parts in one commit
- Do not add Obsidian compatibility, mobile, sync, WebGL graph, or marketplace

Report after each Part: what changed, commit hashes, smoke results.
Stop before Part 8 and list what remains for release.
```

### Part 0 — Push и планы

```
Read docs/superpowers/plans/2026-05-24-meridian-roadmap-to-release.md Part 0 only.

1. git push origin main (if ahead)
2. Commit untracked plan docs under docs/superpowers/plans/
3. Confirm meridian-welcome smoke: npm run dev works

Do not implement Part 1+ in this session.
```

### Part 1 — Плагины стабильны

```
Read docs/superpowers/plans/2026-05-24-meridian-roadmap-to-release.md Part 1.
Workspace: meridian/ only.

Execute all Part 1 tasks (1.1–1.4): load error in toast, vault switch plugin logic, PLUGIN_DEVELOPMENT smoke, tests.
One commit per task. Run typecheck, test, check-lines after Part 1.

Smoke: Settings → Community → enable Sample Plugin → ⌘K "Sample: Show Greeting Toast" → no CSP errors in DevTools.
Do not start Part 2.
```

### Part 2 — Plugin v1.1

```
Read docs/superpowers/plans/2026-05-24-meridian-roadmap-to-release.md Part 2.
Workspace: meridian/ only. Part 1 is done.

Execute Part 2: hot-reload on main.js/manifest change, per-plugin reload button, ARCHITECTURE.md community = shipped.
One commit per task. typecheck + test + check-lines.
Do not start Part 3.
```

### Part 3 — Граф large vault

```
Read docs/superpowers/plans/2026-05-24-meridian-roadmap-to-release.md Part 3.
Workspace: meridian/ only.

Execute Part 3: truncation banner i18n, sessionStorage skip confirm, large graph test fixture.
One commit per task. typecheck + test + check-lines.
```

### Part 4 — Рефактор Layout + docs

```
Read docs/superpowers/plans/2026-05-24-meridian-roadmap-to-release.md Part 4.
Workspace: meridian/ only.

Execute Part 4: split Layout.tsx under 450 lines, README test count + check-lines, AGENTS dev notes.
One commit per task. check-lines must pass.
```

### Part 5 — i18n

```
Read docs/superpowers/plans/2026-05-24-meridian-roadmap-to-release.md Part 5.
Workspace: meridian/ only.

Grep hardcoded strings in Settings + Graph, move to en.json/ru.json. Align demo-vault notes to Russian per AGENTS.md.
One commit per task.
```

### Part 6 — CI и тесты (не релиз)

```
Read docs/superpowers/plans/2026-05-24-meridian-roadmap-to-release.md Part 6.
Workspace: repo root for .github/workflows, meridian/ for tests.

Add .github/workflows/meridian-ci.yml (typecheck, test, check-lines on push/PR).
Expand unit tests for plugin vault switch. Optional: docs/TESTING.md manual matrix instead of Playwright.
Do NOT create release workflow or tag. That is Part 8 only.
```

### Part 7 — SCOPE backlog

```
Read docs/superpowers/plans/2026-05-24-meridian-roadmap-to-release.md Part 7.
Update meridian/SCOPE.md "Next milestones" to reflect completed work and real backlog.
One commit: docs: refresh SCOPE next milestones after v1 prep
```

### Part 8 — Релиз (ТОЛЬКО по явной команде)

```
Read docs/superpowers/plans/2026-05-24-meridian-roadmap-to-release.md Part 8 only.

Prerequisites (verify first): CI green on main, full smoke checklist passed, I approved v1.0.0.

Execute: CHANGELOG.md, package.json 1.0.0, meridian-release.yml (workflow_dispatch + tags), git tag v1.0.0, gh release with DMG.
Skip notarization unless I say "add notarization".
Push tag and release to GitHub when done.
```

---

## Статус на старт плана

| Область | Состояние |
|---------|-----------|
| Локальные коммиты | ~6 ahead `origin/main` (граф + CSP) |
| CI / CHANGELOG / notarization | Нет |
| Plugin API | Минимальный (commands + onLoad) |
| E2E | Нет |
| `Layout.tsx` | ~495 строк (у лимита 500) |

---

## Part 0 — Синхронизация репозитория (P0, 1 сессия)

**Цель:** GitHub = локальная `main`, планы в `docs/` закоммичены.

### Task 0.1: Push незапушенные коммиты

```bash
cd "/Users/vladyslav/Desktop/dev/new project"
git push origin main
```

**Verify:** `git status` → `main...origin/main` без ahead.

### Task 0.2: Закоммитить планы документации

**Files:**

- `docs/superpowers/plans/2026-05-24-graph-visual-polish.md`
- `docs/superpowers/plans/2026-05-24-meridian-roadmap-to-release.md` (этот файл)

**Commit:** `docs: add graph polish and roadmap plans`

**Smoke после push:** клон / другая машина → `cd meridian && npm run dev` → welcome vault.

---

## Part 1 — Community plugins: довести до «работает всегда» (P0)

**Контекст:** CSP исправлен; остаются UX и устойчивость при смене vault.

### Task 1.1: Тост с причиной ошибки загрузки

**Files:** `App.tsx`, `registry.ts`, `en.json`, `ru.json`

- [ ] В `catch` передавать `err.message` в i18n: `settings.plugins.community.loadFailedDetail` (`{{name}}: {{error}}`)
- [ ] Не дублировать тост из `App` и `registry` на одну ошибку — один путь

**Commit:** `fix(plugins): show load error detail in toast`

### Task 1.2: `pluginsEnabled` при смене vault

**Files:** `App.tsx`, `useSettingsStore.ts` (опционально)

- [ ] При `vault` change: не пытаться грузить id, которых нет в `listPlugins()`
- [ ] Опционально: сбрасывать enabled-state только для ids отсутствующих в текущем vault (не трогать core keys)

**Commit:** `fix(plugins): skip load for plugins missing in current vault`

### Task 1.3: Smoke checklist в PLUGIN_DEVELOPMENT.md

- [ ] Шаги: перезапуск dev, enable Sample, ⌘K, DevTools без CSP violation
- [ ] Ссылка на `index.html` CSP

**Commit:** `docs(plugins): expand community plugin smoke checklist`

### Task 1.4: Интеграционный тест загрузки (без Electron)

**Files:** `tests/renderer/pluginLoadCsp.test.ts` или расширить `plugins.test.ts`

- [ ] Unit: парсинг URL `meridian-plugin://id/main.js` (если вынесен helper)
- [ ] Документировать, что полный `import()` — manual smoke

**Commit:** `test(plugins): add plugin URL helper coverage`

**Part 1 verify:**

```bash
cd meridian && npm run typecheck && npm run test && npm run check-lines
```

Smoke: Settings → Community → Sample Plugin → toast «Hello» / команда в ⌘K.

---

## Part 2 — Plugin API v1.1 (P1, 2–3 коммита)

**Не в scope:** marketplace, Obsidian-совместимость, iframe-sandbox (→ Part 6 backlog в SCOPE).

### Task 2.1: Hot-reload при изменении `main.js`

**Files:** main watcher или renderer poll + `vault` IPC `PLUGIN_LIST` refresh

- [ ] File watcher на `{vault}/.meridian/plugins/**/main.js` и `manifest.json`
- [ ] При change: disable → reload module → enable (если был enabled)
- [ ] Debounce 300ms

**Commit:** `feat(plugins): hot-reload community plugins on file change`

### Task 2.2: Кнопка «Перезагрузить плагин» в UI

**Files:** `SettingsCommunityPluginsSection.tsx`, i18n

- [ ] Per-plugin reload рядом с toggle (только если enabled)

**Commit:** `feat(plugins): per-plugin reload in settings`

### Task 2.3: Синхронизация ARCHITECTURE.md

- [ ] Секция «Community plugins (planned)» → **shipped**
- [ ] Список hooks v1 актуален

**Commit:** `docs: mark community plugins as shipped in ARCHITECTURE`

---

## Part 3 — Граф и большие vault (P1)

**Контекст:** visual polish сделан; остаётся поведение на 400+ узлах и мелочи stabilize.

### Task 3.1: Graph truncation UX (stabilize D1–D2)

**Files:** `GraphView.tsx`, `graphLayout.ts`, i18n

- [ ] Баннер: «Показано X из Y» (i18n)
- [ ] `sessionStorage`: не спрашивать «все узлы» повторно в сессии

**Commit:** `feat(graph): clearer truncation banner and session skip confirm`

### Task 3.2: Dogfood на synthetic 500+ nodes

- [ ] Добавить скрипт или test fixture (не в production vault)
- [ ] Зафиксировать в плане/AGENTS лимиты `graphMaxNodes`

**Commit:** `test(graph): fixture for large vault truncation`

### Task 3.3: (Опционально) Local graph polish

- [ ] Только если в right panel уже есть local graph — проверить parity с global LOD

**Commit:** `fix(graph): align local graph label LOD with global` *(skip if N/A)*

---

## Part 4 — Кодовая гигиена (P2)

### Task 4.1: Рефактор `Layout.tsx` (< 450 строк)

**Files:** вынести header blocks → `LayoutHeader.tsx` или существующие модули

**Commit:** `refactor(layout): split Layout.tsx under line limit`

### Task 4.2: `GraphView.tsx` буфер до лимита

- [ ] Вынести оставшиеся inline styles / lod hint в `GraphLodHint.tsx` если > 480 строк

**Commit:** `refactor(graph): trim GraphView orchestrator size` *(only if check-lines risk)*

### Task 4.3: README и AGENTS актуализация

- [ ] README: число тестов (139+), `npm run check-lines`
- [ ] AGENTS: canonical workspace, `ELECTRON_RUN_AS_NODE`

**Commit:** `docs: update README test count and dev troubleshooting`

---

## Part 5 — i18n и строки (P2)

### Task 5.1: Grep hardcoded UI

```bash
cd meridian && rg '"[A-Z][^"]{8,}"' src/renderer/src/components/Settings src/renderer/src/components/Graph --glob '*.tsx'
```

- [ ] Перенести оставшиеся EN строки в `en.json` / `ru.json`

**Commit:** `i18n: localize remaining settings and graph strings`

### Task 5.2: Единый язык demo-vault

- [ ] `demo-vault` заметки на русском (AGENTS.md rule)

**Commit:** `chore(demo-vault): align sample notes language to Russian`

---

## Part 6 — Тесты и качество (P2, до релиза)

### Task 6.1: CI workflow (подготовка, без релиза)

**Create:** `.github/workflows/meridian-ci.yml`

```yaml
# on: push main, pull_request
# jobs: checkout → cd meridian → npm ci → typecheck → test → check-lines
```

**Commit:** `ci: add meridian typecheck test and check-lines workflow`

> **Примечание:** этот коммит технически «CI», но **не релиз** — не публикует артефакты. Полноценный release pipeline — только в Part 8.

### Task 6.2: Расширить coverage критичных путей

- [ ] `listPluginManifests` edge cases (уже частично)
- [ ] `shouldShowLabel` / graph truncation (есть)
- [ ] `togglePlugin` + vault switch behavior (после Task 1.2)

**Commit:** `test: cover plugin vault switch and graph helpers`

### Task 6.3: (Опционально) Playwright smoke

- [ ] Один тест: launch app headless, open settings — **только если время**
- [ ] Иначе: `docs/TESTING.md` manual matrix

**Commit:** `docs: add manual smoke test matrix` OR `test(e2e): settings opens`

---

## Part 7 — Backlog в SCOPE (не блокирует релиз)

Обновить `meridian/SCOPE.md` → **Next milestones** после выполнения Parts 1–6:

- In-app plugin registry browser
- Sandboxed iframe for untrusted plugins
- WebGL / force layout perf
- Windows/Linux QA sign-off

**Commit:** `docs: refresh SCOPE next milestones after v1 prep`

---

## Part 8 — Релиз (ПОСЛЕДНИЙ, P3)

> **Не начинать Part 8**, пока Parts 0–6 не пройдены smoke и CI зелёный.

### Task 8.1: Версионирование и CHANGELOG

**Files:**

- `meridian/package.json` → `"version": "1.0.0"`
- `meridian/CHANGELOG.md` — секции Added/Fixed/Changed с коммитами с graph + plugins

**Commit:** `chore(release): prepare 1.0.0 changelog`

### Task 8.2: Release CI / build artifacts

**Create:** `.github/workflows/meridian-release.yml`

- [ ] `workflow_dispatch` + tag `v*`
- [ ] `npm run build:mac` (и win/linux по желанию)
- [ ] Upload artifacts to GitHub Release

**Commit:** `ci: add release workflow for tagged builds`

### Task 8.3: GitHub Release v1.0.0

- [ ] Tag `v1.0.0`
- [ ] Release notes из CHANGELOG
- [ ] Прикрепить DMG (macOS minimum)

**Commit:** нет — git tag + `gh release create`

### Task 8.4: (Опционально) macOS notarization

**Files:** `electron-builder` config, Apple credentials в secrets

- [ ] Только после стабильного unsigned DMG
- [ ] Документировать в README

**Commit:** `ci: add macOS notarization for release builds`

### Task 8.5: Post-release

- [ ] README badge CI
- [ ] `meridian-welcome` repo: проверить sample plugin + CSP note для старых билдов

**Commit:** `docs: add CI badge and v1.0 install notes`

---

## Порядок выполнения (сводка)

```
Part 0  Push + docs plans
Part 1  Plugins stable (toast, vault switch, smoke)
Part 2  Plugin hot-reload + docs
Part 3  Graph large vault UX
Part 4  Layout refactor + README
Part 5  i18n sweep
Part 6  CI (test only) + tests
Part 7  SCOPE backlog update
Part 8  CHANGELOG → release workflow → tag 1.0.0 → (notarize)
         ▲
         └── РЕЛИЗ ТОЛЬКО ЗДЕСЬ
```

---

## Verification (каждая часть кроме 0 и 8)

```bash
cd meridian && npm run typecheck && npm run test && npm run check-lines
```

**Full smoke перед Part 8:**

1. Welcome vault: редактор, граф (LOD), canvas, git panel
2. Community plugin Sample: enable → ⌘K command → toast
3. Vault switch: нет ложных ошибок плагина
4. `graphMaxNodes` 400 vs 0 на тестовом vault
5. `npm run build:mac` локально без ошибок

---

## Anti-patterns

- ❌ Начинать Part 8 до зелёного CI и smoke
- ❌ Obsidian plugin compatibility / mobile / sync
- ❌ WebGL graph в этом плане
- ❌ Один коммит на весь Part 1–6
- ❌ Работать в Antigravity-клоне вместо Desktop `meridian/`

---

Промпты для каждой части — в начале файла, секция **«Промпты (копировать в новый чат)»**.
