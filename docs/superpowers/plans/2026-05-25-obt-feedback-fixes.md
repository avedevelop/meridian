# OBT Feedback Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the first Windows tester feedback in a way that also hardens the macOS app where the same behavior is shared.

**Architecture:** Treat the feedback as four focused fixes: file-tree keyboard deletion, app close behavior, file-tree context-menu positioning, and keyboard-layout safety. Keep the file tree behavior in `FileTree`, close behavior in `useAutoSave`, and low-level menu positioning in the shared `ContextMenu`. Add small pure helpers where they make behavior testable without launching Electron.

**Tech Stack:** Electron, React, TypeScript, Zustand, Vitest, Testing Library, CodeMirror.

---

## File Map

- Modify: `meridian/src/renderer/src/components/Sidebar/ContextMenu.tsx`
  - Owns clamping and rendering the shared sidebar/tab context menu.
- Modify: `meridian/src/renderer/src/components/Sidebar/FileTree.tsx`
  - Owns selected file rows, context-menu opening, inline rename, and Delete/Backspace behavior for selected notes.
- Modify: `meridian/src/renderer/src/hooks/useVaultBridge.ts`
  - Already centralizes `confirmDelete`; only touch if delete confirmation text/options need to be shared.
- Modify: `meridian/src/renderer/src/hooks/useAutoSave.ts`
  - Owns dirty-tab handling on app close. Make close reliable when `closeBehavior` is `ask`.
- Modify: `meridian/src/renderer/src/App.tsx`
  - Owns global shortcuts. Add composition/input guards so shortcuts do not steal text entry for non-US layouts.
- Test: `meridian/tests/renderer/defaultVault.test.ts`
  - Existing unit test pattern reference only.
- Create: `meridian/tests/renderer/contextMenuPosition.test.ts`
  - Tests menu clamping independent of DOM rendering.
- Create: `meridian/tests/renderer/fileTreeKeyboard.test.tsx`
  - Tests Delete and Backspace keyboard deletion on selected file tree rows.
- Create: `meridian/tests/renderer/shortcutGuards.test.ts`
  - Tests keyboard shortcut guard for composing/dead-key/AltGraph input.
- Create: `meridian/tests/renderer/closeBehavior.test.ts`
  - Tests dirty-tab close behavior.

---

### Task 1: Shared Context Menu Positioning

**Files:**
- Modify: `meridian/src/renderer/src/components/Sidebar/ContextMenu.tsx`
- Create: `meridian/tests/renderer/contextMenuPosition.test.ts`

- [x] **Step 1: Extract a pure menu positioning helper**

In `ContextMenu.tsx`, add and export this helper above the component:

```ts
export interface MenuPositionInput {
  x: number
  y: number
  menuWidth: number
  menuHeight: number
  viewportWidth: number
  viewportHeight: number
  margin?: number
}

export function getContextMenuPosition({
  x,
  y,
  menuWidth,
  menuHeight,
  viewportWidth,
  viewportHeight,
  margin = 8
}: MenuPositionInput): { left: number; top: number } {
  return {
    left: Math.max(margin, Math.min(x, viewportWidth - menuWidth - margin)),
    top: Math.max(margin, Math.min(y, viewportHeight - menuHeight - margin))
  }
}
```

- [x] **Step 2: Use the helper in `ContextMenu`**

Replace the `adjustedX` / `adjustedY` lines with:

```ts
const { left: adjustedX, top: adjustedY } = getContextMenuPosition({
  x,
  y,
  menuWidth,
  menuHeight,
  viewportWidth: window.innerWidth,
  viewportHeight: window.innerHeight
})
```

- [x] **Step 3: Write the positioning test**

