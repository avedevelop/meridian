# Meridian Foundation Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Meridian's six-wave foundation roadmap: structured properties, note types/templates, relationships, saved views/workflows, Git trust UI, read-only Ask Vault, and a softer utility-focused interface.

**Architecture:** Ship this as six sequential release waves, each with its own detailed implementation plan before code changes. Wave 1 creates shared frontmatter/property primitives; subsequent waves build on those primitives instead of reparsing Markdown in UI components.

**Tech Stack:** Electron, React 19, TypeScript, Zustand, Vitest, CodeMirror, Markdown files, YAML frontmatter, local filesystem IPC, Git CLI integration.

---

## Scope Check

The approved spec covers six independent subsystems. Implementing all six in one coding pass would be brittle and hard to review. This master plan defines the full sequence and gives Wave 1 enough task detail to start safely. Before each subsequent wave starts, create a wave-specific implementation plan under `docs/superpowers/plans/`.

## File Structure Map

### Shared model and parsing

- Create `meridian/src/shared/frontmatter.ts`: Markdown frontmatter extraction, YAML parsing, serialization, property mutations, value typing.
- Modify `meridian/src/shared/types.ts`: shared property, note type, relation, and saved view types as waves introduce them.
- Modify `meridian/src/renderer/src/lib/linkParser.ts`: consume shared frontmatter helpers for tags and, in Wave 3, relation references.

### Renderer UI

- Modify `meridian/src/renderer/src/components/RightPanel/PropertiesPanel.tsx`: replace prompt-based property editing with typed inline controls.
- Create `meridian/src/renderer/src/components/RightPanel/properties/`: small property editor components split by field type.
- Modify `meridian/src/renderer/src/components/RightPanel/RightPanel.tsx`: add future relationship/history/Ask Vault panels through the existing tab pattern.
- Modify `meridian/src/renderer/src/components/Sidebar/TasksPanel.tsx`, `CalendarPanel.tsx`, `GitPanel.tsx`: integrate planned views/workflows while preserving current tester fixes.
- Modify `meridian/src/renderer/src/components/CommandPalette/CommandPalette.tsx`: add create-as, views, and Ask Vault commands as their waves land.

### State and indexing

- Modify `meridian/src/renderer/src/store/useLinkStore.ts`: index typed metadata, relation properties, saved views, and context packs over time.
- Create `meridian/src/renderer/src/store/useMetadataStore.ts`: typed note metadata cache after Wave 1 proves the shared parser.
- Create `meridian/src/renderer/src/store/useViewsStore.ts`: saved views and filters in Wave 4.

### Main process and vault config

- Modify `meridian/src/main/vault.ts`: read/write vault-local Meridian config and templates.
- Modify `meridian/src/main/ipc.ts`: expose type/template/view/Git history/AI provider IPC as each wave requires it.
- Modify `meridian/src/main/settings.ts`: persist app-level AI provider settings in Wave 6.

### Design system

- Modify `meridian/src/renderer/src/assets/meridian.css`: add Soft Utility Workspace tokens and reduce harsh dividers.
- Modify layout components incrementally: `Layout.tsx`, `LayoutHeader.tsx`, `ActivityBar.tsx`, `TabBar.tsx`, right/sidebar panels.

### Tests

- Modify `meridian/tests/renderer/properties.test.ts`: move tests from local helper copies to shared module imports.
- Create `meridian/tests/shared/frontmatter.test.ts`: core parser/serializer tests.
- Add wave-specific renderer/main tests alongside existing patterns.

## Wave 1: Properties Core

**Outcome:** Right panel becomes a reliable typed properties editor backed by shared YAML/frontmatter utilities.

### Task 1: Add YAML dependency

**Files:**
- Modify: `meridian/package.json`
- Modify: `meridian/package-lock.json`

- [ ] **Step 1: Install dependency**

Run:

```bash
cd meridian
npm install yaml
```

Expected: `yaml` appears in `dependencies`, package lock updates, no install errors.

- [ ] **Step 2: Verify baseline**

