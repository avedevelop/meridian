# Meridian Wave 2 Types And Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add vault-local note types and templates so users can create Project, Person, Daily, Task, or custom typed notes without manually copying frontmatter.

**Architecture:** Keep Markdown as the source of truth. Store type schemas and templates in a vault-local `.meridian/config.json`, expose read/create helpers through main-process IPC, and let renderer flows call one create-as API that writes a typed Markdown note with safe frontmatter.

**Tech Stack:** Electron, React 19, TypeScript, Vitest, YAML frontmatter utilities, local filesystem IPC.

---

## Scope Check

Wave 2 depends on Wave 1 frontmatter utilities. This wave does not build saved views, formulas, relation autocomplete, or plugin-defined schemas. It only creates typed notes with default properties and editable Markdown templates.

## File Structure Map

- Modify `meridian/src/shared/types.ts`: add `NoteTypeDefinition`, `NoteTypePropertySchema`, `MeridianVaultConfig`, `CreateTypedNoteInput`, and IPC channel constants.
- Create `meridian/src/shared/noteTypes.ts`: built-in note type defaults, safe filename helpers, template placeholder rendering, typed-note content builder.
- Modify `meridian/src/main/vault.ts`: read/write `.meridian/config.json`, merge built-ins with vault config, create typed notes with Cyrillic/space-safe paths.
- Modify `meridian/src/main/ipc.ts`: expose `vault:get-note-types`, `vault:save-note-types`, and `vault:create-typed-note`.
- Modify `meridian/src/preload/index.ts`: expose note type APIs to renderer.
- Modify `meridian/src/renderer/src/hooks/useVaultBridge.ts`: add `createTypedNote`.
- Modify `meridian/src/renderer/src/components/Sidebar/FilesPanel.tsx`: add a compact "Create as..." control near New Note.
- Modify `meridian/src/renderer/src/components/CommandPalette/CommandPalette.tsx`: allow command entries for built-in create-as flows through existing `commands` prop.
- Modify locale JSON files: English and Russian labels.
- Add tests:
  - `meridian/tests/shared/noteTypes.test.ts`
  - `meridian/tests/main/vault.test.ts`
  - `meridian/tests/renderer/FileTree.test.tsx` or `CommandPalette.test.tsx` only for visible entry points that can be tested cheaply.

## Task 1: Shared Note Type Model

**Files:**
- Modify: `meridian/src/shared/types.ts`
- Create: `meridian/src/shared/noteTypes.ts`
- Create: `meridian/tests/shared/noteTypes.test.ts`

- [ ] **Step 1: Write shared tests**

Cover built-in type labels, default properties, template placeholders, filename sanitization, and Markdown generation.

- [ ] **Step 2: Run failing shared tests**

Run:

```bash
cd meridian
npm run test -- tests/shared/noteTypes.test.ts
```

Expected: fail because `src/shared/noteTypes.ts` does not exist.

- [ ] **Step 3: Implement shared model and helpers**

Add typed definitions in `types.ts`, then create helpers in `noteTypes.ts`:

- `getDefaultNoteTypes()`
- `renderTemplatePlaceholders(template, context)`
- `buildTypedNoteContent(definition, input)`
- `sanitizeNoteFileName(title)`
- `normalizeNoteTypes(config)`

Default type IDs: `project`, `person`, `daily`, `task`.

- [ ] **Step 4: Run shared tests**

Run:

```bash
cd meridian
npm run test -- tests/shared/noteTypes.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add meridian/src/shared/types.ts meridian/src/shared/noteTypes.ts meridian/tests/shared/noteTypes.test.ts
git commit -m "feat: add note type template model"
```

## Task 2: Vault Config And Typed Note Creation

**Files:**
- Modify: `meridian/src/main/vault.ts`
- Modify: `meridian/tests/main/vault.test.ts`

- [ ] **Step 1: Write main-process tests**

Cover:

- missing `.meridian/config.json` returns built-in note types;
- custom config can add a note type;
- typed note creation writes frontmatter and body;
- typed note creation works in a directory with spaces and Cyrillic characters;
- duplicate typed note names get ` 2`, ` 3`, etc.

- [ ] **Step 2: Run failing main tests**

Run:

```bash
cd meridian
npm run test -- tests/main/vault.test.ts
```

Expected: fail because `VaultManager` lacks note type methods.

- [ ] **Step 3: Implement vault config methods**

