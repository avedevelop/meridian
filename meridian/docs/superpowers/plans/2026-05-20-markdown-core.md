# Markdown Formatting Core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a shared formatter registry (`markdownCore.ts`) so both HTML preview and CodeMirror live preview use the same formatters — callouts, highlights, wiki-links, task-list checkboxes — with the same results.

**Architecture:** A `MarkdownFormatter` interface with `preprocessMd`, `postprocessHtml`, and `cmDecorations` hooks. Four built-in formatters are registered at module load. `MarkdownPreview.tsx` calls `applyPreprocessors`/`applyPostprocessors`; `livePreviewExtension.ts` calls `collectCmDecorations` and merges results with its existing syntax-tree decorations.

**Tech Stack:** TypeScript, CodeMirror 6 (ViewPlugin, Decoration, RangeSetBuilder), unified/remark/rehype, React 18, Zustand.

---

## File map

| Action     | Path                                                                    |
| ---------- | ----------------------------------------------------------------------- |
| **Create** | `src/renderer/src/lib/markdownCore.ts`                                  |
| **Create** | `src/renderer/src/lib/markdownCoreFormatters/calloutsFormatter.ts`      |
| **Create** | `src/renderer/src/lib/markdownCoreFormatters/highlightsFormatter.ts`    |
| **Create** | `src/renderer/src/lib/markdownCoreFormatters/wikiLinksFormatter.ts`     |
| **Create** | `src/renderer/src/lib/markdownCoreFormatters/taskListFormatter.ts`      |
| **Modify** | `src/renderer/src/components/Editor/MarkdownPreview.tsx`                |
| **Modify** | `src/renderer/src/components/Editor/extensions/livePreviewExtension.ts` |
| **Modify** | `src/renderer/src/assets/meridian.css`                                  |

---

### Task 1: Create markdownCore.ts — registry and pipeline

**Files:**

- Create: `src/renderer/src/lib/markdownCore.ts`

- [ ] **Step 1: Create the file**

```ts
import type { EditorView } from '@codemirror/view'
import type { Decoration } from '@codemirror/view'
import type { VaultFile } from '@shared/types'

export type CmEntry = { from: number; to: number; deco: Decoration }

export interface MarkdownFormatter {
  name: string
  preprocessMd?: (md: string) => string
  postprocessHtml?: (html: string, files: VaultFile[]) => string
  cmDecorations?: (view: EditorView) => CmEntry[]
}

const registry: MarkdownFormatter[] = []

export function registerFormatter(f: MarkdownFormatter): void {
  registry.push(f)
}

export function applyPreprocessors(md: string): string {
  return registry.reduce((acc, f) => (f.preprocessMd ? f.preprocessMd(acc) : acc), md)
}

export function applyPostprocessors(html: string, files: VaultFile[]): string {
  return registry.reduce(
    (acc, f) => (f.postprocessHtml ? f.postprocessHtml(acc, files) : acc),
    html
  )
}

export function collectCmDecorations(view: EditorView): CmEntry[] {
  return registry.flatMap((f) => (f.cmDecorations ? f.cmDecorations(view) : []))
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npx tsc --noEmit 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git -C "/Users/vladyslav/Desktop/dev/new project/meridian" add src/renderer/src/lib/markdownCore.ts
git -C "/Users/vladyslav/Desktop/dev/new project/meridian" commit -m "feat: markdown formatter registry (markdownCore)"
```

---

### Task 2: calloutsFormatter — callouts in HTML and live preview

**Files:**

- Create: `src/renderer/src/lib/markdownCoreFormatters/calloutsFormatter.ts`
- Modify: `src/renderer/src/lib/markdownCore.ts` (add import + registration)

The `preprocessMd` function is identical to `preProcessCallouts` in `MarkdownPreview.tsx` (lines 32-47). The `cmDecorations` function scans document lines for the pattern `^> \[!(type)\]` and applies line decorations + replaces the marker when cursor is off that line.

- [ ] **Step 1: Create calloutsFormatter.ts**

