# Meridian Wave 3 Relationships Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make relation properties first-class by indexing them beside wikilinks, exposing unresolved relations, and adding a right-panel relationship browser.

**Architecture:** Keep relation data in Markdown frontmatter arrays/strings and reuse Wave 1 parsing. Extend the existing `LinkIndex` so relation references become normal graph/backlink links, while keeping relation-specific metadata available for UI.

**Tech Stack:** Electron, React 19, TypeScript, Zustand, Vitest, YAML frontmatter utilities.

---

## Scope Check

This wave ships relation indexing and browsing. It does not implement automatic rewrite-on-rename, bidirectional writes, or a graph database. Rename survival is handled through basename/path normalization where possible: relation values like `[[Project Alpha]]`, `Project Alpha`, `Projects/Project Alpha.md`, and `Project Alpha.md` resolve to known files.

## Task 1: Shared Relationship Extraction

**Files:**
- Create: `meridian/src/shared/relationships.ts`
- Create: `meridian/tests/shared/relationships.test.ts`

- [ ] **Step 1: Write tests**

Test extracting relation properties from `related`, `relations`, and `links`, including arrays, strings, wikilink wrappers, empty values, malformed YAML, and non-relation properties.

- [ ] **Step 2: Run failing tests**

```bash
cd meridian
npm run test -- tests/shared/relationships.test.ts
```

- [ ] **Step 3: Implement helpers**

Add:
- `normalizeRelationTarget(value: string): string`
- `extractRelationReferences(content: string): RelationReference[]`
- `isRelationKey(key: string): boolean`

- [ ] **Step 4: Verify and commit**

```bash
cd meridian
npm run test -- tests/shared/relationships.test.ts
git add meridian/src/shared/relationships.ts meridian/tests/shared/relationships.test.ts docs/superpowers/plans/2026-05-27-meridian-wave-3-relationships.md
git commit -m "feat: extract frontmatter relationships"
```

## Task 2: Link Index Relationship Support

**Files:**
- Modify: `meridian/src/renderer/src/lib/linkParser.ts`
- Modify: `meridian/src/renderer/src/lib/linkIndex.ts`
- Modify: `meridian/src/renderer/src/store/useLinkStore.ts`
- Modify: `meridian/tests/renderer/linkIndex.test.ts`
- Modify: `meridian/tests/renderer/useLinkStore.test.ts`

- [ ] **Step 1: Add indexing tests**

Assert relation properties resolve to outlinks/backlinks, unresolved relation values remain inspectable, and wikilinks still work.

- [ ] **Step 2: Implement relation indexing**

Include relation references in raw links, store `RelationReference` rows, expose:
- `relationsForFile(path)`
- `unresolvedRelationsForFile(path)`

- [ ] **Step 3: Verify and commit**

```bash
cd meridian
npm run test -- tests/renderer/linkIndex.test.ts tests/renderer/useLinkStore.test.ts
git add meridian/src/renderer/src/lib/linkParser.ts meridian/src/renderer/src/lib/linkIndex.ts meridian/src/renderer/src/store/useLinkStore.ts meridian/tests/renderer/linkIndex.test.ts meridian/tests/renderer/useLinkStore.test.ts
git commit -m "feat: index relation properties"
```

## Task 3: Relationship Browser UI

**Files:**
- Create: `meridian/src/renderer/src/components/RightPanel/RelationshipsPanel.tsx`
- Modify: `meridian/src/renderer/src/components/RightPanel/RightPanel.tsx`
- Modify: `meridian/src/renderer/src/i18n/locales/en.json`
- Modify: `meridian/src/renderer/src/i18n/locales/ru.json`

- [ ] **Step 1: Add panel**

Show outgoing relations grouped by property, incoming relationship backlinks, and unresolved targets. Use existing right-panel visual language.

- [ ] **Step 2: Wire tab**

Add a relationships tab to the right panel.

- [ ] **Step 3: Verify and commit**

```bash
cd meridian
npm run typecheck
git add meridian/src/renderer/src/components/RightPanel/RelationshipsPanel.tsx meridian/src/renderer/src/components/RightPanel/RightPanel.tsx meridian/src/renderer/src/i18n/locales/en.json meridian/src/renderer/src/i18n/locales/ru.json
git commit -m "feat: add relationships panel"
```

## Task 4: Wave Verification

- [ ] **Step 1: Focused checks**

```bash
cd meridian
npm run test -- tests/shared/relationships.test.ts tests/renderer/linkIndex.test.ts tests/renderer/useLinkStore.test.ts
```

- [ ] **Step 2: Full checks**

```bash
cd meridian
npm run check-lines
npm run typecheck
npm run lint
npm run test
npm run build
```

## Acceptance Checklist

- [ ] Relation properties are indexed alongside wikilinks.
- [ ] Existing wikilinks/backlinks continue to work.
- [ ] Relationship UI shows outgoing, incoming, and unresolved relations.
- [ ] Relation values resolve across `[[Name]]`, `Name`, `Name.md`, and nested relative paths when a known note exists.
- [ ] RU/EN labels exist.
