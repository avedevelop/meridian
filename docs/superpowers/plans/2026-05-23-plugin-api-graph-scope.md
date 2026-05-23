# Plan: Plugin API + Graph >400 notes + Product Scope

> **For agentic workers:** One task = one commit. Workspace: `/Users/vladyslav/Desktop/dev/new project/meridian` only.
>
> Read `meridian/ARCHITECTURE.md` before coding. No unrelated refactors.

**Goals:**

1. **Plugin API v1** — формальный контракт + загрузка community plugins из vault (не «тогглы в Settings»).
2. **Graph >400** — честное поведение: не молча резать, дать выбор и умный отбор узлов.
3. **Scope** — зафиксировать в репо, что Meridian **есть** и чего **нет** (не Obsidian-killer).

**Non-goals (v1 этого плана):**

- Совместимость с Obsidian `.obsidian/plugins`
- Mobile / cloud sync
- WebGL/graph rewrite
- Plugin marketplace / подпись сертификатов

---

## Part 0 — Product scope (сделать первым, 1 сессия)

### Task 0.1: Create `meridian/SCOPE.md`

**Create:** `meridian/SCOPE.md`

**Sections (обязательные):**

```markdown
# Meridian — Product Scope

## What Meridian is
Local-first markdown knowledge base for macOS/desktop. Plain files, wiki-links, graph, canvas.

## In scope (shipped / maintaining)
- Vault on disk, CodeMirror, preview, tabs, split
- Wiki-links, backlinks, tags, search, command palette
- Graph view (force-directed, performance limits documented)
- Canvas + sketchpad, daily notes, templates
- Git panel + optional autocommit
- Core plugins (built-in, toggleable)
- Community plugins via .meridian/plugins (after Plugin API v1)
- i18n en + ru

## Out of scope (explicitly not promised)
- Full Obsidian plugin compatibility
- Obsidian Sync / Publish
- Mobile apps
- Real-time collaboration
- Dataview / Bases / advanced queries
- Signed notarization (until separate release task)

## Positioning (use in README)
"Local-first notes app inspired by Obsidian — not a drop-in replacement."
```

**Commit:** `docs: add SCOPE.md with in/out of scope`

---

### Task 0.2: Align README marketing

**Files:** `/README.md`, `meridian/README.md`

**Steps:**

- [ ] Replace «full-featured alternative to Obsidian» → scope line from SCOPE.md
- [ ] Phase 4 roadmap: rename to «Core plugins + Plugin API v1» with link to SCOPE.md
- [ ] Add link: `[Product scope](meridian/SCOPE.md)`

**Commit:** `docs: align README positioning with SCOPE.md`

---

### Task 0.3: ARCHITECTURE.md — plugins section

**Files:** `meridian/ARCHITECTURE.md`

**Steps:**

- [ ] Add § **Plugins** — core vs community paths, where to register hooks (after Part 1).

**Commit:** `docs: document plugin layout in ARCHITECTURE`

---

## Part 1 — Graph: >400 notes (2–3 commits)

### Current behavior (problem)

`graphLayout.ts` → `filteredPaths.slice(0, MAX_GRAPH_NODES)` — **первые 400** после фильтров, без предупреждения.

### Task 1.1: Graph build metadata + smart truncation

**Files:**

- `meridian/src/renderer/src/components/Graph/graphTypes.ts`
- `meridian/src/renderer/src/components/Graph/graphLayout.ts`
- `meridian/src/renderer/src/components/Graph/useGraphSimulation.ts` (consumers)

**Steps:**

- [ ] Add types:

```ts
export interface GraphBuildResult {
  nodes: GNode[]
  links: GLink[]
  totalEligible: number      // after filters, before cap
  displayedCount: number
  truncated: boolean
  maxNodes: number
}
```

- [ ] Add setting in `useSettingsStore.ts`:

```ts
graphMaxNodes: 200 | 400 | 800 | 0   // 0 = no cap (show warning)
```

Default `400`. Persist in settings JSON like other fields.

- [ ] Replace dumb `slice(0, N)` with:

```ts
function applyNodeCap(paths: string[], degree: Record<string, number>, max: number): string[] {
  if (max === 0 || paths.length <= max) return paths
  // Prefer highly connected nodes, then recency (mtime) if available on VaultFile
  return [...paths]
    .sort((a, b) => (degree[b] ?? 0) - (degree[a] ?? 0))
    .slice(0, max)
}
```

Wire `mtime` from `VaultFile` map if cheap; else degree-only is OK for v1.

- [ ] `buildGraphData` returns `GraphBuildResult` (rename or wrap).

- [ ] Export `MAX_GRAPH_NODES` as default constant; setting overrides.

**Verify:** vault with 500+ md files → `truncated: true`, `totalEligible > 400`.

**Commit:** `feat(graph): smart node cap with build metadata`

---

### Task 1.2: UI warning + settings control