```ts
import type { EditorView } from '@codemirror/view'
import { Decoration } from '@codemirror/view'
import type { MarkdownFormatter, CmEntry } from '../markdownCore'
import { CALLOUT_TYPES } from '../../components/Editor/markdownUtils'

function preprocessMd(md: string): string {
  return md.replace(/^(> \[!([\w]+)\][^\n]*(?:\n> [^\n]*)*)/gm, (block) => {
    const lines = block.split('\n')
    const firstLine = lines[0]
    const m = firstLine.match(/^> \[!([\w]+)\](.*)/)
    if (!m) return block
    const typeKey = m[1].toLowerCase()
    const info = CALLOUT_TYPES[typeKey] ?? { icon: '📝', color: '#6b7280' }
    const displayTitle = m[2].trim() || typeKey.charAt(0).toUpperCase() + typeKey.slice(1)
    const body = lines
      .slice(1)
      .map((l) => l.replace(/^> ?/, ''))
      .join('\n')
      .trim()
    return `<div class="callout callout-${typeKey}" style="border-left:4px solid ${info.color};background:${info.color}22;border-radius:6px;padding:12px 16px;margin:12px 0"><div class="callout-title" style="display:flex;align-items:center;gap:6px;font-weight:600;margin-bottom:${body ? '8px' : '0'};color:${info.color}"><span>${info.icon}</span><span>${displayTitle}</span></div>${body ? `<div class="callout-content">${body}</div>` : ''}</div>`
  })
}

function cmDecorations(view: EditorView): CmEntry[] {
  const { state } = view
  const head = state.selection.main.head
  const entries: CmEntry[] = []
  const calloutStart = /^> \[!([\w]+)\](.*)/

  for (let i = 1; i <= state.doc.lines; i++) {
    const line = state.doc.line(i)
    const m = line.text.match(calloutStart)
    if (!m) continue

    const typeKey = m[1].toLowerCase()
    const info = CALLOUT_TYPES[typeKey] ?? { icon: '📝', color: '#6b7280' }
    const onCursor = head >= line.from && head <= line.to

    // Line class for the title line
    entries.push({
      from: line.from,
      to: line.from,
      deco: Decoration.line({
        class: `cm-lp-callout cm-lp-callout-${typeKey}`,
        attributes: { style: `--callout-color:${info.color}` }
      })
    })

    if (!onCursor) {
      // Replace "> [!TYPE] " prefix with icon+title widget
      const prefixEnd = line.from + m[0].length
      entries.push({ from: line.from, to: prefixEnd, deco: Decoration.replace({}) })
    }

    // Body lines (continuation lines starting with "> ")
    let j = i + 1
    while (j <= state.doc.lines) {
      const bodyLine = state.doc.line(j)
      if (!bodyLine.text.startsWith('> ') && bodyLine.text !== '>') break
      const onBodyCursor = head >= bodyLine.from && head <= bodyLine.to
      entries.push({
        from: bodyLine.from,
        to: bodyLine.from,
        deco: Decoration.line({
          class: 'cm-lp-callout-body',
          attributes: { style: `--callout-color:${info.color}` }
        })
      })
      if (!onBodyCursor) {
        // Hide the "> " prefix on body lines
        const gtEnd = bodyLine.text.startsWith('> ') ? bodyLine.from + 2 : bodyLine.from + 1
        entries.push({ from: bodyLine.from, to: gtEnd, deco: Decoration.replace({}) })
      }
      j++
    }
    i = j - 1
  }

  return entries
}

export const calloutsFormatter: MarkdownFormatter = {
  name: 'callouts',
  preprocessMd,
  cmDecorations
}
```

- [ ] **Step 2: Register in markdownCore.ts — add at the bottom of the file**

```ts
// Auto-register built-in formatters
import { calloutsFormatter } from './markdownCoreFormatters/calloutsFormatter'
registerFormatter(calloutsFormatter)
```

- [ ] **Step 3: Typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npx tsc --noEmit 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git -C "/Users/vladyslav/Desktop/dev/new project/meridian" add src/renderer/src/lib/markdownCoreFormatters/calloutsFormatter.ts src/renderer/src/lib/markdownCore.ts
git -C "/Users/vladyslav/Desktop/dev/new project/meridian" commit -m "feat: calloutsFormatter for HTML and live preview"
```

---

### Task 3: highlightsFormatter — ==text== in HTML and live preview

**Files:**

- Create: `src/renderer/src/lib/markdownCoreFormatters/highlightsFormatter.ts`
- Modify: `src/renderer/src/lib/markdownCore.ts` (add import + registration)

- [ ] **Step 1: Create highlightsFormatter.ts**

```ts
import type { EditorView } from '@codemirror/view'
import { Decoration } from '@codemirror/view'
import type { MarkdownFormatter, CmEntry } from '../markdownCore'