Add methods:

- `getMeridianConfig()`
- `saveMeridianConfig(config)`
- `listNoteTypes()`
- `createTypedNote(input)`

Use `.meridian/config.json` and keep config JSON readable with two-space indentation.

- [ ] **Step 4: Run main tests**

Run:

```bash
cd meridian
npm run test -- tests/main/vault.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add meridian/src/main/vault.ts meridian/tests/main/vault.test.ts
git commit -m "feat: create typed notes from vault config"
```

## Task 3: IPC And Renderer Bridge

**Files:**
- Modify: `meridian/src/shared/types.ts`
- Modify: `meridian/src/main/ipc.ts`
- Modify: `meridian/src/preload/index.ts`
- Modify: `meridian/src/renderer/src/hooks/useVaultBridge.ts`

- [ ] **Step 1: Add IPC channels**

Add:

- `VAULT_GET_NOTE_TYPES`
- `VAULT_SAVE_NOTE_TYPES`
- `VAULT_CREATE_TYPED_NOTE`

- [ ] **Step 2: Wire handlers**

Main process delegates to `VaultManager` and throws `No vault open` consistently.

- [ ] **Step 3: Expose preload methods**

Expose:

- `getNoteTypes()`
- `saveNoteTypes(config)`
- `createTypedNote(input)`

- [ ] **Step 4: Add renderer bridge helper**

Add `createTypedNote(typeId, dir, title?)`, refresh files, index created Markdown, and open the created tab.

- [ ] **Step 5: Verify typecheck**

Run:

```bash
cd meridian
npm run typecheck
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add meridian/src/shared/types.ts meridian/src/main/ipc.ts meridian/src/preload/index.ts meridian/src/renderer/src/hooks/useVaultBridge.ts
git commit -m "feat: expose typed note creation"
```

## Task 4: Create-As UI

**Files:**
- Modify: `meridian/src/renderer/src/components/Sidebar/FilesPanel.tsx`
- Modify: `meridian/src/renderer/src/components/Sidebar/FileTree.tsx`
- Modify: `meridian/src/renderer/src/components/CommandPalette/CommandPalette.tsx`
- Modify: `meridian/src/renderer/src/i18n/locales/en.json`
- Modify: `meridian/src/renderer/src/i18n/locales/ru.json`
- Modify tests where entry points are easy to assert.

- [ ] **Step 1: Add visible create-as control**

Add a compact select/menu in the file panel footer. Keep "New Note" as the primary button and add a calm adjacent typed-create menu.

- [ ] **Step 2: Add folder context entry**

Directory context menus should include `Create as...` entries for built-in note types.

- [ ] **Step 3: Add localization**

Add RU/EN labels for note types and create-as UI.

- [ ] **Step 4: Run focused renderer tests**

Run:

```bash
cd meridian
npm run test -- tests/renderer/FileTree.test.tsx tests/renderer/CommandPalette.test.tsx
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add meridian/src/renderer/src/components/Sidebar/FilesPanel.tsx meridian/src/renderer/src/components/Sidebar/FileTree.tsx meridian/src/renderer/src/components/CommandPalette/CommandPalette.tsx meridian/src/renderer/src/i18n/locales/en.json meridian/src/renderer/src/i18n/locales/ru.json meridian/tests/renderer
git commit -m "feat: add create-as note type UI"
```

## Task 5: Wave Verification

**Files:**
- All touched Wave 2 files.

- [ ] **Step 1: Run focused tests**

```bash
cd meridian
npm run test -- tests/shared/noteTypes.test.ts tests/main/vault.test.ts tests/renderer/FileTree.test.tsx tests/renderer/CommandPalette.test.tsx
```

- [ ] **Step 2: Run full checks**

```bash
cd meridian
npm run check-lines
npm run typecheck
npm run lint
npm run test
npm run build
```

- [ ] **Step 3: Commit any verification fixes**

Commit only if verification required fixes.

## Acceptance Checklist

- [ ] Users can create a typed note in one flow.
- [ ] Built-in Project, Person, Daily, and Task types apply default frontmatter.
- [ ] Templates render `{{title}}`, `{{date}}`, and type-specific placeholders.
- [ ] Typed note creation works with spaces and Cyrillic paths.
- [ ] Existing untyped notes are unchanged.
- [ ] UI labels exist in Russian and English.
- [ ] The create flow remains calm and does not add sharp visual clutter.
