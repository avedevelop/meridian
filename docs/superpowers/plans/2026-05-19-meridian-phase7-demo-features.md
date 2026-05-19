# Meridian Phase 7: Demo Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Table of Contents panel, Export to HTML (⌘E), and Create New Vault to make Meridian feel production-ready for portfolio demos.

**Architecture:** ToC parses headings from active note content via regex, adds `id` attributes to preview headings via post-processing, and scrolls the preview on click. Export renders the note via the existing remark pipeline and saves a self-contained HTML file via a new IPC channel using Electron's save dialog. Create New Vault reuses the existing vault open dialog (macOS Finder already supports creating directories) plus creates a welcome note when the vault is empty.

**Tech Stack:** Existing remark/rehype pipeline (export), Electron `dialog.showSaveDialog` (export), Electron `dialog.showOpenDialog` (already used for vaults), React (TocPanel), Vitest (tests)

---

## File Structure

```
New:
  meridian/src/renderer/src/components/RightPanel/TocPanel.tsx
  meridian/tests/renderer/TocPanel.test.tsx

Modified:
  meridian/src/shared/types.ts                              - add VAULT_EXPORT_HTML IPC constant
  meridian/src/main/ipc.ts                                  - add export HTML handler
  meridian/src/preload/index.ts                             - expose exportHtml
  meridian/src/renderer/src/hooks/useVaultBridge.ts         - add exportNote, createNewVault
  meridian/src/renderer/src/components/RightPanel/RightPanel.tsx  - add ToC tab
  meridian/src/renderer/src/components/Editor/MarkdownPreview.tsx - add heading IDs
  meridian/src/renderer/src/components/VaultPicker.tsx      - add "New Vault" button
  meridian/src/renderer/src/App.tsx                         - add ⌘E shortcut
```

---

## Task 1: Table of Contents Panel

**Files:**
- Create: `meridian/src/renderer/src/components/RightPanel/TocPanel.tsx`
- Create: `meridian/tests/renderer/TocPanel.test.tsx`
- Modify: `meridian/src/renderer/src/components/Editor/MarkdownPreview.tsx`
- Modify: `meridian/src/renderer/src/components/RightPanel/RightPanel.tsx`

### Step 1: Write failing tests for parseHeadings

Create `meridian/tests/renderer/TocPanel.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseHeadings } from '../../src/renderer/src/components/RightPanel/TocPanel'

describe('parseHeadings', () => {
  it('extracts h1 through h3 headings', () => {
    const content = '# Title\n\nSome text.\n\n## Section\n\n### Subsection\n'
    const result = parseHeadings(content)
    expect(result).toEqual([
      { level: 1, text: 'Title', index: 0 },
      { level: 2, text: 'Section', index: 1 },
      { level: 3, text: 'Subsection', index: 2 },
    ])
  })

  it('returns empty array for content with no headings', () => {
    expect(parseHeadings('Just plain text.\n\nNo headings here.')).toEqual([])
  })

  it('skips headings inside fenced code blocks', () => {
    const content = '# Real heading\n\n```\n# Not a heading\n```\n'
    const result = parseHeadings(content)
    expect(result).toEqual([{ level: 1, text: 'Real heading', index: 0 }])
  })

  it('handles headings with inline formatting stripped', () => {
    const result = parseHeadings('## **Bold** and `code` heading')
    expect(result[0].text).toBe('**Bold** and `code` heading')
  })

  it('assigns sequential index starting from 0', () => {
    const result = parseHeadings('# A\n## B\n### C')
    expect(result.map(h => h.index)).toEqual([0, 1, 2])
  })
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npx vitest run tests/renderer/TocPanel.test.tsx 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module`

- [ ] **Step 3: Create TocPanel.tsx with parseHeadings exported**

Create `meridian/src/renderer/src/components/RightPanel/TocPanel.tsx`:

```typescript
import { useMemo } from 'react'
import { useVaultStore } from '../../store/useVaultStore'

export interface TocHeading {
  level: number
  text: string
  index: number  // sequential, used as the DOM id: toc-{index}
}

