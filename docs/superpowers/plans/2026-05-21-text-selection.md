# Text Selection in Editor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make text in the CodeMirror source editor and Live Preview blocks selectable with the mouse.

**Architecture:** Remove the global `user-select: none` from `body`, restore it explicitly on UI chrome components that need it (ActivityBar, TabBar), add a CSS rule for buttons, and fix the Live Preview `BlockWidget` to use `click` instead of `mousedown`+`preventDefault` so dragging within rendered blocks selects text normally.

**Tech Stack:** React + TypeScript (Electron renderer), CodeMirror 6, Vitest + React Testing Library

---

### Task 1: Remove `user-select: none` from body and add button rule

**Files:**
- Modify: `meridian/src/renderer/src/assets/main.css:41`
- Modify: `meridian/src/renderer/src/assets/meridian.css`

- [ ] **Step 1: Remove `user-select: none` from `body` in main.css**

Open `meridian/src/renderer/src/assets/main.css`. The `body` rule currently looks like:

```css
body {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background-image: url('./wavy-lines.svg');
  background-size: cover;
  user-select: none;
}
```

Remove the `user-select: none;` line so it becomes:

```css
body {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background-image: url('./wavy-lines.svg');
  background-size: cover;
}
```

- [ ] **Step 2: Add `user-select: none` for buttons in meridian.css**

Open `meridian/src/renderer/src/assets/meridian.css`. Append at the end of the file:

```css
button {
  user-select: none;
}
```

This covers all toolbar buttons, mode switchers (Live/Source), and action controls throughout the app without requiring per-component changes.

- [ ] **Step 3: Commit**

```bash
git add meridian/src/renderer/src/assets/main.css meridian/src/renderer/src/assets/meridian.css
git commit -m "fix: remove user-select:none from body, restore on buttons via CSS"
```

---

### Task 2: Add `userSelect: 'none'` to ActivityBar and TabBar

These two components currently rely on the body's `user-select: none`. After Task 1 they need explicit inline protection so their icon/tab areas stay non-selectable.

**Files:**
- Modify: `meridian/src/renderer/src/components/ActivityBar/ActivityBar.tsx:129-141`
- Modify: `meridian/src/renderer/src/components/Editor/TabBar.tsx:202-215`
- Modify: `meridian/tests/renderer/TabBar.test.tsx`

- [ ] **Step 1: Add `userSelect: 'none'` to ActivityBar root div**

Open `meridian/src/renderer/src/components/ActivityBar/ActivityBar.tsx`. The return statement's root `<div>` starts at line 129. Add `userSelect: 'none'` to its style:

```tsx
return (
  <div
    style={{
      width: expanded ? 160 : 48,
      flexShrink: 0,
      background: 'var(--bg-tertiary)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: expanded ? 'stretch' : 'center',
      transition: 'width 0.15s ease-in-out',
      overflow: 'hidden',
      userSelect: 'none'
    }}
  >
```

- [ ] **Step 2: Add `userSelect: 'none'` to TabBar root div**

Open `meridian/src/renderer/src/components/Editor/TabBar.tsx`. The root `<div>` starts at line 202. Add `userSelect: 'none'` to its style:

```tsx
return (
  <div
    className={`custom-tab-bar ${isActivePane ? 'active' : ''}`}
    onClick={() => { if (!isActivePane) setActivePane(paneId) }}
    style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      background: 'var(--bg-secondary)',
      borderBottom: `1px solid ${isActivePane ? 'var(--accent-color)' : 'var(--border-color)'}`,
      height: 36,
      flexShrink: 0,
      cursor: 'default',
      transition: 'border-bottom-color 0.2s ease',
      userSelect: 'none'
    }}
```

- [ ] **Step 3: Write a failing test for TabBar's user-select**

Open `meridian/tests/renderer/TabBar.test.tsx`. Add this test inside the existing `describe('TabBar', ...)` block:

```tsx
it('has user-select: none on root element', () => {
  const { container } = render(<TabBar paneId={PANE_ID} />)
  const root = container.firstChild as HTMLElement
  expect(root.style.userSelect).toBe('none')
})
```

- [ ] **Step 4: Run test to verify it fails**

```bash
cd meridian && npm run test -- --reporter=verbose tests/renderer/TabBar.test.tsx
```

Expected: FAIL — `expected '' to be 'none'`

- [ ] **Step 5: Verify test passes after Step 2's change**

```bash
cd meridian && npm run test -- --reporter=verbose tests/renderer/TabBar.test.tsx
```

Expected: all tests PASS

- [ ] **Step 6: Run full test suite to confirm no regressions**

```bash
cd meridian && npm run test
```

Expected: all tests PASS

- [ ] **Step 7: Commit**

```bash
git add meridian/src/renderer/src/components/ActivityBar/ActivityBar.tsx \
        meridian/src/renderer/src/components/Editor/TabBar.tsx \
        meridian/tests/renderer/TabBar.test.tsx
git commit -m "fix: add userSelect:none to ActivityBar and TabBar"
```

---

### Task 3: Fix BlockWidget in Live Preview to allow text selection

**File:**
- Modify: `meridian/src/renderer/src/components/Editor/extensions/livePreviewExtension.ts:60-70`

- [ ] **Step 1: Replace mousedown listener with click listener in BlockWidget.toDOM**

Open `meridian/src/renderer/src/components/Editor/extensions/livePreviewExtension.ts`. Find the `toDOM` method of `BlockWidget` (around line 60). The current listener is:

```typescript
div.addEventListener('mousedown', (e) => {
  e.preventDefault()
  view.dispatch({ selection: { anchor: this.anchor } })
  view.focus()
})
```

Replace it with:

```typescript
div.addEventListener('click', () => {
  if (window.getSelection()?.toString()) return
  view.dispatch({ selection: { anchor: this.anchor } })
  view.focus()
})
```

**Why:** `mousedown` + `preventDefault` blocks the browser's drag-to-select gesture. Moving to `click` (which fires after `mouseup`) lets the browser complete any selection the user started. The `getSelection()` guard ensures that if the user just finished selecting text, the cursor does not collapse to the block's anchor.

- [ ] **Step 2: Run full test suite**

```bash
cd meridian && npm run test
```

Expected: all tests PASS (no tests cover this extension directly — verification is manual)

- [ ] **Step 3: Commit**

```bash
git add meridian/src/renderer/src/components/Editor/extensions/livePreviewExtension.ts
git commit -m "fix: allow text selection in Live Preview block widgets"
```

---

## Manual Verification Checklist

After all three tasks are complete, verify the following in the running app (`npm run dev` inside `meridian/`):

- [ ] **Source mode, left panel:** click and drag over raw markdown text → text is highlighted in blue
- [ ] **Live mode, rendered block:** click and drag within a rendered paragraph → text is highlighted
- [ ] **Live mode, rendered block:** single click (no drag) → block switches to raw edit mode (cursor moves in)
- [ ] **ActivityBar:** try to drag-select the icon labels → no selection appears
- [ ] **TabBar:** try to drag-select tab names → no selection appears
- [ ] **Toolbar buttons (Live/Source):** try to drag-select → no selection appears
- [ ] **Sidebar file tree:** try to drag-select file names → no selection (existing behaviour preserved)