Run:

```bash
cd meridian
npm run typecheck
npm run test
```

Expected: existing typecheck and tests pass before parser migration.

- [ ] **Step 3: Commit dependency**

```bash
git add meridian/package.json meridian/package-lock.json
git commit -m "chore: add yaml parser dependency"
```

### Task 2: Create shared frontmatter utility

**Files:**
- Create: `meridian/src/shared/frontmatter.ts`
- Create: `meridian/tests/shared/frontmatter.test.ts`
- Modify: `meridian/tests/renderer/properties.test.ts`

- [ ] **Step 1: Write failing shared parser tests**

Create `meridian/tests/shared/frontmatter.test.ts` with cases for no frontmatter, empty frontmatter, strings, arrays, numbers, booleans, dates, malformed YAML, preserving body content, setting a property, deleting a property, and replacing frontmatter without changing the note body.

Example test shape:

```ts
import { describe, expect, it } from 'vitest'
import {
  parseMarkdownFrontmatter,
  setFrontmatterProperty,
  removeFrontmatterProperty
} from '../../src/shared/frontmatter'

describe('shared frontmatter utilities', () => {
  it('parses typed YAML values and preserves the Markdown body', () => {
    const note = '---\ntitle: Project Alpha\ncount: 3\ndone: false\ntags: [work, alpha]\n---\n\n# Body'

    const parsed = parseMarkdownFrontmatter(note)

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.data.properties).toEqual({
      title: 'Project Alpha',
      count: 3,
      done: false,
      tags: ['work', 'alpha']
    })
    expect(parsed.data.body).toBe('# Body')
  })

  it('adds frontmatter to a note without changing the body', () => {
    const updated = setFrontmatterProperty('Plain body', 'status', 'draft')
    expect(updated).toBe('---\nstatus: draft\n---\n\nPlain body')
  })

  it('removes a property and keeps remaining properties', () => {
    const note = '---\ntitle: A\nstatus: draft\n---\n\nBody'
    const updated = removeFrontmatterProperty(note, 'status')
    expect(updated).toBe('---\ntitle: A\n---\n\nBody')
  })
})
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
cd meridian
npm run test -- tests/shared/frontmatter.test.ts
```

Expected: fails because `src/shared/frontmatter.ts` does not exist.

- [ ] **Step 3: Implement shared utility**

Create `meridian/src/shared/frontmatter.ts` with exported types and functions:

```ts
import { parseDocument, Scalar, YAMLMap, YAMLSeq } from 'yaml'

export type FrontmatterPrimitive = string | number | boolean | null
export type FrontmatterValue = FrontmatterPrimitive | FrontmatterPrimitive[]
export type FrontmatterProperties = Record<string, FrontmatterValue>

export interface ParsedFrontmatter {
  properties: FrontmatterProperties
  body: string
  raw: string | null
}

export type FrontmatterParseResult =
  | { ok: true; data: ParsedFrontmatter }
  | { ok: false; error: string; body: string; raw: string }

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n)?/

function normalizeValue(value: unknown): FrontmatterValue {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'number' || typeof item === 'boolean' || item === null) return item
      return String(item)
    })
  }
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value
  return value === undefined ? '' : String(value)
}

function serializeScalar(value: FrontmatterValue): unknown {
  return value
}

export function parseMarkdownFrontmatter(content: string): FrontmatterParseResult {
  const match = content.match(FRONTMATTER_RE)
  if (!match) {
    return { ok: true, data: { properties: {}, body: content, raw: null } }
  }

  const raw = match[1]
  const body = content.slice(match[0].length)
  try {
    const parsed = parseDocument(raw)
    if (parsed.errors.length > 0) {
      return { ok: false, error: parsed.errors[0].message, body, raw }
    }

    const json = parsed.toJSON()
    const properties: FrontmatterProperties = {}
    if (json && typeof json === 'object' && !Array.isArray(json)) {
      for (const [key, value] of Object.entries(json as Record<string, unknown>)) {
        properties[key] = normalizeValue(value)
      }
    }

    return { ok: true, data: { properties, body, raw } }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err), body, raw }
  }
}

export function serializeFrontmatter(properties: FrontmatterProperties): string {
  const doc = parseDocument('')
  const map = new YAMLMap()
  for (const [key, value] of Object.entries(properties)) {
    if (Array.isArray(value)) {
      const seq = new YAMLSeq()
      for (const item of value) seq.add(new Scalar(item))
      map.set(key, seq)
    } else {
      map.set(key, serializeScalar(value))
    }
  }
  doc.contents = map
  return String(doc).trimEnd()
}

export function replaceFrontmatter(
  content: string,
  properties: FrontmatterProperties
): string {
  const parsed = parseMarkdownFrontmatter(content)
  const body = parsed.ok ? parsed.data.body : parsed.body
  const header = serializeFrontmatter(properties)
  if (!header.trim()) return body
  return `---\n${header}\n---\n\n${body}`
}

export function setFrontmatterProperty(
  content: string,
  key: string,
  value: FrontmatterValue
): string {
  const parsed = parseMarkdownFrontmatter(content)
  const properties = parsed.ok ? parsed.data.properties : {}
  return replaceFrontmatter(content, { ...properties, [key]: value })
}

export function removeFrontmatterProperty(content: string, key: string): string {
  const parsed = parseMarkdownFrontmatter(content)
  const properties = parsed.ok ? { ...parsed.data.properties } : {}
  delete properties[key]
  return replaceFrontmatter(content, properties)
}
```

