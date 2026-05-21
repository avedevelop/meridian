# Settings Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ~25 new settings across 6 categories (Editor, Files, Appearance, Export, Sync, About), wire each one fully end-to-end, and add a new Export category to SettingsModal.

**Architecture:** All new settings live in `useSettingsStore.ts` (localStorage persistence), exposed via the existing `updateSetting` generic action. The SettingsModal renders controls using the existing Toggle/Slider/Dropdown/TextInput/ColorPicker components. Effects are applied in the respective consumer components (EditorPane, FileTree, StatusBar, etc.) by reading from the store.

**Tech Stack:** React + Zustand (store), CodeMirror 6 (editor extensions), Electron webContents (spell check), CSS variables (zoom/compact/spacing), existing IPC for export.

---

## Deferred (out of scope)
- Lock vault (requires file encryption / macOS Keychain)
- Customizable hotkeys (requires full keybinding system)
- Privacy category (depends on Lock vault)

---

## File Map

**Modified:**
- `src/renderer/src/store/useSettingsStore.ts` — add 25 new fields + defaults
- `src/renderer/src/components/Settings/SettingsModal.tsx` — add controls for all new fields + Export category
- `src/renderer/src/components/Editor/EditorPane.tsx` — apply typingMode, showInvisibles, defaultView, paragraphSpacing, indentType
- `src/renderer/src/components/Editor/extensions/markdownExtensions.ts` — code block theme, spell check, showInvisibles extension
- `src/renderer/src/components/Editor/MarkdownPreview.tsx` — apply previewFontFamily, paragraphSpacing, exportIncludeFrontmatter, exportCustomCSS
- `src/renderer/src/components/Sidebar/FileTree.tsx` — apply showHiddenFiles, excludedFolders, fileSortBy
- `src/renderer/src/components/Layout.tsx` — apply uiZoom, compactMode, showStatusBar, alwaysShowTabBar
- `src/renderer/src/components/Sidebar/GitPanel.tsx` — apply gitCommitTemplate, gitBranch
- `src/main/ipc.ts` — apply pdfPageSize to PDF export handler
- `src/renderer/src/hooks/useVaultBridge.ts` — apply attachmentFolder in image drop, confirmDelete in deleteFile, dailyNoteDateFormat

---

## Settings Reference

### Editor (8 new fields)

| Field | Type | Default | Effect |
|-------|------|---------|--------|
| `typingMode` | `'normal' \| 'typewriter' \| 'focus'` | `'normal'` | Scroll behavior + CSS overlay |
| `showInvisibles` | `boolean` | `false` | CodeMirror drawSpace/drawTab |
| `defaultView` | `'editor' \| 'split' \| 'preview'` | `'split'` | EditorPane initial mode |
| `codeBlockTheme` | `'github-dark' \| 'monokai' \| 'one-dark' \| 'solarized'` | `'github-dark'` | Highlight.js theme CSS class |
| `paragraphSpacing` | `number` | `0` | CSS var `--paragraph-spacing` (0–2em, step 0.1) |
| `spellCheck` | `boolean` | `false` | Electron webContents.session spell checker |
| `spellCheckLanguage` | `'en-US' \| 'ru-RU' \| 'de-DE' \| 'fr-FR'` | `'en-US'` | Spell checker language |
| `indentWithTabs` | `boolean` | `false` | CodeMirror indentUnit |

### Files (6 new fields)

| Field | Type | Default | Effect |
|-------|------|---------|--------|
| `attachmentFolder` | `string` | `'assets'` | ImageDrop save path |
| `dailyNoteDateFormat` | `'YYYY-MM-DD' \| 'DD-MM-YYYY' \| 'MM-DD-YYYY' \| 'DD.MM.YYYY'` | `'YYYY-MM-DD'` | Daily note filename |
| `confirmDelete` | `boolean` | `true` | Prompt before deleteFile |
| `showHiddenFiles` | `boolean` | `false` | FileTree dot-file filter |
| `excludedFolders` | `string` | `''` | Comma-separated folder names to hide from tree + search |
| `fileSortBy` | `'name' \| 'created' \| 'modified'` | `'name'` | FileTree sort order |

### Appearance (5 new fields)

| Field | Type | Default | Effect |
|-------|------|---------|--------|
| `uiZoom` | `number` | `100` | `document.body.style.zoom` (80–130, step 5) |
| `compactMode` | `boolean` | `false` | `data-compact` attr on root → CSS tighter spacing |
| `showStatusBar` | `boolean` | `true` | StatusBar render |
| `previewFontFamily` | `string` | `'Georgia'` | CSS var `--preview-font` on MarkdownPreview |
| `alwaysShowTabBar` | `boolean` | `true` | TabBar hidden when single tab if false |

### Export (4 new fields — new category)

