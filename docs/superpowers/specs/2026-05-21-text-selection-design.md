# Text Selection in Editor — Design Spec

**Date:** 2026-05-21  
**Status:** Approved

## Problem

Text in the CodeMirror source editor cannot be selected with the mouse. Root cause: `body { user-select: none; }` in `main.css` blocks all native text selection. Additionally, in Live Preview mode, rendered block widgets call `e.preventDefault()` on `mousedown`, also preventing selection within rendered content.

## Scope

Three targeted changes — no refactoring beyond what serves this fix.

---

## Part 1 — Remove `user-select: none` from body

**File:** `meridian/src/renderer/src/assets/main.css`

Remove `user-select: none` from the `body` rule. CodeMirror already sets `user-select: text` on `.cm-content` internally — once the body override is gone, it will work without any additional changes to the editor.

To preserve the non-selectable UI feel for interactive controls, add to `meridian.css`:

```css
button { user-select: none; }
```

This covers all toolbar buttons, mode switchers, and action controls without requiring per-component changes.

---

## Part 2 — Add `userSelect: 'none'` to navigation chrome

**Files:** `ActivityBar/ActivityBar.tsx`, `Editor/TabBar.tsx`

These components currently rely on the body's `user-select: none`. After Part 1 they would become accidentally selectable. Add `userSelect: 'none'` to the root `<div>` of each:

- `ActivityBar` — the icon sidebar on the far left
- `TabBar` — the file tab strip at the top of each pane

`Breadcrumb`, `StatusBar`, `Sidebar`, and Layout resize handles already have `userSelect: 'none'` inline and need no changes.

---

## Part 3 — Fix BlockWidget in Live Preview

**File:** `Editor/extensions/livePreviewExtension.ts`

`BlockWidget.toDOM` currently attaches a `mousedown` listener that calls `e.preventDefault()`, which prevents text selection inside rendered blocks. Replace it with a `click` listener that skips cursor movement if text is already selected (i.e., the user just finished a drag-to-select):

```typescript
// Remove:
div.addEventListener('mousedown', (e) => {
  e.preventDefault()
  view.dispatch({ selection: { anchor: this.anchor } })
  view.focus()
})

// Add:
div.addEventListener('click', () => {
  if (window.getSelection()?.toString()) return
  view.dispatch({ selection: { anchor: this.anchor } })
  view.focus()
})
```

Behavior preserved: clicking a rendered block still moves the cursor into the block (making it editable raw markdown). New behavior: dragging within a rendered block selects text normally.

---

## What doesn't change

- No changes to CodeMirror theme or extension configuration
- No changes to the editor's selection/cursor logic
- No changes to MarkdownPreview (its content is already selectable via the browser's own handling once body is fixed)
- Context menu already has `userSelect: 'none'` and is unaffected

---

## Testing

1. Source mode — click and drag in the left CodeMirror panel → text highlights
2. Live mode — drag within a rendered block → text highlights; click without drag → block switches to raw edit mode
3. UI chrome (ActivityBar icons, tabs, buttons) — still non-selectable
4. Sidebar file tree — still non-selectable (existing inline style)