Create `meridian/tests/renderer/contextMenuPosition.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { getContextMenuPosition } from '../../src/renderer/src/components/Sidebar/ContextMenu'

describe('getContextMenuPosition', () => {
  it('keeps a menu near the clicked point when there is room', () => {
    expect(
      getContextMenuPosition({
        x: 120,
        y: 80,
        menuWidth: 180,
        menuHeight: 120,
        viewportWidth: 1000,
        viewportHeight: 800
      })
    ).toEqual({ left: 120, top: 80 })
  })

  it('clamps the menu to the lower viewport edge', () => {
    expect(
      getContextMenuPosition({
        x: 120,
        y: 760,
        menuWidth: 180,
        menuHeight: 120,
        viewportWidth: 1000,
        viewportHeight: 800
      })
    ).toEqual({ left: 120, top: 672 })
  })

  it('clamps the menu away from negative coordinates', () => {
    expect(
      getContextMenuPosition({
        x: -40,
        y: -20,
        menuWidth: 180,
        menuHeight: 120,
        viewportWidth: 1000,
        viewportHeight: 800
      })
    ).toEqual({ left: 8, top: 8 })
  })
})
```

- [x] **Step 4: Run the test**

Run: `npm test -- tests/renderer/contextMenuPosition.test.ts`

Expected: `3 passed`.

- [x] **Step 5: Commit**

```bash
git add meridian/src/renderer/src/components/Sidebar/ContextMenu.tsx meridian/tests/renderer/contextMenuPosition.test.ts
git commit -m "fix: clamp sidebar context menu position"
```

---

### Task 2: File Tree Delete Shortcut

**Files:**
- Modify: `meridian/src/renderer/src/components/Sidebar/FileTree.tsx`
- Create: `meridian/tests/renderer/fileTreeKeyboard.test.tsx`

- [x] **Step 1: Add selected file state and focusable rows**

In `FileTree.tsx`, add:

```ts
const [selectedPath, setSelectedPath] = useState<string | null>(activePath ?? null)
```

On each clickable file row wrapper, set:

```tsx
tabIndex={0}
data-file-path={file.path}
aria-selected={selectedPath === file.path}
onClick={(e) => {
  setSelectedPath(file.path)
  onOpen(file)
}}
onFocus={() => setSelectedPath(file.path)}
```

Keep the existing open/toggle behavior intact for folders.

- [x] **Step 2: Add Delete and Backspace handling**

Add a `useEffect` in `FileTree.tsx`:

```ts
useEffect(() => {
  const onKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null
    const isTextInput =
      target?.tagName === 'INPUT' ||
      target?.tagName === 'TEXTAREA' ||
      target?.isContentEditable
    if (isTextInput || editing) return
    if (event.key !== 'Delete' && event.key !== 'Backspace') return
    if (!selectedPath) return
    event.preventDefault()
    onDelete?.(selectedPath)
  }

  window.addEventListener('keydown', onKeyDown)
  return () => window.removeEventListener('keydown', onKeyDown)
}, [editing, onDelete, selectedPath])
```

- [x] **Step 3: Write the keyboard test**

Create `meridian/tests/renderer/fileTreeKeyboard.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FileTree } from '../../src/renderer/src/components/Sidebar/FileTree'

const file = {
  name: 'Note.md',
  path: '/vault/Note.md',
  relativePath: 'Note.md',
  isDirectory: false,
  mtime: 0,
  birthtime: 0
}

describe('FileTree keyboard deletion', () => {
  it('deletes the selected file when Delete is pressed', () => {
    const onDelete = vi.fn()
    const onOpen = vi.fn()
    render(<FileTree files={[file]} activePath={file.path} onOpen={onOpen} onDelete={onDelete} />)

    fireEvent.click(screen.getByText('Note.md'))
    fireEvent.keyDown(window, { key: 'Delete' })

    expect(onDelete).toHaveBeenCalledWith('/vault/Note.md')
  })

  it('does not delete while inline rename input is focused', () => {
    const onDelete = vi.fn()
    const onOpen = vi.fn()
    render(<FileTree files={[file]} activePath={file.path} onOpen={onOpen} onDelete={onDelete} />)

    fireEvent.contextMenu(screen.getByText('Note.md'))
    fireEvent.click(screen.getByText(/Rename|Переименовать/i))
    fireEvent.keyDown(window, { key: 'Delete' })

    expect(onDelete).not.toHaveBeenCalled()
  })
})
```