| Field | Type | Default | Effect |
|-------|------|---------|--------|
| `defaultExportFormat` | `'html' \| 'pdf'` | `'html'` | Which export shortcut Cmd+E triggers |
| `pdfPageSize` | `'A4' \| 'Letter'` | `'A4'` | Electron printToPDF pageSize |
| `exportIncludeFrontmatter` | `boolean` | `false` | Strip YAML frontmatter from export output |
| `exportCustomCSS` | `string` | `''` | Injected into `<style>` tag in HTML/PDF export |

### Sync (2 new fields)

| Field | Type | Default | Effect |
|-------|------|---------|--------|
| `gitCommitTemplate` | `string` | `'Updated {files}'` | GitPanel auto-generated commit message template |
| `gitDefaultBranch` | `string` | `'main'` | Branch used in git push/pull in ipc.ts |

### About (3 new actions — no store fields)

- **Check for updates** button → `window.vault.openExternal('https://github.com/bvsmma/meridian/releases')`
- **Open config folder** button → `window.vault.openExternal(configDir)` where configDir comes from `window.vault.getConfigPath()` new IPC
- **Export settings** button → download `meridian-settings.json` with current localStorage settings

---

## Implementation Notes

### Typewriter mode
In `typewriter` mode, after each keypress CodeMirror scrolls so the cursor line is vertically centered. Use a CodeMirror `updateListener` that calls `view.scrollDOM.scrollTop = cursorOffset - view.scrollDOM.clientHeight / 2`.

In `focus` mode, all `.cm-line` elements except the one containing the cursor get `opacity: 0.3` via a CSS class toggled in the same updateListener.

### Show invisibles
Use CodeMirror's built-in `drawSelection` is already removed. For invisibles, add a custom decoration plugin that places `·` (U+00B7) for spaces and `→` for tabs using `Decoration.replace` with widget decorations, only when `showInvisibles` is true.

### Spell check
Electron exposes `webContents.session.setSpellCheckerLanguages([lang])` from the main process. Add IPC handler `spell:set-language` that the renderer calls when the setting changes. On app start, apply stored language.

### Code block theme
The existing MarkdownPreview already uses highlight.js. Add a `<link>` tag swap: keep a `<link id="hljs-theme">` in the document and change its `href` when `codeBlockTheme` changes. Available CDN paths for github-dark, monokai, one-dark, solarized-dark from highlight.js.

### UI Zoom
Apply via `document.documentElement.style.zoom = uiZoom + '%'` in a `useEffect` in `Layout.tsx`. This scales the entire UI uniformly.

### Compact mode
Add `data-compact="true"` to `document.documentElement` when enabled. Add CSS rules in global styles:
```css
[data-compact] .sidebar-item { padding: 3px 8px; }
[data-compact] .tab { height: 30px; }
/* etc */
```

### Export custom CSS
In `ipc.ts` VAULT_EXPORT_HTML handler, inject `<style>${exportCustomCSS}</style>` before `</head>` in the HTML template string. Same for PDF.

### Excluded folders
Store as comma-separated string (e.g., `".git, node_modules, .obsidian"`). Parse in FileTree with `excludedFolders.split(',').map(s => s.trim())` and filter from the tree recursively. Also pass to `searchIndex.ts` to skip indexing those folders.

### File sorting
FileTree currently renders `vault.children` array as-is. Wrap in a `useMemo` sort: by `name` (localeCompare), `created` (birthtime), `modified` (mtime). Apply recursively or only at root level — root level only for v1.

### Git commit template
In `GitPanel.tsx`, replace the hardcoded `autoCommitMessage()` function output with template interpolation: `template.replace('{files}', changedFiles.join(', '))`.

### Git default branch
In `ipc.ts` GIT_SYNC handler, instead of detecting branch with `rev-parse --abbrev-ref HEAD` as the push target, use `gitDefaultBranch` setting as the remote branch name for push (still detect local branch for the command).

### Config folder IPC
Add `GET_CONFIG_PATH: 'config:get-path'` to IPC constants. In main process handler, return `app.getPath('userData')`. Expose in preload as `window.vault.getConfigPath()`.

### Export settings button
In the About section, clicking "Export Settings" reads `localStorage.getItem('meridian-settings')`, creates a Blob, and triggers a download via `<a>` element with `download="meridian-settings.json"`.

### Daily note date format
In `useVaultBridge.ts` `openDailyNote()`, format today's date using the stored format. Use a simple formatter (no external library):
```ts
function formatDate(fmt: string): string {
  const d = new Date()
  const Y = d.getFullYear(), M = String(d.getMonth()+1).padStart(2,'0'), D = String(d.getDate()).padStart(2,'0')
  return fmt.replace('YYYY',String(Y)).replace('MM',M).replace('DD',D)
}
```

### Attachment folder
In EditorPane `handleEditorDrop`, after saving the image file, construct the path as `${vault.path}/${attachmentFolder}/${filename}`. Create the folder if it doesn't exist via `window.vault.createDir`.

### Confirm delete
In `FileTree.tsx` (or wherever delete is called), wrap the `window.vault.deleteFile(path)` call with `if (confirmDelete && !confirm('Delete this file?')) return`.