- [ ] **Step 4: Run shared tests**

Run:

```bash
cd meridian
npm run test -- tests/shared/frontmatter.test.ts
```

Expected: shared frontmatter tests pass.

- [ ] **Step 5: Migrate existing properties tests**

Update `meridian/tests/renderer/properties.test.ts` to import shared functions instead of defining local helper copies. Keep the previous behavior checks, adjusted to the new typed parser result shape.

- [ ] **Step 6: Run parser test set**

Run:

```bash
cd meridian
npm run test -- tests/shared/frontmatter.test.ts tests/renderer/properties.test.ts
```

Expected: both test files pass.

- [ ] **Step 7: Commit parser utility**

```bash
git add meridian/src/shared/frontmatter.ts meridian/tests/shared/frontmatter.test.ts meridian/tests/renderer/properties.test.ts
git commit -m "feat: add shared frontmatter utilities"
```

### Task 3: Wire parser into existing link/tag parsing

**Files:**
- Modify: `meridian/src/renderer/src/lib/linkParser.ts`
- Modify: `meridian/tests/renderer/linkIndex.test.ts`
- Modify: `meridian/tests/renderer/useLinkStore.test.ts`

- [ ] **Step 1: Add tests for YAML list tags**

Add tests proving `tags: [work, ideas]` and multiline YAML list tags are indexed through the shared parser.

- [ ] **Step 2: Replace regex frontmatter tag parser**

Import `parseMarkdownFrontmatter` in `linkParser.ts`. Build tags from `properties.tags` when it is a string or array. Keep inline `#tag` parsing unchanged.

- [ ] **Step 3: Run link tests**

Run:

```bash
cd meridian
npm run test -- tests/renderer/linkIndex.test.ts tests/renderer/useLinkStore.test.ts
```

Expected: link/tag tests pass.

- [ ] **Step 4: Commit link parser migration**

```bash
git add meridian/src/renderer/src/lib/linkParser.ts meridian/tests/renderer/linkIndex.test.ts meridian/tests/renderer/useLinkStore.test.ts
git commit -m "refactor: use shared frontmatter parser for tags"
```

### Task 4: Rebuild PropertiesPanel as typed inline UI