- [x] **Step 4: Run the test**

Run: `npm test -- tests/renderer/fileTreeKeyboard.test.tsx`

Expected: `2 passed`.

- [x] **Step 5: Commit**

```bash
git add meridian/src/renderer/src/components/Sidebar/FileTree.tsx meridian/tests/renderer/fileTreeKeyboard.test.tsx
git commit -m "feat: delete selected file from keyboard"
```

---

### Task 3: Reliable Close Behavior

**Files:**
- Modify: `meridian/src/renderer/src/hooks/useAutoSave.ts`
- Create: `meridian/tests/renderer/closeBehavior.test.ts`

- [x] **Step 1: Extract close-decision helper**

In `useAutoSave.ts`, add:

```ts
export type CloseBehavior = 'ask' | 'save' | 'discard'

export function shouldBlockWindowClose(closeBehavior: CloseBehavior, dirtyCount: number): boolean {
  return closeBehavior === 'ask' && dirtyCount > 0
}
```

- [x] **Step 2: Use the helper in `handleBeforeUnload`**

Replace the dirty close branch with:

```ts
if (closeBehavior === 'save') {
  dirtyTabs.forEach((tab) => {
    window.vault.writeFile(tab.path, tab.content)
  })
}

if (shouldBlockWindowClose(closeBehavior, dirtyTabs.length)) {
  e.preventDefault()
  e.returnValue = ''
  return ''
}

return undefined
```

This keeps the native browser/Electron confirmation path but avoids custom text that Electron may ignore or mishandle.

- [x] **Step 3: Add close behavior tests**

Create `meridian/tests/renderer/closeBehavior.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { shouldBlockWindowClose } from '../../src/renderer/src/hooks/useAutoSave'

describe('shouldBlockWindowClose', () => {
  it('blocks close when ask mode has dirty tabs', () => {
    expect(shouldBlockWindowClose('ask', 1)).toBe(true)
  })

  it('does not block close when no tabs are dirty', () => {
    expect(shouldBlockWindowClose('ask', 0)).toBe(false)
  })

  it('does not block close in save or discard mode', () => {
    expect(shouldBlockWindowClose('save', 2)).toBe(false)
    expect(shouldBlockWindowClose('discard', 2)).toBe(false)
  })
})
```

- [x] **Step 4: Run the test**

Run: `npm test -- tests/renderer/closeBehavior.test.ts`

Expected: `3 passed`.

- [ ] **Step 5: Manual QA**

Run a packaged or dev app and verify:

1. With no dirty tabs, close exits immediately.
2. With dirty tabs and `closeBehavior = ask`, native confirmation appears.
3. With dirty tabs and `closeBehavior = save`, app closes after saving.
4. With dirty tabs and `closeBehavior = discard`, app closes without blocking.

- [x] **Step 6: Commit**

```bash
git add meridian/src/renderer/src/hooks/useAutoSave.ts meridian/tests/renderer/closeBehavior.test.ts
git commit -m "fix: make window close behavior predictable"
```

---

### Task 4: Keyboard Layout Guardrails

**Files:**
- Modify: `meridian/src/renderer/src/App.tsx`
- Create: `meridian/src/renderer/src/utils/keyboardGuards.ts`
- Create: `meridian/tests/renderer/shortcutGuards.test.ts`

- [x] **Step 1: Add a pure shortcut guard**

Create `meridian/src/renderer/src/utils/keyboardGuards.ts`:

```ts
export function isEditableTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  return (
    element?.tagName === 'INPUT' ||
    element?.tagName === 'TEXTAREA' ||
    element?.isContentEditable === true
  )
}

export function shouldIgnoreGlobalShortcut(event: KeyboardEvent): boolean {
  const altGraph = event.ctrlKey && event.altKey && !event.metaKey
  return event.isComposing || event.key === 'Dead' || altGraph || isEditableTarget(event.target)
}
```

- [x] **Step 2: Apply the guard to global shortcuts**