**Files:**

- `meridian/src/renderer/src/components/Graph/GraphControls.tsx` (or new `GraphTruncationBanner.tsx`)
- `meridian/src/renderer/src/components/Graph/GraphSidebar.tsx` (optional duplicate info)
- `meridian/src/renderer/src/components/Settings/settingsDefinitions/appearanceSettings.tsx` or `canvasSettings` — prefer **appearance** or new `graphSettings.tsx` under settingsDefinitions
- `meridian/src/i18n/locales/en.json`, `ru.json`

**UI spec:**

- Banner (when `truncated`):
  - EN: `Showing {displayed} of {total} notes. Graph limited for performance.`
  - Actions: **Increase limit** (cycles 400→800→no cap), **Open filters** (focus sidebar filters)
- When `graphMaxNodes === 0` and `totalEligible > 600`: confirm dialog once per session:
  - «Rendering {n} nodes may be slow. Continue?»

**Settings dropdown:**

| Value | Label |
|-------|--------|
| 200 | Fast (200 nodes) |
| 400 | Balanced (default) |
| 800 | Detailed (800 nodes) |
| 0 | All nodes (slow) |

**i18n keys:** `graph.truncation.banner`, `graph.settings.maxNodes`, etc.

**Verify:** change setting → graph rebuilds; banner disappears when under cap.

**Commit:** `feat(graph): truncation banner and max nodes setting`

---

### Task 1.3: Tests for graph cap

**Files:** `meridian/tests/renderer/graphLayout.test.ts` (new)

**Cases:**

- 500 paths, max 400 → `truncated === true`, `displayedCount === 400`
- High-degree node always included when truncated
- max 0 → all paths returned

**Commit:** `test(graph): node cap and truncation metadata`

**Part 1 done when:** user with large vault sees banner; no silent cut.

---

## Part 2 — Plugin API v1 (4–6 commits)

### Design summary

```
Core plugins (shipped in repo)     Community plugins (user vault)
plugins/core/*.ts                  {vault}/.meridian/plugins/{id}/
  implements MeridianPlugin          manifest.json
                                     main.js (prebuilt ESM, trusted path)
        ↓                                    ↓
              PluginRegistry (renderer)
                      ↓
              PluginHost in App.tsx
         hooks: commands, settings?, panels?
```

**Security v1:** Community plugins run **renderer-only**, no Node `require`. Load only from `{vault}/.meridian/plugins/*` via dynamic `import()` with path validated in **main** IPC (`assertInsideVault`). No `eval`.

---

### Task 2.1: Plugin types + registry

**Create:**

- `meridian/src/renderer/src/plugins/types.ts`
- `meridian/src/renderer/src/plugins/registry.ts`
- `meridian/src/renderer/src/plugins/core/index.ts`

**`MeridianPlugin` interface (v1):**

```ts
export interface MeridianPlugin {
  id: string
  name: string
  version: string
  author?: string
  description?: string
  minAppVersion?: string
  // Lifecycle
  onLoad?(api: PluginAPI): void | Promise<void>
  onUnload?(): void
  // Contributions
  commands?: PluginCommand[]
}

export interface PluginCommand {
  id: string
  title: string
  run: (api: PluginAPI) => void | Promise<void>
}

export interface PluginAPI {
  vault: typeof window.vault  // subset typed later
  settings: { get<T>(key: string): T; set(key: string, value: unknown): void }
  ui: {
    toast(message: string): void
    openSettings?(tab?: string): void
  }
  registerCommand(cmd: PluginCommand): void
}
```

**Registry:**

- `registerCorePlugin(plugin: MeridianPlugin)`
- `loadCommunityPlugin(manifest, moduleExports)` 
- `getCommands()`, `getPlugin(id)`, `enable/disable` state in settings

**Commit:** `feat(plugins): add types and registry`

---

### Task 2.2: Migrate one core plugin (proof)

**Example:** `plugins/core/wordCounter.ts` — move logic trigger from scattered checks to `onLoad` registering status bar contribution OR keep status bar read but register metadata from plugin.

**Minimal proof:** `plugins/core/dailyNotes.ts` registers command `daily-note` → calls existing `openDailyNote` via API.

**Wire in `App.tsx`:**

```ts
useEffect(() => {
  initCorePlugins(pluginAPI)
}, [vault])
```

**Steps:**

- [ ] Move 2–3 core features to `plugins/core/` as manifests
- [ ] `SettingsPluginsSection` reads list from `registry.getCorePlugins()` instead of hardcoded `pluginsList`
- [ ] `pluginsEnabled` keys stay same ids (backward compatible saves)

**Commit:** `refactor(plugins): migrate core plugins to registry`

---

### Task 2.3: Community plugin loader (main + preload)

**Files:**