**Files:**
- Modify: `meridian/src/renderer/src/components/RightPanel/PropertiesPanel.tsx`
- Create: `meridian/src/renderer/src/components/RightPanel/properties/PropertyRow.tsx`
- Create: `meridian/src/renderer/src/components/RightPanel/properties/PropertyValueInput.tsx`
- Create: `meridian/src/renderer/src/components/RightPanel/properties/propertyType.ts`
- Modify: `meridian/src/renderer/src/i18n/locales/en.json`
- Modify: `meridian/src/renderer/src/i18n/locales/ru.json`
- Test: `meridian/tests/renderer/PropertiesPanel.test.tsx`

- [ ] **Step 1: Write renderer tests**

Add tests for no open file, no frontmatter, adding a property, editing a text property, toggling a checkbox property, deleting a property, and showing malformed YAML error.

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
cd meridian
npm run test -- tests/renderer/PropertiesPanel.test.tsx
```

Expected: fails because typed inline UI does not exist yet.

- [ ] **Step 3: Split small property components**

Create property components with these responsibilities:

- `propertyType.ts`: infer `text`, `number`, `checkbox`, `date`, `tags`, or `relation` from value and property name.
- `PropertyValueInput.tsx`: render the correct input for the inferred type.
- `PropertyRow.tsx`: render label, value input, clear/delete controls.

- [ ] **Step 4: Update PropertiesPanel**

Use `parseMarkdownFrontmatter`, `setFrontmatterProperty`, and `removeFrontmatterProperty`. Remove `window.prompt` from property creation. Keep dirty tab behavior by calling `setTabContent` and `markTabDirty`.

- [ ] **Step 5: Add translations**

Add English and Russian strings for add property, property name, delete property, malformed frontmatter, empty properties, type labels, and relation hint.

- [ ] **Step 6: Run panel tests**

Run:

```bash
cd meridian
npm run test -- tests/renderer/PropertiesPanel.test.tsx
```

Expected: passes.

- [ ] **Step 7: Commit typed properties UI**

```bash
git add meridian/src/renderer/src/components/RightPanel/PropertiesPanel.tsx meridian/src/renderer/src/components/RightPanel/properties meridian/src/renderer/src/i18n/locales/en.json meridian/src/renderer/src/i18n/locales/ru.json meridian/tests/renderer/PropertiesPanel.test.tsx
git commit -m "feat: add typed properties panel"
```

### Task 5: Apply first Soft Utility Workspace pass to properties area

**Files:**
- Modify: `meridian/src/renderer/src/assets/meridian.css`
- Modify: `meridian/src/renderer/src/components/RightPanel/RightPanel.tsx`
- Modify: `meridian/src/renderer/src/components/RightPanel/PropertiesPanel.tsx`

- [ ] **Step 1: Add soft UI tokens**

Add CSS variables for soft surfaces, subtle dividers, grouped controls, panel spacing, focus rings, and quiet destructive actions. Keep dark and light theme support intact.

- [ ] **Step 2: Replace harsh property panel borders**

Use grouped surfaces and spacing instead of heavy framed cards. Keep hit targets at least 28px high.

- [ ] **Step 3: Verify text fit**

Run the app and inspect the properties panel with English and Russian strings at small window widths. Labels must wrap or truncate cleanly without overlapping controls.

- [ ] **Step 4: Run checks**

Run:

```bash
cd meridian
npm run typecheck
npm run lint
npm run test
```

Expected: typecheck, lint, and all tests pass.

- [ ] **Step 5: Commit UI pass**

```bash
git add meridian/src/renderer/src/assets/meridian.css meridian/src/renderer/src/components/RightPanel/RightPanel.tsx meridian/src/renderer/src/components/RightPanel/PropertiesPanel.tsx
git commit -m "style: soften properties workspace UI"
```

## Wave 2: Types And Templates Plan Track

**Detailed plan file to create before implementation:** `docs/superpowers/plans/YYYY-MM-DD-meridian-types-templates.md`

**Primary files:**
- `meridian/src/shared/types.ts`
- `meridian/src/shared/frontmatter.ts`
- `meridian/src/main/vault.ts`
- `meridian/src/main/ipc.ts`
- `meridian/src/renderer/src/components/CommandPalette/CommandPalette.tsx`
- `meridian/src/renderer/src/components/Sidebar/FilesPanel.tsx`
- `meridian/src/renderer/src/store/useMetadataStore.ts`
- `meridian/tests/main/vault.test.ts`
- `meridian/tests/renderer/CommandPalette.test.tsx`

**Required tasks:**

- [ ] Define `NoteTypeSchema`, `PropertySchema`, and `TemplateDefinition` in shared types.
- [ ] Add vault-local config read/write under `.meridian/types.json`.
- [ ] Add type/template IPC handlers with path-safe validation.
- [ ] Add `Create as...` entry points in sidebar and command palette.
- [ ] Apply default properties using the Wave 1 frontmatter utility.
- [ ] Add tests for Cyrillic paths, spaces, missing config, and malformed type config.
- [ ] Apply Soft Utility Workspace styling to the create flow.

**Verification command:**

```bash
cd meridian
npm run typecheck
npm run lint
npm run test
```

## Wave 3: Relationships Plan Track

**Detailed plan file to create before implementation:** `docs/superpowers/plans/YYYY-MM-DD-meridian-relationships.md`

**Primary files:**
- `meridian/src/shared/types.ts`
- `meridian/src/renderer/src/lib/linkParser.ts`
- `meridian/src/renderer/src/lib/linkIndex.ts`
- `meridian/src/renderer/src/store/useLinkStore.ts`
- `meridian/src/renderer/src/components/RightPanel/LocalGraphView.tsx`
- `meridian/src/renderer/src/components/RightPanel/BacklinksPanel.tsx`
- `meridian/src/renderer/src/components/RightPanel/RelationshipPanel.tsx`
- `meridian/src/renderer/src/components/Graph/graphLayout.ts`
- `meridian/tests/renderer/linkIndex.test.ts`

**Required tasks:**

- [ ] Define relation property shape and unresolved reference shape.
- [ ] Index relation properties next to wikilinks without dropping existing backlinks.
- [ ] Add relation autocomplete to property inputs.
- [ ] Add relationship browser panel.
- [ ] Improve local graph grouping with type and relation metadata.
- [ ] Add tests for resolved relations, unresolved relations, renamed file behavior, and path normalization.
- [ ] Apply Soft Utility Workspace styling to relationship browser and graph-adjacent controls.

**Verification command:**

```bash
cd meridian
npm run typecheck
npm run lint
npm run test
```

## Wave 4: Views And Workflows Plan Track

**Detailed plan file to create before implementation:** `docs/superpowers/plans/YYYY-MM-DD-meridian-views-workflows.md`

**Primary files:**
- `meridian/src/shared/types.ts`
- `meridian/src/main/vault.ts`
- `meridian/src/main/ipc.ts`
- `meridian/src/renderer/src/store/useViewsStore.ts`
- `meridian/src/renderer/src/components/Sidebar/ViewsPanel.tsx`
- `meridian/src/renderer/src/components/Sidebar/TasksPanel.tsx`
- `meridian/src/renderer/src/components/Sidebar/CalendarPanel.tsx`
- `meridian/src/renderer/src/components/CommandPalette/CommandPalette.tsx`
- `meridian/src/renderer/src/components/ActivityBar/ActivityBar.tsx`

**Required tasks:**

- [ ] Define saved view schema with list and table layout.
- [ ] Add filters for type, property, tag, date, task status, and relation.
- [ ] Store saved views in vault-local Meridian config.
- [ ] Add Views panel and command palette entries.
- [ ] Connect tasks and daily notes to view filters without duplicating checklist data.
- [ ] Add inbox view for uncategorized notes.
- [ ] Add tests for view persistence, filter matching, and live updates after file changes.
- [ ] Apply Soft Utility Workspace styling to list/table views and empty states.

**Verification command:**

```bash
cd meridian
npm run typecheck
npm run lint
npm run test
```

## Wave 5: Git Trust Layer Plan Track

**Detailed plan file to create before implementation:** `docs/superpowers/plans/YYYY-MM-DD-meridian-git-trust-layer.md`

**Primary files:**
- `meridian/src/main/ipc.ts`
- `meridian/src/main/vault.ts`
- `meridian/src/renderer/src/components/Sidebar/GitPanel.tsx`
- `meridian/src/renderer/src/components/Sidebar/HistoryAccordion.tsx`
- `meridian/src/renderer/src/components/Editor/DiffPane.tsx`
- `meridian/src/renderer/src/components/RightPanel/NoteHistoryPanel.tsx`
- `meridian/src/renderer/src/hooks/useVaultBridge.ts`
- `meridian/tests/main/git*.test.ts`
- `meridian/tests/renderer/GitPanel.test.tsx`

**Required tasks:**

- [ ] Add IPC for per-note log, show revision, and restore revision.
- [ ] Guard restore when a tab is dirty.
- [ ] Add note history panel with diff and restore controls.
- [ ] Improve GitPanel status labels for missing Git, no repo, auth failure, and conflict states.
- [ ] Add tests for restore guardrails and human-readable errors.
- [ ] Verify diff contrast in light and dark themes.
- [ ] Apply Soft Utility Workspace styling to Git status and history surfaces.

**Verification command:**

```bash
cd meridian
npm run typecheck
npm run lint
npm run test
```

## Wave 6: Ask Vault And Onboarding Plan Track

**Detailed plan file to create before implementation:** `docs/superpowers/plans/YYYY-MM-DD-meridian-ask-vault-onboarding.md`

**Primary files:**
- `meridian/src/main/settings.ts`
- `meridian/src/main/ipc.ts`
- `meridian/src/renderer/src/components/Settings/SettingsContent.tsx`
- `meridian/src/renderer/src/components/Settings/settingsDefinitions`
- `meridian/src/renderer/src/components/RightPanel/AskVaultPanel.tsx`
- `meridian/src/renderer/src/store/useMetadataStore.ts`
- `meridian/src/renderer/src/store/useViewsStore.ts`
- `meridian/src/renderer/src/utils/defaultVault.ts`
- `meridian/src/renderer/src/components/VaultPicker.tsx`

**Required tasks:**

- [ ] Add provider settings UI with explicit privacy copy.
- [ ] Build context packs from selected notes, properties, relationships, and saved views.
- [ ] Add read-only Ask Vault panel with source citations.
- [ ] Prevent Ask Vault from modifying files in this wave.
- [ ] Refresh Getting Started vault content to demonstrate all six roadmap areas.
- [ ] Add tests for context selection, provider validation, and read-only guardrails.
- [ ] Smoke test Windows and macOS first-run flows.
- [ ] Apply Soft Utility Workspace styling to onboarding and Ask Vault.

**Verification command:**

```bash
cd meridian
npm run typecheck
npm run lint
npm run test
npm run build
```

## Release Gates For Every Wave

- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run test`.
- [ ] Run `npm run build`.
- [ ] Smoke test English and Russian UI.
- [ ] Smoke test light and dark themes.
- [ ] Smoke test paths with spaces and Cyrillic characters.
- [ ] Inspect small window layout for clipped text.
- [ ] Confirm Windows UI has Ctrl/Alt/Shift hints and no visible macOS-only command symbols.
- [ ] Confirm macOS packaging/signing checks before release publishing.

## Recommended Execution Order

1. Execute Wave 1 tasks completely and release as a properties-focused beta.
2. Write and approve a detailed Wave 2 plan.
3. Execute Wave 2 and release typed note creation.
4. Write and approve a detailed Wave 3 plan.
5. Execute Wave 3 and release relationship browsing.
6. Write and approve a detailed Wave 4 plan.
7. Execute Wave 4 and release saved views/workflows.
8. Write and approve a detailed Wave 5 plan.
9. Execute Wave 5 and release per-note Git history.
10. Write and approve a detailed Wave 6 plan.
11. Execute Wave 6 and release read-only Ask Vault plus refreshed onboarding.