In `App.tsx`, import:

```ts
import { shouldIgnoreGlobalShortcut } from './utils/keyboardGuards'
```

At the top of the global `keydown` handler, add:

```ts
if (shouldIgnoreGlobalShortcut(e)) return
```

Do not apply this guard to CodeMirror-local save handling inside `SinglePaneArea`; only global app shortcuts should ignore text input.

- [x] **Step 3: Add guard tests**

Create `meridian/tests/renderer/shortcutGuards.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { shouldIgnoreGlobalShortcut } from '../../src/renderer/src/utils/keyboardGuards'

function keyEvent(init: KeyboardEventInit, target?: HTMLElement): KeyboardEvent {
  const event = new KeyboardEvent('keydown', init)
  if (target) {
    Object.defineProperty(event, 'target', { value: target })
  }
  return event
}

describe('shouldIgnoreGlobalShortcut', () => {
  it('ignores composing input', () => {
    expect(shouldIgnoreGlobalShortcut(keyEvent({ key: 'a', isComposing: true }))).toBe(true)
  })

  it('ignores dead keys', () => {
    expect(shouldIgnoreGlobalShortcut(keyEvent({ key: 'Dead' }))).toBe(true)
  })

  it('ignores AltGraph-like input used by international layouts', () => {
    expect(shouldIgnoreGlobalShortcut(keyEvent({ key: '@', ctrlKey: true, altKey: true }))).toBe(true)
  })

  it('does not ignore CmdOrCtrl shortcuts outside editable fields', () => {
    expect(shouldIgnoreGlobalShortcut(keyEvent({ key: 'k', metaKey: true }))).toBe(false)
  })
})
```

- [x] **Step 4: Run the test**

Run: `npm test -- tests/renderer/shortcutGuards.test.ts`

Expected: `4 passed`.

- [ ] **Step 5: Manual QA**

Check in editor text entry:

1. German layout: letters, numbers, symbols, dead keys.
2. Russian layout: letters and punctuation.
3. US layout: existing shortcuts still work.
4. `Cmd/Ctrl+K`, `Cmd/Ctrl+S`, `Cmd/Ctrl+D` still work outside text composition.

- [x] **Step 6: Commit**

```bash
git add meridian/src/renderer/src/App.tsx meridian/src/renderer/src/utils/keyboardGuards.ts meridian/tests/renderer/shortcutGuards.test.ts
git commit -m "fix: protect text input from global shortcuts"
```

---

### Task 5: Final Verification and Release Candidate

**Files:**
- No new source files.

- [x] **Step 1: Run focused tests**

Run:

```bash
npm test -- \
  tests/renderer/contextMenuPosition.test.ts \
  tests/renderer/fileTreeKeyboard.test.tsx \
  tests/renderer/closeBehavior.test.ts \
  tests/renderer/shortcutGuards.test.ts
```

Expected: all new tests pass.

- [x] **Step 2: Run full verification**

Run:

```bash
npm run typecheck
npx eslint . --no-cache
npm test
npm run check-lines
```

Expected: all pass.

- [x] **Step 3: Build local smoke artifact**

Run:

```bash
CSC_IDENTITY_AUTO_DISCOVERY=false npm run build:mac -- --dir --x64 --publish never
```

Expected: `dist/mac*/Meridian.app` exists and opens on macOS.

- [ ] **Step 4: Push to `main`**

Run from repository root:

```bash
git push origin HEAD:main
```

- [ ] **Step 5: Create release tag after QA approval**

Only after the user confirms the fixes are acceptable:

```bash
git tag v1.0.6
git push origin v1.0.6
```

Expected: `Meridian Release` GitHub Actions builds DMGs and triggers the site rebuild hook.

---

## Self-Review

- Spec coverage: all 4 tester points are mapped to tasks.
- Placeholder scan: no TODO/TBD placeholders; each task has concrete file paths and commands.
- Type consistency: helper names are stable across tests and implementation.
- Risk: German-layout issue still needs manual verification because keyboard layout behavior depends on OS/Electron event data.