- `meridian/src/shared/types.ts` — `PLUGIN_LIST`, `PLUGIN_LOAD`
- `meridian/src/main/ipc.ts` — scan `{vault}/.meridian/plugins/*/manifest.json`
- `meridian/src/preload/index.ts` — `listPlugins()`, `loadPlugin(id)`
- `meridian/src/main/vault.ts` — `listPluginManifests()`, `readPluginMain(vault, id)`

**`manifest.json` schema:**

```json
{
  "id": "hello",
  "name": "Hello Plugin",
  "version": "1.0.0",
  "main": "main.js",
  "minAppVersion": "1.0.0"
}
```

**Load flow:**

1. Renderer on vault open → `listPlugins()` → show in Settings → Community tab
2. User enables → `loadPlugin(id)` → main reads file → returns URL or source string
3. Renderer `import(/* @vite-ignore */ url)` or fetch + Function wrapper **avoid** — prefer `file://` via custom protocol `meridian-plugin://` registered in main (same pattern as `vault://`)

**Recommended:** Register `meridian-plugin` protocol → serve files from `.meridian/plugins/` inside vault.

**Commit:** `feat(plugins): IPC and protocol for community plugins`

---

### Task 2.4: Settings UI — Core vs Community

**Files:**

- `SettingsPluginsSection.tsx` → split tabs or sections
- New `SettingsCommunityPluginsSection.tsx`
- i18n strings

**Community UI:**

- List installed manifests from vault
- Enable/disable per plugin (persist `communityPluginsEnabled: Record<string, boolean>`)
- Button «Open plugins folder» → `{vault}/.meridian/plugins`
- Link to `meridian/PLUGIN_DEVELOPMENT.md`

**Commit:** `feat(plugins): community plugins settings UI`

---

### Task 2.5: Command palette integration

**Files:** `CommandPalette.tsx`

**Steps:**

- [ ] Merge `registry.getCommands()` into palette (prefix `plugin:` or show plugin name)
- [ ] Disabled plugins' commands hidden

**Commit:** `feat(plugins): expose plugin commands in command palette`

---

### Task 2.6: Plugin development doc + sample

**Create:**

- `meridian/PLUGIN_DEVELOPMENT.md`
- `meridian/sample-plugin/` or `docs/sample-plugin/` with minimal `manifest.json` + `main.js` that registers one command

**Create:** `meridian/.meridian/plugins/.gitkeep` in demo-vault or document folder layout.

**Commit:** `docs: PLUGIN_DEVELOPMENT.md and sample plugin`

---

### Task 2.7: Hardening

**Steps:**

- [ ] Plugin load errors → toast, don't crash app
- [ ] `onUnload` when disabling / closing vault
- [ ] Typecheck `PluginAPI` vault subset (Pick from window.vault)
- [ ] Tests: registry register/list; graph unrelated

**Commit:** `fix(plugins): error boundaries and unload lifecycle`

**Part 2 done when:** sample plugin in `.meridian/plugins/` loads and adds a command.

---

## Part 3 — Settings store migration (optional small commit)

**Problem:** `pluginsEnabled` is fixed keyof; community plugins need dynamic ids.

**Steps:**

- [ ] `pluginsEnabled: Record<string, boolean>` with known core ids as defaults
- [ ] Migration on `loadFromDisk`: merge old boolean map
- [ ] `togglePlugin(id: string)`

**Commit:** `refactor(plugins): dynamic plugin enable map`

---

## Verification (full plan)

```bash
cd meridian
npm run typecheck
npm run test
npm run check-lines
```

| Area | Smoke |
|------|--------|
| Scope | README links SCOPE.md, wording updated |
| Graph | 500+ note vault → banner, change max nodes |
| Plugins | Enable sample plugin → command in ⌘K |
| Core | Existing toggles still work |

---

## Execution order

```
Part 0 (scope docs)     → 3 commits, ~30 min
Part 1 (graph)          → 3 commits, ~2 h
Part 2 (plugin API)     → 7 commits, ~1–2 days agent time
Part 3 (settings map)   → 1 commit, after 2.4
```

**Do not** start Part 2 before Part 0 (scope prevents scope creep).

---

## Prompt template

> Workspace: `/Users/vladyslav/Desktop/dev/new project/meridian`.  
> Read `docs/superpowers/plans/2026-05-23-plugin-api-graph-scope.md`.  
> Execute **Task 0.1 only** (create SCOPE.md). One commit.

---

## Success metrics

| Metric | Target |
|--------|--------|
| README claims | Match SCOPE.md |
| Graph silent truncation | 0 (banner always when truncated) |
| Community plugin loads from vault | 1 sample works |
| Core plugins | Still 9 toggles, now via registry |
| New files follow ARCHITECTURE limits | check-lines pass |

---

## Future (not this plan)

- Plugin signing / marketplace
- Obsidian plugin adapter (separate RFC)
- WebGL graph for «all nodes»
- Plugin sandbox iframe (stricter security)
- `graphMaxNodes` adaptive by FPS