function preprocessMd(md: string): string {
  return md.replace(/(`+[\s\S]*?`+)|==([^=\n]{1,300})==/g, (m, code, hl) => {
    if (code !== undefined) return m
    return `<mark style="background:rgba(255,220,0,0.3);border-radius:2px;padding:0 2px">${hl}</mark>`
  })
}

function cmDecorations(view: EditorView): CmEntry[] {
  const { state } = view
  const head = state.selection.main.head
  const entries: CmEntry[] = []
  const re = /==([^=\n]{1,300})==/g
  const text = state.doc.toString()
  let m: RegExpExecArray | null

  while ((m = re.exec(text)) !== null) {
    const from = m.index
    const to = from + m[0].length
    const innerFrom = from + 2
    const innerTo = to - 2
    const line = state.doc.lineAt(from)
    const onCursor = head >= line.from && head <= line.to

    // Mark full ==text== range with highlight class
    entries.push({ from, to, deco: Decoration.mark({ class: 'cm-lp-highlight' }) })

    if (!onCursor) {
      // Hide the == markers
      entries.push({ from, to: innerFrom, deco: Decoration.replace({}) })
      entries.push({ from: innerTo, to, deco: Decoration.replace({}) })
    }
  }

  return entries
}

export const highlightsFormatter: MarkdownFormatter = {
  name: 'highlights',
  preprocessMd,
  cmDecorations
}
```

- [ ] **Step 2: Register in markdownCore.ts — append after calloutsFormatter import**

```ts
import { highlightsFormatter } from './markdownCoreFormatters/highlightsFormatter'
registerFormatter(highlightsFormatter)
```

- [ ] **Step 3: Typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npx tsc --noEmit 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git -C "/Users/vladyslav/Desktop/dev/new project/meridian" add src/renderer/src/lib/markdownCoreFormatters/highlightsFormatter.ts src/renderer/src/lib/markdownCore.ts
git -C "/Users/vladyslav/Desktop/dev/new project/meridian" commit -m "feat: highlightsFormatter for HTML and live preview"
```

---

### Task 4: wikiLinksFormatter — [[links]] in HTML and live preview

**Files:**

- Create: `src/renderer/src/lib/markdownCoreFormatters/wikiLinksFormatter.ts`
- Modify: `src/renderer/src/lib/markdownCore.ts`

The `postprocessHtml` is the existing `postprocessWikiLinks` from `markdownUtils.ts`. The `cmDecorations` applies a class to `[[...]]` spans.

- [ ] **Step 1: Create wikiLinksFormatter.ts**

```ts
import type { EditorView } from '@codemirror/view'
import { Decoration } from '@codemirror/view'
import type { VaultFile } from '@shared/types'
import type { MarkdownFormatter, CmEntry } from '../markdownCore'
import { postprocessWikiLinks } from '../../components/Editor/markdownUtils'

function cmDecorations(view: EditorView): CmEntry[] {
  const { state } = view
  const entries: CmEntry[] = []
  const re = /!?\[\[([^\]]+)\]\]/g
  const text = state.doc.toString()
  let m: RegExpExecArray | null

  while ((m = re.exec(text)) !== null) {
    const isEmbed = m[0].startsWith('!')
    if (isEmbed) continue // embeds handled elsewhere
    const from = m.index
    const to = from + m[0].length
    entries.push({ from, to, deco: Decoration.mark({ class: 'cm-lp-wikilink' }) })
  }

  return entries
}

export const wikiLinksFormatter: MarkdownFormatter = {
  name: 'wikiLinks',
  postprocessHtml: (html: string, files: VaultFile[]) => postprocessWikiLinks(html, files),
  cmDecorations
}
```

- [ ] **Step 2: Register in markdownCore.ts**

```ts
import { wikiLinksFormatter } from './markdownCoreFormatters/wikiLinksFormatter'
registerFormatter(wikiLinksFormatter)
```

