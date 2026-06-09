# Meridian Wave 5 Git Trust Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Git a visible safety layer by adding per-note history, version preview, guarded restore, and clearer Git error language.

**Architecture:** Extend existing Git IPC instead of replacing the current backup panel. Main process exposes file-scoped Git log/show/restore helpers; renderer adds a right-panel note history browser that refuses to restore over dirty tabs unless the user confirms.

**Tech Stack:** Electron IPC, React 19, TypeScript, Zustand, Git CLI, Vitest.

---

## Task 1: Shared Git Trust Helpers

**Files:**
- Create: `meridian/src/shared/gitTrust.ts`
- Create: `meridian/tests/shared/gitTrust.test.ts`

- [ ] Add helper tests for user-readable error categories and dirty restore guard labels.
- [ ] Implement `classifyGitError(message)` and `canRestoreFile({ isDirty, confirmed })`.
- [ ] Verify and commit.

## Task 2: Main Git File History IPC

**Files:**
- Modify: `meridian/src/shared/types.ts`
- Modify: `meridian/src/main/ipc.ts`
- Modify: `meridian/src/preload/index.ts`
- Modify: `meridian/src/renderer/src/hooks/useVaultBridge.ts`

- [ ] Add IPC channels:
  - `GIT_FILE_LOG`
  - `GIT_SHOW_FILE_AT_COMMIT`
  - `GIT_RESTORE_FILE`
- [ ] Implement file-scoped `git log --follow`, `git show <hash>:<path>`, and restore by writing a chosen committed blob to the working tree.
- [ ] Normalize paths relative to vault and reject paths outside the vault.
- [ ] Verify typecheck and commit.

## Task 3: Note History Panel

**Files:**
- Create: `meridian/src/renderer/src/components/RightPanel/NoteHistoryPanel.tsx`
- Modify: `meridian/src/renderer/src/components/RightPanel/RightPanel.tsx`
- Modify: locale JSON files.

- [ ] Add right-panel tab for active note history.
- [ ] Show commits for the current note, preview chosen version, and restore button.
- [ ] Block dirty-tab restore unless the user confirms.
- [ ] After restore, update tab content, mark dirty false, and re-index file.
- [ ] Verify typecheck and commit.

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

- [ ] Users can inspect per-note history.
- [ ] Users can preview a past version.
- [ ] Restore does not silently overwrite dirty tabs.
- [ ] Git errors are categorized into missing Git, no repository, auth/remote, conflicts, and unknown.
- [ ] Existing Git panel and diff view continue to work.