export function parseHeadings(content: string): TocHeading[] {
  const headings: TocHeading[] = []
  let inCodeBlock = false
  let index = 0

  for (const line of content.split('\n')) {
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) continue

    const match = line.match(/^(#{1,6})\s+(.+)/)
    if (match) {
      headings.push({ level: match[1].length, text: match[2].trim(), index: index++ })
    }
  }

  return headings
}

function scrollToHeading(index: number) {
  const el = document.querySelector(`.markdown-preview #toc-${index}`)
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function TocPanel() {
  const { openTabs, activeTabPath } = useVaultStore()
  const activeTab = openTabs.find(t => t.path === activeTabPath)

  const headings = useMemo(
    () => parseHeadings(activeTab?.content ?? ''),
    [activeTab?.content]
  )

  if (!activeTab) {
    return <div style={{ padding: 12, color: '#444', fontSize: 12 }}>No note open.</div>
  }

  if (headings.length === 0) {
    return (
      <div style={{ padding: 12, color: '#444', fontSize: 12 }}>
        No headings found. Use # Heading in your note.
      </div>
    )
  }

  return (
    <div style={{ padding: '8px 0', fontSize: 12 }}>
      {headings.map(h => (
        <div
          key={h.index}
          onClick={() => scrollToHeading(h.index)}
          title={h.text}
          style={{
            paddingLeft: 8 + (h.level - 1) * 12,
            paddingRight: 12,
            paddingTop: 4,
            paddingBottom: 4,
            cursor: 'pointer',
            color: h.level === 1 ? '#ccc' : h.level === 2 ? '#aaa' : '#777',
            fontSize: h.level === 1 ? 12 : 11,
            fontWeight: h.level === 1 ? 600 : 400,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            borderLeft: `2px solid ${h.level === 1 ? '#7c6af7' : 'transparent'}`,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = h.level === 1 ? '#ccc' : h.level === 2 ? '#aaa' : '#777')}
        >
          {h.text}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npx vitest run tests/renderer/TocPanel.test.tsx 2>&1 | tail -10
```

Expected: `Tests  5 passed (5)`

- [ ] **Step 5: Add heading IDs to MarkdownPreview**

Read `meridian/src/renderer/src/components/Editor/MarkdownPreview.tsx`.

Add a `addHeadingIds` post-process function after `postprocessWikiLinks`:

```typescript
function addHeadingIds(html: string): string {
  let counter = 0
  return html.replace(/<(h[1-6])(\s|>)/g, (_m, tag, after) => `<${tag} id="toc-${counter++}"${after}`)
}
```

Update the `useMemo` in `MarkdownPreview` to call `addHeadingIds` on the result:

```typescript
  const html = useMemo(() => {
    try {
      const sanitized = String(processor.processSync(content))
      const withLinks = postprocessWikiLinks(sanitized)
      const withIds = addHeadingIds(withLinks)
      if (!vaultPath) return withIds
      return withIds.replace(
        /(<img)([^>]*src=")(?!https?:\/\/)(?!data:)(?!vault:\/\/\/)([^"]+)(")/g,
        (_m, imgTag, pre, src, post) =>
          `${imgTag} style="max-width:100%;height:auto;border-radius:4px"${pre}vault:///${src}${post}`
      )
    } catch {
      return '<p>Preview error</p>'
    }
  }, [content, vaultPath])
```

- [ ] **Step 6: Add ToC tab to RightPanel**

Read `meridian/src/renderer/src/components/RightPanel/RightPanel.tsx`.

Add import at top:
```typescript
import { TocPanel } from './TocPanel'
```

Change `type RightTab = 'backlinks' | 'tags'` to:
```typescript
type RightTab = 'backlinks' | 'tags' | 'toc'
```

Add to the tabs array:
```typescript
  const tabs: { id: RightTab; label: string }[] = [
    { id: 'backlinks', label: 'Links' },
    { id: 'tags', label: 'Tags' },
    { id: 'toc', label: 'ToC' },
  ]
```

Add to the content section:
```typescript
        {activeTab === 'toc' && <TocPanel />}
```

- [ ] **Step 7: Run all tests and typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npx vitest run && npm run typecheck 2>&1 | grep -v node_modules | grep "error TS" | head -10
```

Expected: all tests pass, no new TS errors.

- [ ] **Step 8: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && git add -A && git commit -m "feat: Table of Contents panel — 3rd tab in right panel, click to scroll preview"
```

---

## Task 2: Export to HTML (⌘E)

**Files:**
- Modify: `meridian/src/shared/types.ts`
- Modify: `meridian/src/main/ipc.ts`
- Modify: `meridian/src/preload/index.ts`
- Modify: `meridian/src/renderer/src/hooks/useVaultBridge.ts`
- Modify: `meridian/src/renderer/src/App.tsx`

No unit tests for this task — it's a UI flow involving Electron dialogs. Manual verification is sufficient.

- [ ] **Step 1: Add IPC constant**

Read `meridian/src/shared/types.ts`. Add after `SETTINGS_SET`:
```typescript
  VAULT_EXPORT_HTML: 'vault:export-html',
```

- [ ] **Step 2: Add IPC handler in ipc.ts**

Read `meridian/src/main/ipc.ts`.

Add after the `SETTINGS_SET` handler:

```typescript
  ipcMain.handle(IPC.VAULT_EXPORT_HTML, async (_event, suggestedName: string, html: string) => {
    const result = await dialog.showSaveDialog({
      title: 'Export Note as HTML',
      defaultPath: suggestedName,
      filters: [{ name: 'HTML Files', extensions: ['html'] }],
      buttonLabel: 'Export',
    })
    if (result.canceled || !result.filePath) return null
    const { writeFile } = await import('fs/promises')
    await writeFile(result.filePath, html, 'utf-8')
    return result.filePath
  })
```

- [ ] **Step 3: Expose in preload**

Read `meridian/src/preload/index.ts`. Add to the `settingsAPI` object (or create a separate export — easiest: add to `window.vault` API):

Actually add to `vaultAPI` after `writeBinary`:
```typescript
  exportHtml: (suggestedName: string, html: string): Promise<string | null> =>
    ipcRenderer.invoke(IPC.VAULT_EXPORT_HTML, suggestedName, html),
```

- [ ] **Step 4: Add exportNote to useVaultBridge**

Read `meridian/src/renderer/src/hooks/useVaultBridge.ts`.

Add `exportHtml` to the `Window.vault` type declaration:
```typescript
      exportHtml: (suggestedName: string, html: string) => Promise<string | null>
```

Add `exportNote` callback. It renders the active note to a self-contained HTML document and saves it via the IPC. Place it after `saveImage`:

```typescript
  const exportNote = useCallback(async () => {
    const { openTabs, activeTabPath } = useVaultStore.getState()
    const activeTab = openTabs.find(t => t.path === activeTabPath)
    if (!activeTab) return

    // Render markdown to body HTML using the same remark pipeline
    const { unified } = await import('unified')
    const { default: remarkParse } = await import('remark-parse')
    const { default: remarkGfm } = await import('remark-gfm')
    const { default: remarkRehype } = await import('remark-rehype')
    const { default: rehypeStringify } = await import('rehype-stringify')

    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeStringify)

    const bodyHtml = String(processor.processSync(activeTab.content))

    const title = activeTab.name.replace(/\.md$/i, '')
    const suggestedName = `${title}.html`

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { max-width: 720px; margin: 0 auto; padding: 48px 24px; font-family: Georgia, serif; line-height: 1.8; color: #1a1a1a; background: #fafaf8; }
    h1, h2, h3, h4, h5, h6 { font-weight: 700; line-height: 1.3; margin-top: 2em; margin-bottom: 0.5em; }
    h1 { font-size: 2em; border-bottom: 2px solid #eee; padding-bottom: 0.3em; margin-top: 0; }
    h2 { font-size: 1.5em; }
    h3 { font-size: 1.25em; }
    p { margin: 0 0 1em; }
    a { color: #7c6af7; text-decoration: underline; }
    code { background: #f0eff5; padding: 2px 6px; border-radius: 4px; font-size: 0.88em; font-family: 'SF Mono', monospace; }
    pre { background: #f5f4fa; padding: 20px; border-radius: 8px; overflow-x: auto; margin: 1.5em 0; }
    pre code { background: none; padding: 0; font-size: 0.85em; }
    blockquote { border-left: 4px solid #ddd; margin: 1.5em 0; padding: 0.5em 1em; color: #555; }
    img { max-width: 100%; border-radius: 6px; margin: 1em 0; }
    table { border-collapse: collapse; width: 100%; margin: 1.5em 0; }
    th, td { border: 1px solid #ddd; padding: 10px 14px; text-align: left; }
    th { background: #f5f4fa; font-weight: 600; }
    hr { border: none; border-top: 2px solid #eee; margin: 2em 0; }
    ul, ol { padding-left: 1.5em; margin: 0 0 1em; }
    li { margin-bottom: 0.25em; }
    .footnote { font-size: 0.85em; color: #666; }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`

    const savedPath = await window.vault.exportHtml(suggestedName, fullHtml)
    if (savedPath) {
      console.log('[Bridge] exported to', savedPath)
    }
  }, [])
```

Add `exportNote` to the return:
```typescript
  return { openVault, refreshFiles, openFile, saveFile, createFile, createFolder, renameFile, deleteFile, openVaultByPath, openDailyNote, saveImage, exportNote, createNewVault }
```

Note: `createNewVault` is added in Task 3. For now:
```typescript
  return { openVault, refreshFiles, openFile, saveFile, createFile, createFolder, renameFile, deleteFile, openVaultByPath, openDailyNote, saveImage, exportNote }
```

- [ ] **Step 5: Add ⌘E shortcut in App.tsx**

Read `meridian/src/renderer/src/App.tsx`.

Add `exportNote` to the `useVaultBridge()` destructuring.

In the keydown handler, add:
```typescript
        if (e.key === 'e') { e.preventDefault(); exportNote() }
```

Add `exportNote` to the `useEffect` dependency array.

- [ ] **Step 6: Typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm run typecheck 2>&1 | grep -v node_modules | grep "error TS" | head -10
```

Fix any new errors.

- [ ] **Step 7: Manual test**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm run dev
```

Open a note with headings, press ⌘E → save dialog appears with `NoteName.html` as default → save → open the file in a browser → verify it looks like a clean article.

- [ ] **Step 8: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && git add -A && git commit -m "feat: export note to HTML via ⌘E — self-contained file with embedded CSS"
```

---

## Task 3: Create New Vault

**Files:**
- Modify: `meridian/src/renderer/src/hooks/useVaultBridge.ts`
- Modify: `meridian/src/renderer/src/components/VaultPicker.tsx`

No new IPC needed — the existing `vault:open-dialog` already supports macOS Finder's "New Folder" button. We just add a welcome note when the vault is empty.

- [ ] **Step 1: Add createNewVault to useVaultBridge**

Read `meridian/src/renderer/src/hooks/useVaultBridge.ts`.

Add `createNewVault` callback after `exportNote`:

```typescript
  const createNewVault = useCallback(async () => {
    // Re-use the same open dialog — on macOS Finder has a built-in "New Folder" button
    const config = await window.vault.openDialog()
    if (!config) return
    await initVault(config)

    // Create a welcome note only if the vault folder is empty
    const { files } = useVaultStore.getState()
    if (files.length === 0) {
      const welcomeContent = [
        '# Welcome to Meridian',
        '',
        'This is your new vault. Here are a few things to try:',
        '',
        '- **Write** — just start typing in any note',
        '- **Link notes** — type `[[Note Name]]` to create a wiki-link',
        '- **Daily note** — press `⌘D` to open today\'s note',
        '- **Search** — press `⌘K` to search across all notes',
        '- **Graph** — click the 🕸️ tab in the sidebar to see your note network',
        '',
        '## Quick shortcuts',
        '',
        '| Shortcut | Action |',
        '|----------|--------|',
        '| `⌘S` | Save note |',
        '| `⌘D` | Open daily note |',
        '| `⌘K` | Command palette |',
        '| `⌘E` | Export to HTML |',
        '| `⌘,` | Settings |',
        '',
        'Happy writing! 📓',
      ].join('\n')

      try {
        const filePath = await window.vault.createFile(config.path, 'Welcome.md')
        await window.vault.writeFile(filePath, welcomeContent)
        useLinkStore.getState().indexFile(filePath, 'Welcome.md', welcomeContent, config.path)
        const updatedFiles = await window.vault.listFiles()
        useVaultStore.getState().setFiles(updatedFiles)
        await openFile(filePath, 'Welcome.md')
      } catch (e) {
        console.error('[Bridge] createNewVault welcome note error', e)
      }
    }
  }, [initVault, openFile])
```

Update the return to include `createNewVault`:
```typescript
  return { openVault, refreshFiles, openFile, saveFile, createFile, createFolder, renameFile, deleteFile, openVaultByPath, openDailyNote, saveImage, exportNote, createNewVault }
```

- [ ] **Step 2: Add "New Vault" button to VaultPicker**

Read `meridian/src/renderer/src/components/VaultPicker.tsx`.

Add `createNewVault` to the destructured `useVaultBridge()`:
```typescript
  const { openVault, openVaultByPath, createNewVault } = useVaultBridge()
```

Replace the single button section with two buttons side by side:

```typescript
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <button
          onClick={createNewVault}
          style={{
            padding: '12px 24px', borderRadius: 8,
            background: 'transparent', color: '#7c6af7',
            border: '2px solid #7c6af7',
            fontSize: 15, cursor: 'pointer', fontWeight: 600,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,106,247,0.1)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          New Vault
        </button>
        <button
          onClick={openVault}
          style={{
            padding: '12px 24px', borderRadius: 8,
            background: '#7c6af7', color: '#fff', border: 'none',
            fontSize: 15, cursor: 'pointer', fontWeight: 600,
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.9' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
        >
          Open Vault
        </button>
      </div>
```

- [ ] **Step 3: Typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm run typecheck 2>&1 | grep -v node_modules | grep "error TS" | head -10
```

- [ ] **Step 4: Manual test**

```bash
npm run dev
```

On the start screen: two buttons appear — "New Vault" (outlined) and "Open Vault" (filled). Click "New Vault" → Finder opens → click "New Folder" → name it → click Open → app initializes vault → Welcome.md is created and opened automatically.

- [ ] **Step 5: Run all tests**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npx vitest run 2>&1 | tail -6
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && git add -A && git commit -m "feat: Create New Vault button — opens Finder with new-folder support, creates Welcome.md"
```

---

## Self-Review

**Spec coverage:**
- ✅ Table of Contents — Task 1 (TocPanel, parseHeadings, heading IDs in preview, 3rd tab in RightPanel)
- ✅ Export to HTML (⌘E) — Task 2 (IPC, dialog, self-contained HTML with CSS)
- ✅ Create New Vault — Task 3 (createNewVault, VaultPicker two-button layout, Welcome.md)

**Placeholder scan:** No placeholders found — all code blocks are complete.

**Type consistency:**
- `parseHeadings(content: string): TocHeading[]` — called in TocPanel with `activeTab.content` ✅
- `TocHeading.index` is used as DOM id `toc-{index}` — same format in `addHeadingIds` and `scrollToHeading` ✅
- `exportNote()` has no params — called from App.tsx `⌘E` handler ✅
- `window.vault.exportHtml(suggestedName, html)` — declared in Window type, exposed in preload, handler in ipc.ts ✅
- `createNewVault()` uses `initVault` (from `useVaultBridge` closure) and `openFile` ✅
- Both `initVault` and `openFile` are in the `useVaultBridge` function scope when `createNewVault` is defined ✅

**Task dependency:** Task 3 (`createNewVault`) uses `initVault` from the bridge closure — verify `initVault` is defined earlier in `useVaultBridge.ts` (it is, added in Phase 5). Task 2's return line must NOT include `createNewVault` until Task 3 adds it — plan handles this correctly with the explicit note.
