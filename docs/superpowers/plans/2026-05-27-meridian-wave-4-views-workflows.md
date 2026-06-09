# Meridian Wave 4 Views And Workflows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add saved views and workflow filters for notes, tasks, projects, daily notes, inbox, tags, dates, and relations.

**Architecture:** Keep views as lightweight filter definitions over Markdown files. Build a shared view engine that extracts metadata from frontmatter and note text, then add a renderer store and sidebar panel that can save/reopen vault-scoped views without duplicating note content.

**Tech Stack:** Electron, React 19, TypeScript, Zustand, Vitest, YAML frontmatter utilities, local Markdown files.

---

## Scope Check

Wave 4 ships list/table saved views and workflow entry points. It does not implement formulas, kanban, cross-vault sync, or a database. Saved views are scoped per vault in renderer storage for this wave; the Markdown files remain the source of truth.

## Task 1: Shared View Engine

**Files:**
- Create: `meridian/src/shared/views.ts`
- Create: `meridian/tests/shared/views.test.ts`

- [ ] **Step 1: Write tests**

Cover metadata extraction from frontmatter, tasks, daily-note dates, inbox detection, tag filters, type filters, task-status filters, and relation filters.

- [ ] **Step 2: Implement view helpers**

Add:
- `getDefaultSavedViews()`
- `extractViewNote(path, name, content)`
- `applySavedView(notes, view)`
- `createSavedView(id, name, filters)`

- [ ] **Step 3: Verify and commit**

```bash
cd meridian
npm run test -- tests/shared/views.test.ts
git add docs/superpowers/plans/2026-05-27-meridian-wave-4-views-workflows.md meridian/src/shared/views.ts meridian/tests/shared/views.test.ts
git commit -m "feat: add saved views engine"
```

## Task 2: Views Store

**Files:**
- Create: `meridian/src/renderer/src/store/useViewsStore.ts`
- Create: `meridian/tests/renderer/useViewsStore.test.ts`

- [ ] **Step 1: Write store tests**

Cover loading default views, saving a custom view scoped to a vault path, deleting a view, and preserving defaults.

- [ ] **Step 2: Implement store**

Use localStorage keys `meridian-views:<vaultPath>`. Do not store note content.

- [ ] **Step 3: Verify and commit**

```bash
cd meridian
npm run test -- tests/renderer/useViewsStore.test.ts
git add meridian/src/renderer/src/store/useViewsStore.ts meridian/tests/renderer/useViewsStore.test.ts
git commit -m "feat: persist vault saved views"
```

## Task 3: Views Sidebar Panel

**Files:**
- Create: `meridian/src/renderer/src/components/Sidebar/ViewsPanel.tsx`
- Modify: `meridian/src/renderer/src/components/Sidebar/Sidebar.tsx`
- Modify: `meridian/src/renderer/src/components/ActivityBar/ActivityBar.tsx`
- Modify: `meridian/src/renderer/src/components/Layout.tsx`
- Modify: `meridian/src/renderer/src/App.tsx`
- Modify: locale JSON files

- [ ] **Step 1: Add sidebar tab**

Add `views` to sidebar tab unions and activity bar.

- [ ] **Step 2: Add panel**

Panel loads Markdown notes from the existing vault file index, applies selected saved view, displays list/table style rows, and has a small "save current" action.

- [ ] **Step 3: Add command palette entries**

Add commands for opening Inbox, Projects, Tasks, and Daily views.

- [ ] **Step 4: Verify and commit**

```bash
cd meridian
npm run typecheck
git add meridian/src/renderer/src/components/Sidebar/ViewsPanel.tsx meridian/src/renderer/src/components/Sidebar/Sidebar.tsx meridian/src/renderer/src/components/ActivityBar/ActivityBar.tsx meridian/src/renderer/src/components/Layout.tsx meridian/src/renderer/src/App.tsx meridian/src/renderer/src/i18n/locales/en.json meridian/src/renderer/src/i18n/locales/ru.json
git commit -m "feat: add saved views sidebar"
```

## Task 4: Wave Verification

Run:

```bash
cd meridian
npm run check-lines
npm run typecheck
npm run lint
npm run test
npm run build
```

## Acceptance Checklist

- [ ] Users can open saved views from the sidebar.
- [ ] Users can save and reopen a custom view.
- [ ] Views update from current file contents.
- [ ] Tasks and daily notes are filtered without duplicating data.
- [ ] Inbox has a useful empty state.
- [ ] RU/EN labels exist.