- [ ] **Step 3: Typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npx tsc --noEmit 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git -C "/Users/vladyslav/Desktop/dev/new project/meridian" add src/renderer/src/lib/markdownCoreFormatters/wikiLinksFormatter.ts src/renderer/src/lib/markdownCore.ts
git -C "/Users/vladyslav/Desktop/dev/new project/meridian" commit -m "feat: wikiLinksFormatter for HTML and live preview"
```

---

### Task 5: taskListFormatter — - [ ] checkboxes in live preview

**Files:**

- Create: `src/renderer/src/lib/markdownCoreFormatters/taskListFormatter.ts`
- Modify: `src/renderer/src/lib/markdownCore.ts`

- [ ] **Step 1: Create taskListFormatter.ts**

```ts
import type { EditorView } from '@codemirror/view'
import { Decoration, WidgetType } from '@codemirror/view'
import type { MarkdownFormatter, CmEntry } from '../markdownCore'

class CheckboxWidget extends WidgetType {
  constructor(private checked: boolean) {
    super()
  }
  toDOM() {
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.checked = this.checked
    input.disabled = true
    input.className = 'cm-lp-checkbox'
    input.style.cssText =
      'margin-right:6px;vertical-align:middle;cursor:default;pointer-events:none'
    return input
  }
  eq(other: CheckboxWidget) {
    return other.checked === this.checked
  }
  ignoreEvent() {
    return true
  }
}

function cmDecorations(view: EditorView): CmEntry[] {
  const { state } = view
  const head = state.selection.main.head
  const entries: CmEntry[] = []

  for (let i = 1; i <= state.doc.lines; i++) {
    const line = state.doc.line(i)
    const m = line.text.match(/^(\s*[-*+]\s)(\[[ xX]\])(\s)/)
    if (!m) continue
    const onCursor = head >= line.from && head <= line.to
    if (onCursor) continue // show raw syntax on cursor line

    const checked = m[2] !== '[ ]'
    const boxFrom = line.from + m[1].length
    const boxTo = boxFrom + m[2].length

    entries.push({
      from: boxFrom,
      to: boxTo,
      deco: Decoration.replace({ widget: new CheckboxWidget(checked) })
    })
  }

  return entries
}

export const taskListFormatter: MarkdownFormatter = {
  name: 'taskList',
  cmDecorations
}
```

- [ ] **Step 2: Register in markdownCore.ts**

```ts
import { taskListFormatter } from './markdownCoreFormatters/taskListFormatter'
registerFormatter(taskListFormatter)
```

- [ ] **Step 3: Typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npx tsc --noEmit 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git -C "/Users/vladyslav/Desktop/dev/new project/meridian" add src/renderer/src/lib/markdownCoreFormatters/taskListFormatter.ts src/renderer/src/lib/markdownCore.ts
git -C "/Users/vladyslav/Desktop/dev/new project/meridian" commit -m "feat: taskListFormatter — checkbox widgets in live preview"
```

---

### Task 6: Wire MarkdownPreview.tsx to use markdownCore

**Files:**

- Modify: `src/renderer/src/components/Editor/MarkdownPreview.tsx`

Replace the local `preProcessCallouts`, `preProcessHighlights`, and `postprocessWikiLinks` calls with the core pipeline. The local functions and the `postprocessWikiLinks` import can be removed.

- [ ] **Step 1: Add import at the top of MarkdownPreview.tsx**

Find the existing imports block and add:

```ts
import { applyPreprocessors, applyPostprocessors } from '../../../lib/markdownCore'
// Side-effect import to register built-in formatters
import '../../../lib/markdownCore'
```

- [ ] **Step 2: Update the html useMemo (lines ~172-189)**

Find:

```ts
const preprocessed = preProcessHighlights(preProcessCallouts(stripped))
const sanitized = String(processor.processSync(preprocessed))
const withLinks = postprocessWikiLinks(sanitized, files)
```

Replace with:

```ts
const preprocessed = applyPreprocessors(stripped)
const sanitized = String(processor.processSync(preprocessed))
const withLinks = applyPostprocessors(sanitized, files)
```

- [ ] **Step 3: Remove now-unused local functions and imports**

Delete:

- The `function preProcessCallouts(md: string)` block (lines 32-47)
- The `function preProcessHighlights(md: string)` block (lines 50-55)
- The `postprocessWikiLinks` from the import on line 12: `import { flattenVaultFiles, postprocessWikiLinks, CALLOUT_TYPES } from './markdownUtils'`
  → change to: `import { flattenVaultFiles } from './markdownUtils'`

**Note:** Keep `flattenVaultFiles` import — it is still used by the drawing/note embed `useEffect`s.

