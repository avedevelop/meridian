# Markdown Formatting Core — Design Spec

## Goal

Single source of truth for all markdown formatting in Meridian. Both the HTML preview (`MarkdownPreview.tsx`) and the CodeMirror live preview (`livePreviewExtension.ts`) consume the same formatter registry, guaranteeing feature parity. Future plugins register formatters the same way.

## Architecture

### `src/renderer/src/lib/markdownCore.ts` — Formatter registry

```ts
import type { EditorView } from '@codemirror/view'
import type { Decoration } from '@codemirror/view'
import type { VaultFile } from '@shared/types'

export type CmEntry = { from: number; to: number; deco: Decoration }

export interface MarkdownFormatter {
  name: string
  // HTML pipeline — run before remark (raw markdown → raw markdown)
  preprocessMd?: (md: string) => string
  // HTML pipeline — run after rehype stringify (html string → html string)
  postprocessHtml?: (html: string, files: VaultFile[]) => string
  // CodeMirror live preview — return decoration entries for this view state
  cmDecorations?: (view: EditorView) => CmEntry[]
}

const registry: MarkdownFormatter[] = []

export function registerFormatter(f: MarkdownFormatter): void
export function getFormatters(): MarkdownFormatter[]
export function applyPreprocessors(md: string): string
export function applyPostprocessors(html: string, files: VaultFile[]): string
export function collectCmDecorations(view: EditorView): CmEntry[]
```

### Built-in formatters (registered in `markdownCore.ts` at module load)

| Name         | preprocessMd                              | postprocessHtml                         | cmDecorations                                            |
| ------------ | ----------------------------------------- | --------------------------------------- | -------------------------------------------------------- |
| `callouts`   | `> [!NOTE]` → `<div class="callout ...">` | —                                       | Line class + title widget for callout blocks             |
| `highlights` | `==text==` → `<mark>`                     | —                                       | `Decoration.mark` class, replace `==` markers off-cursor |
| `wikiLinks`  | —                                         | `[[link]]` → `<span class="wiki-link">` | `Decoration.mark` class on `[[...]]` spans               |
| `taskList`   | —                                         | —                                       | Replace `[ ]`/`[x]` with checkbox widget                 |

### Updated consumers

**`MarkdownPreview.tsx`** — replace local `preProcessCallouts`, `preProcessHighlights` with:

```ts
import { applyPreprocessors, applyPostprocessors } from '../../lib/markdownCore'
// In useMemo:
const preprocessed = applyPreprocessors(stripped)
const html = applyPostprocessors(String(processor.processSync(preprocessed)), files)
```

**`livePreviewExtension.ts`** — replace local switch/case with:

```ts
import { collectCmDecorations } from '../../lib/markdownCore'
// In buildDecos():
const entries = collectCmDecorations(view)
// + existing basic markdown decorations (headings, bold, italic, etc.)
```

### Formatter details

**Callouts formatter (cmDecorations):**

- Detect lines matching `^> \[!([\w]+)\](.*)` using the document text (not syntax tree, since callouts are custom syntax)
- For the first line: apply `Decoration.line({ class: 'cm-lp-callout cm-lp-callout-{type}' })` + a widget showing the icon+title
- For continuation lines (`^> `): apply `Decoration.line({ class: 'cm-lp-callout-body' })`
- When cursor is on any callout line: show raw syntax (same cursor-on-line logic as existing decorations)

**Highlights formatter (cmDecorations):**

- Regex scan: `==([^=\n]{1,300})==`
- Apply `Decoration.mark({ class: 'cm-lp-highlight' })` on full match
- Apply `Decoration.replace({})` on `==` markers when cursor not on same line

**WikiLinks formatter (cmDecorations):**

- Regex scan: `\[\[([^\]]+)\]\]`
- Apply `Decoration.mark({ class: 'cm-lp-wikilink' })` on full `[[...]]`

**TaskList formatter (cmDecorations):**

- Detect `- [ ] ` and `- [x] ` at line start (using syntax tree: `ListItem > TaskMarker`)
- Replace `[ ]` with unchecked checkbox widget
- Replace `[x]` with checked checkbox widget

### CSS additions (meridian.css)

```css
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
  padding-left: 12px;
  border-radius: 0 4px 4px 0;
}
.cm-lp-callout-body {
  border-left: 3px solid var(--callout-color, #6b7280);
  padding-left: 12px;
  opacity: 0.85;
}
```

## What stays the same

- `markdownUtils.ts` — `CALLOUT_TYPES`, `flattenVaultFiles`, `IMAGE_EXTS` stay as-is (referenced by formatters)
- `postprocessWikiLinks` moves into the `wikiLinks` formatter's `postprocessHtml`
- `preProcessCallouts`, `preProcessHighlights` move into their formatters' `preprocessMd`
- Mermaid, note embeds, drawings rendering via `useEffect` in `MarkdownPreview.tsx` stays unchanged (too complex for core)
- The basic markdown decorations in `livePreviewExtension.ts` (headings, bold, italic, strike, HR, blockquotes) stay in that file alongside core formatter decorations

## File structure

```
src/renderer/src/lib/
  markdownCore.ts          ← NEW: registry + built-in formatters
  markdownCoreFormatters/
    calloutsFormatter.ts   ← NEW
    highlightsFormatter.ts ← NEW
    wikiLinksFormatter.ts  ← NEW
    taskListFormatter.ts   ← NEW

src/renderer/src/components/Editor/
  MarkdownPreview.tsx      ← MODIFY: use applyPreprocessors/applyPostprocessors
  markdownUtils.ts         ← KEEP: CALLOUT_TYPES, flattenVaultFiles, IMAGE_EXTS
  extensions/
    livePreviewExtension.ts ← MODIFY: add collectCmDecorations
```

## Self-review

- ✅ No placeholders or TBDs
- ✅ `postprocessWikiLinks` receives `files: VaultFile[]` — interface handles this via the `postprocessHtml` signature
- ✅ Callout cmDecorations uses document text scan (not syntax tree) — correct since callouts are not standard markdown
- ✅ Scope: single system, no decomposition needed