- [ ] **Step 4: Typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npx tsc --noEmit 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git -C "/Users/vladyslav/Desktop/dev/new project/meridian" add src/renderer/src/components/Editor/MarkdownPreview.tsx
git -C "/Users/vladyslav/Desktop/dev/new project/meridian" commit -m "refactor: MarkdownPreview uses markdownCore pipeline"
```

---

### Task 7: Wire livePreviewExtension.ts to use markdownCore

**Files:**

- Modify: `src/renderer/src/components/Editor/extensions/livePreviewExtension.ts`

Add `collectCmDecorations` call and merge its entries with the existing syntax-tree entries.

- [ ] **Step 1: Add import at top of livePreviewExtension.ts**

```ts
import { collectCmDecorations } from '../../../lib/markdownCore'
// Side-effect import to ensure formatters are registered
import '../../../lib/markdownCore'
```

- [ ] **Step 2: Update buildDecos to collect from both sources**

Find the `function buildDecos(view: EditorView)` function. At the start, after `const entries: Entry[] = []`, add:

```ts
// Collect decorations from registered formatters (callouts, highlights, wikilinks, task-list)
const coreEntries = collectCmDecorations(view)
entries.push(...coreEntries)
```

- [ ] **Step 3: Typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npx tsc --noEmit 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git -C "/Users/vladyslav/Desktop/dev/new project/meridian" add src/renderer/src/components/Editor/extensions/livePreviewExtension.ts
git -C "/Users/vladyslav/Desktop/dev/new project/meridian" commit -m "feat: livePreviewExtension collects decorations from markdownCore formatters"
```

---

### Task 8: Add CSS for new live preview classes

**Files:**

- Modify: `src/renderer/src/assets/meridian.css`

- [ ] **Step 1: Append to meridian.css**

```css
/* markdownCore live preview — highlights, wikilinks, callouts, checkboxes */
.cm-lp-highlight {
  background: rgba(255, 220, 0, 0.28);
  border-radius: 2px;
  padding: 0 2px;
}
.cm-lp-wikilink {
  color: var(--accent-color);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}
.cm-lp-callout {
  border-left: 3px solid var(--callout-color, #6b7280);
  padding-left: 10px;
  background: color-mix(in srgb, var(--callout-color, #6b7280) 8%, transparent);
  border-radius: 0 3px 3px 0;
}
.cm-lp-callout-body {
  border-left: 3px solid var(--callout-color, #6b7280);
  padding-left: 10px;
  opacity: 0.85;
}
```

- [ ] **Step 2: Commit**

```bash
git -C "/Users/vladyslav/Desktop/dev/new project/meridian" add src/renderer/src/assets/meridian.css
git -C "/Users/vladyslav/Desktop/dev/new project/meridian" commit -m "style: CSS classes for markdownCore live preview formatters"
```

---

## Self-Review

**Spec coverage:**

- ✅ Registry with `registerFormatter` → Task 1
- ✅ `calloutsFormatter` HTML + CM → Task 2
- ✅ `highlightsFormatter` HTML + CM → Task 3
- ✅ `wikiLinksFormatter` HTML + CM → Task 4
- ✅ `taskListFormatter` CM → Task 5
- ✅ `MarkdownPreview.tsx` wired → Task 6
- ✅ `livePreviewExtension.ts` wired → Task 7
- ✅ CSS → Task 8

**Placeholder scan:** No TBDs. All code is complete with exact function bodies.

**Type consistency:**

- `CmEntry` defined in Task 1, used in Tasks 2-5 ✓
- `MarkdownFormatter` interface defined in Task 1, implemented in Tasks 2-5 ✓
- `collectCmDecorations(view: EditorView): CmEntry[]` in Task 1, called in Task 7 ✓
- `applyPreprocessors(md: string): string` in Task 1, called in Task 6 ✓
- `applyPostprocessors(html: string, files: VaultFile[]): string` in Task 1, called in Task 6 ✓

**Edge case:** The `highlightsFormatter.cmDecorations` scans the full document string with regex. For very large documents this may be slow. Acceptable for now — can be optimised later with viewport-only scanning.

**Registration order matters:** callouts preprocess must run before highlights (so `==` inside callout bodies isn't double-processed). Registry is append-only and order matches task order: callouts → highlights → wikiLinks → taskList.
