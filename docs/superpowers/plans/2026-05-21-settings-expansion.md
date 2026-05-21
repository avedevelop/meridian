# Settings Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 25 new settings across Editor, Files, Appearance, Export (new), Sync, and About categories — all fully wired end-to-end.

**Architecture:** All new settings are stored as fields in `useSettingsStore` (localStorage persistence via existing `updateSetting` action). SettingsModal renders controls using existing Toggle/Slider/Dropdown/TextInput components plus a new TextAreaInput. Consumer components read from the store via `useSettingsStore` hooks. Two new IPC handlers added (getConfigPath, spell:set-language).

**Tech Stack:** React + Zustand, CodeMirror 6, Electron webContents, CSS variables.

---

## File Map

**Modified:**
- `meridian/src/renderer/src/store/useSettingsStore.ts` — 25 new fields + defaults
- `meridian/src/renderer/src/components/Settings/SettingsModal.tsx` — new controls + Export category + TextAreaInput component
- `meridian/src/renderer/src/components/Editor/EditorPane.tsx` — typingMode, showInvisibles, defaultView, paragraphSpacing, indentWithTabs, attachmentFolder
- `meridian/src/renderer/src/components/Editor/extensions/markdownExtensions.ts` — showInvisibles extension, indentWithTabs
- `meridian/src/renderer/src/components/Editor/MarkdownPreview.tsx` — previewFontFamily, exportIncludeFrontmatter, exportCustomCSS
- `meridian/src/renderer/src/components/Sidebar/Sidebar.tsx` — showHiddenFiles, excludedFolders, fileSortBy (replaces local sort state)
- `meridian/src/renderer/src/components/Editor/TabBar.tsx` — alwaysShowTabBar
- `meridian/src/renderer/src/hooks/useVaultBridge.ts` — attachmentFolder in saveImage, confirmDelete in deleteFile, dailyNoteDateFormat in openDailyNote
- `meridian/src/renderer/src/components/Sidebar/GitPanel.tsx` — gitCommitTemplate
- `meridian/src/renderer/src/App.tsx` — uiZoom, compactMode, showStatusBar
- `meridian/src/main/ipc.ts` — pdfPageSize in PDF export, GET_CONFIG_PATH handler, SPELL_SET_LANGUAGE handler
- `meridian/src/preload/index.ts` — expose getConfigPath, setSpellLanguage
- `meridian/src/shared/types.ts` — GET_CONFIG_PATH, SPELL_SET_LANGUAGE IPC constants

---

## Task 1: Extend useSettingsStore with 25 new fields

**Files:**
- Modify: `meridian/src/renderer/src/store/useSettingsStore.ts`

- [ ] **Step 1: Add new fields to SettingsState interface**

In `useSettingsStore.ts`, after the `sidebarSide` field (line ~38), add:

```ts
  // Editor new
  typingMode: 'normal' | 'typewriter' | 'focus'
  showInvisibles: boolean
  defaultView: 'editor' | 'split' | 'preview'
  codeBlockTheme: 'github-dark' | 'monokai' | 'one-dark' | 'solarized'
  paragraphSpacing: number
  spellCheck: boolean
  spellCheckLanguage: 'en-US' | 'ru-RU' | 'de-DE' | 'fr-FR'
  indentWithTabs: boolean

  // Files new
  attachmentFolder: string
  dailyNoteDateFormat: 'YYYY-MM-DD' | 'DD-MM-YYYY' | 'MM-DD-YYYY' | 'DD.MM.YYYY'
  confirmDelete: boolean
  showHiddenFiles: boolean
  excludedFolders: string
  fileSortBy: 'name' | 'created' | 'modified'

  // Appearance new
  uiZoom: number
  compactMode: boolean
  showStatusBar: boolean
  previewFontFamily: string
  alwaysShowTabBar: boolean

  // Export new
  defaultExportFormat: 'html' | 'pdf'
  pdfPageSize: 'A4' | 'Letter'
  exportIncludeFrontmatter: boolean
  exportCustomCSS: string

  // Sync new
  gitCommitTemplate: string
  gitDefaultBranch: string
```

- [ ] **Step 2: Add defaults for all 25 new fields**

In the `DEFAULTS` object (after `sidebarSide: 'left'`), add:

```ts
  typingMode: 'normal' as const,
  showInvisibles: false,
  defaultView: 'split' as const,
  codeBlockTheme: 'github-dark' as const,
  paragraphSpacing: 0,
  spellCheck: false,
  spellCheckLanguage: 'en-US' as const,
  indentWithTabs: false,
  attachmentFolder: 'assets',
  dailyNoteDateFormat: 'YYYY-MM-DD' as const,
  confirmDelete: true,
  showHiddenFiles: false,
  excludedFolders: '',
  fileSortBy: 'name' as const,
  uiZoom: 100,
  compactMode: false,
  showStatusBar: true,
  previewFontFamily: 'Georgia',
  alwaysShowTabBar: true,
  defaultExportFormat: 'html' as const,
  pdfPageSize: 'A4' as const,
  exportIncludeFrontmatter: false,
  exportCustomCSS: '',
  gitCommitTemplate: 'Updated {files}',
  gitDefaultBranch: 'main',
```

- [ ] **Step 3: Verify app still starts**

```bash
cd meridian && npm run dev
```

Expected: App opens, Settings modal shows with no TypeScript errors in console.

- [ ] **Step 4: Commit**

```bash
git add meridian/src/renderer/src/store/useSettingsStore.ts
git commit -m "feat: add 25 new settings fields to useSettingsStore"
```

---

## Task 2: SettingsModal UI — TextAreaInput + Editor + Files controls

**Files:**
- Modify: `meridian/src/renderer/src/components/Settings/SettingsModal.tsx`

**Context:** SettingsModal uses a `settingsDefinitions` array where each entry has `{ id, label, description, category, render }`. Category `'editor'` and `'files'` already exist. Add new entries to the array. The `render` function receives `store: SettingsState` and returns a React node using the existing Toggle/Slider/Dropdown/TextInput components.

- [ ] **Step 1: Add TextAreaInput component after TextInput (line ~369)**

```tsx
function TextAreaInput({
  label,
  description,
  value,
  placeholder,
  onChange
}: {
  label: string
  description?: string
  value: string
  placeholder: string
  onChange: (s: string) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '12px 16px',
        background: '#161616',
        borderRadius: 8,
        border: '1px solid #252525'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ color: '#eee', fontSize: 13, fontWeight: 500 }}>{label}</span>
        {description && <span style={{ color: '#777', fontSize: 11 }}>{description}</span>}
      </div>
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        style={{
          background: '#222',
          border: '1px solid #3c3c3c',
          borderRadius: 6,
          color: '#eee',
          fontSize: 12,
          padding: '8px 12px',
          outline: 'none',
          fontFamily: 'monospace',
          resize: 'vertical'
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Add 8 new Editor settings to settingsDefinitions array**

After the existing `closeBrackets` entry in settingsDefinitions (currently the last editor entry), add:

```ts
      {
        id: 'typingMode',
        label: 'Typing mode',
        description: 'Normal: standard scroll. Typewriter: cursor stays centered. Focus: dim other paragraphs.',
        category: 'editor',
        render: (s) => (
          <Dropdown
            label="Typing mode"
            description="Normal: standard scroll. Typewriter: cursor stays centered. Focus: dim other paragraphs."
            value={s.typingMode}
            options={[
              { value: 'normal', label: 'Normal' },
              { value: 'typewriter', label: 'Typewriter (cursor centered)' },
              { value: 'focus', label: 'Focus (dim other lines)' }
            ]}
            onChange={(v) => s.updateSetting('typingMode', v as any)}
          />
        )
      },
      {
        id: 'showInvisibles',
        label: 'Show invisible characters',
        description: 'Highlight tabs and special characters in the editor.',
        category: 'editor',
        render: (s) => (
          <Toggle
            label="Show invisible characters"
            description="Highlight tabs and special characters in the editor."
            checked={s.showInvisibles}
            onChange={(v) => s.updateSetting('showInvisibles', v)}
          />
        )
      },
      {
        id: 'defaultView',
        label: 'Default view on file open',
        description: 'Which pane layout to show when opening a note.',
        category: 'editor',
        render: (s) => (
          <Dropdown
            label="Default view on file open"
            description="Which pane layout to show when opening a note."
            value={s.defaultView}
            options={[
              { value: 'editor', label: 'Editor only' },
              { value: 'split', label: 'Split (editor + preview)' },
              { value: 'preview', label: 'Preview only' }
            ]}
            onChange={(v) => s.updateSetting('defaultView', v as any)}
          />
        )
      },
      {
        id: 'codeBlockTheme',
        label: 'Code block syntax theme',
        description: 'Color theme applied to fenced code blocks in preview.',
        category: 'editor',
        render: (s) => (
          <Dropdown
            label="Code block syntax theme"
            description="Color theme applied to fenced code blocks in preview."
            value={s.codeBlockTheme}
            options={[
              { value: 'github-dark', label: 'GitHub Dark' },
              { value: 'monokai', label: 'Monokai' },
              { value: 'one-dark', label: 'One Dark' },
              { value: 'solarized', label: 'Solarized Dark' }
            ]}
            onChange={(v) => s.updateSetting('codeBlockTheme', v as any)}
          />
        )
      },
      {
        id: 'paragraphSpacing',
        label: 'Paragraph spacing',
        description: 'Extra vertical space added between paragraphs in the editor.',
        category: 'editor',
        render: (s) => (
          <Slider
            label="Paragraph spacing"
            description="Extra vertical space between paragraphs (em units)."
            value={s.paragraphSpacing}
            min={0}
            max={2}
            unit="em"
            onChange={(v) => s.updateSetting('paragraphSpacing', v)}
          />
        )
      },
      {
        id: 'spellCheck',
        label: 'Spell check',
        description: 'Enable browser spell checking in the editor (underlines misspelled words).',
        category: 'editor',
        render: (s) => (
          <Toggle
            label="Spell check"
            description="Enable browser spell checking in the editor."
            checked={s.spellCheck}
            onChange={(v) => s.updateSetting('spellCheck', v)}
          />
        )
      },
      {
        id: 'spellCheckLanguage',
        label: 'Spell check language',
        description: 'Language used for spell checking.',
        category: 'editor',
        render: (s) => (
          <Dropdown
            label="Spell check language"
            description="Language used for spell checking."
            value={s.spellCheckLanguage}
            options={[
              { value: 'en-US', label: 'English (US)' },
              { value: 'ru-RU', label: 'Russian' },
              { value: 'de-DE', label: 'German' },
              { value: 'fr-FR', label: 'French' }
            ]}
            onChange={(v) => s.updateSetting('spellCheckLanguage', v as any)}
          />
        )
      },
      {
        id: 'indentWithTabs',
        label: 'Indent with tabs',
        description: 'Use tab characters instead of spaces for indentation.',
        category: 'editor',
        render: (s) => (
          <Toggle
            label="Indent with tabs"
            description="Use tab characters instead of spaces for indentation."
            checked={s.indentWithTabs}
            onChange={(v) => s.updateSetting('indentWithTabs', v)}
          />
        )
      },
```

- [ ] **Step 3: Add 6 new Files settings to settingsDefinitions**

After the existing `newNotesFolder` entry:

```ts
      {
        id: 'attachmentFolder',
        label: 'Attachment folder',
        description: 'Relative folder path inside the vault where pasted/dropped images are saved.',
        category: 'files',
        render: (s) => (
          <TextInput
            label="Attachment folder"
            description="Relative folder path where images are saved when dropped into the editor."
            value={s.attachmentFolder}
            placeholder="assets"
            onChange={(v) => s.updateSetting('attachmentFolder', v)}
          />
        )
      },
      {
        id: 'dailyNoteDateFormat',
        label: 'Daily note date format',
        description: 'Date format used for daily note file names.',
        category: 'files',
        render: (s) => (
          <Dropdown
            label="Daily note date format"
            description="Format of the date in the daily note filename."
            value={s.dailyNoteDateFormat}
            options={[
              { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2026-05-21)' },
              { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY (21-05-2026)' },
              { value: 'MM-DD-YYYY', label: 'MM-DD-YYYY (05-21-2026)' },
              { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY (21.05.2026)' }
            ]}
            onChange={(v) => s.updateSetting('dailyNoteDateFormat', v as any)}
          />
        )
      },
      {
        id: 'confirmDelete',
        label: 'Confirm before deleting files',
        description: 'Show a confirmation dialog before permanently deleting a file.',
        category: 'files',
        render: (s) => (
          <Toggle
            label="Confirm before deleting files"
            description="Show a confirmation dialog before permanently deleting a file."
            checked={s.confirmDelete}
            onChange={(v) => s.updateSetting('confirmDelete', v)}
          />
        )
      },
      {
        id: 'showHiddenFiles',
        label: 'Show hidden files',
        description: 'Display dot-files and dot-folders (e.g. .git, .obsidian) in the file tree.',
        category: 'files',
        render: (s) => (
          <Toggle
            label="Show hidden files"
            description="Display dot-files and dot-folders in the file tree."
            checked={s.showHiddenFiles}
            onChange={(v) => s.updateSetting('showHiddenFiles', v)}
          />
        )
      },
      {
        id: 'excludedFolders',
        label: 'Excluded folders',
        description: 'Comma-separated folder names to hide from file tree and search index.',
        category: 'files',
        render: (s) => (
          <TextInput
            label="Excluded folders"
            description="Comma-separated folder names to hide from file tree and search."
            value={s.excludedFolders}
            placeholder="node_modules, .git, .obsidian"
            onChange={(v) => s.updateSetting('excludedFolders', v)}
          />
        )
      },
      {
        id: 'fileSortBy',
        label: 'Sort files by',
        description: 'Default sort order for files and folders in the sidebar.',
        category: 'files',
        render: (s) => (
          <Dropdown
            label="Sort files by"
            description="Default sort order in the file tree sidebar."
            value={s.fileSortBy}
            options={[
              { value: 'name', label: 'Name (A→Z)' },
              { value: 'created', label: 'Date created (newest first)' },
              { value: 'modified', label: 'Date modified (newest first)' }
            ]}
            onChange={(v) => s.updateSetting('fileSortBy', v as any)}
          />
        )
      },
```

- [ ] **Step 4: Verify Settings modal renders Editor and Files tabs with new controls**

Start app, open Settings (Cmd+,), check Editor and Files tabs for new controls. No console errors.

- [ ] **Step 5: Commit**

```bash
git add meridian/src/renderer/src/components/Settings/SettingsModal.tsx
git commit -m "feat: add TextAreaInput + Editor/Files settings UI controls"
```

---

## Task 3: SettingsModal UI — Appearance + Export category + Sync + About

**Files:**
- Modify: `meridian/src/renderer/src/components/Settings/SettingsModal.tsx`

**Context:** Need to: (a) add 5 Appearance controls, (b) add `'export'` to SettingCategory type, add Export category to categoriesList, add Export icon to getCategoryIcon, add Export section in render, (c) add 2 Sync controls, (d) add 3 About action buttons.

- [ ] **Step 1: Add 5 Appearance settings to settingsDefinitions**

After the existing `sidebarSide` entry:

```ts
      {
        id: 'uiZoom',
        label: 'Interface zoom',
        description: 'Scale the entire UI. Useful for high-DPI displays or accessibility.',
        category: 'appearance',
        render: (s) => (
          <Slider
            label="Interface zoom"
            description="Scale the entire UI (80%–130%)."
            value={s.uiZoom}
            min={80}
            max={130}
            unit="%"
            onChange={(v) => s.updateSetting('uiZoom', Math.round(v / 5) * 5)}
          />
        )
      },
      {
        id: 'compactMode',
        label: 'Compact mode',
        description: 'Reduce padding and spacing throughout the interface.',
        category: 'appearance',
        render: (s) => (
          <Toggle
            label="Compact mode"
            description="Reduce padding and spacing throughout the interface."
            checked={s.compactMode}
            onChange={(v) => s.updateSetting('compactMode', v)}
          />
        )
      },
      {
        id: 'showStatusBar',
        label: 'Show status bar',
        description: 'Display the bottom status bar (word count, cursor position, git status).',
        category: 'appearance',
        render: (s) => (
          <Toggle
            label="Show status bar"
            description="Display the bottom status bar with word count and cursor position."
            checked={s.showStatusBar}
            onChange={(v) => s.updateSetting('showStatusBar', v)}
          />
        )
      },
      {
        id: 'previewFontFamily',
        label: 'Preview font family',
        description: 'Font used in the markdown preview pane (separate from editor font).',
        category: 'appearance',
        render: (s) => (
          <Dropdown
            label="Preview font family"
            description="Font used in the rendered markdown preview."
            value={s.previewFontFamily}
            options={[
              { value: 'Georgia', label: 'Georgia (Serif)' },
              { value: 'Inter', label: 'Inter (Sans)' },
              { value: 'system-ui', label: 'System UI' },
              { value: 'JetBrains Mono', label: 'JetBrains Mono' }
            ]}
            onChange={(v) => s.updateSetting('previewFontFamily', v)}
          />
        )
      },
      {
        id: 'alwaysShowTabBar',
        label: 'Always show tab bar',
        description: 'Keep the tab bar visible even when only one tab is open.',
        category: 'appearance',
        render: (s) => (
          <Toggle
            label="Always show tab bar"
            description="Keep the tab bar visible when only one tab is open."
            checked={s.alwaysShowTabBar}
            onChange={(v) => s.updateSetting('alwaysShowTabBar', v)}
          />
        )
      },
```

- [ ] **Step 2: Add export to SettingCategory type and categoriesList**

Change the type:
```ts
type SettingCategory =
  | 'editor'
  | 'files'
  | 'appearance'
  | 'canvas'
  | 'hotkeys'
  | 'plugins'
  | 'sync'
  | 'export'
  | 'about'
```

Add to `categoriesList` (before `'hotkeys'`):
```ts
    { id: 'export', label: 'Export' },
```

- [ ] **Step 3: Add Export icon to getCategoryIcon**

In `getCategoryIcon`, add a case before `default`:
```tsx
    case 'export':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      )
```

- [ ] **Step 4: Add 4 Export settings to settingsDefinitions**

```ts
      {
        id: 'defaultExportFormat',
        label: 'Default export format',
        description: 'Format triggered by the default export action (Cmd+E).',
        category: 'export',
        render: (s) => (
          <Dropdown
            label="Default export format"
            description="Format triggered by the default export shortcut."
            value={s.defaultExportFormat}
            options={[
              { value: 'html', label: 'HTML' },
              { value: 'pdf', label: 'PDF' }
            ]}
            onChange={(v) => s.updateSetting('defaultExportFormat', v as any)}
          />
        )
      },
      {
        id: 'pdfPageSize',
        label: 'PDF page size',
        description: 'Paper size used when exporting notes to PDF.',
        category: 'export',
        render: (s) => (
          <Dropdown
            label="PDF page size"
            description="Paper size used when exporting to PDF."
            value={s.pdfPageSize}
            options={[
              { value: 'A4', label: 'A4 (210×297mm)' },
              { value: 'Letter', label: 'Letter (8.5×11in)' }
            ]}
            onChange={(v) => s.updateSetting('pdfPageSize', v as any)}
          />
        )
      },
      {
        id: 'exportIncludeFrontmatter',
        label: 'Include frontmatter in exports',
        description: 'When enabled, YAML frontmatter is rendered in exported HTML/PDF.',
        category: 'export',
        render: (s) => (
          <Toggle
            label="Include frontmatter in exports"
            description="Render YAML frontmatter block in exported HTML and PDF."
            checked={s.exportIncludeFrontmatter}
            onChange={(v) => s.updateSetting('exportIncludeFrontmatter', v)}
          />
        )
      },
      {
        id: 'exportCustomCSS',
        label: 'Custom CSS for exports',
        description: 'CSS injected into exported HTML and PDF files. Use to customize typography and colors.',
        category: 'export',
        render: (s) => (
          <TextAreaInput
            label="Custom CSS for exports"
            description="Injected into <style> tag in exported HTML and PDF."
            value={s.exportCustomCSS}
            placeholder="body { font-family: Georgia; }"
            onChange={(v) => s.updateSetting('exportCustomCSS', v)}
          />
        )
      },
```

- [ ] **Step 5: Add Export category render section**

In the `{activeCategory === 'sync' && ...}` block, before it add:

```tsx
                  {activeCategory === 'export' && (
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: 16, fontWeight: 600 }}>
                        Export
                      </h3>
                      <p style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)', fontSize: 12 }}>
                        Configure PDF page size, frontmatter handling, and custom CSS for exported notes.
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {settingsDefinitions
                          .filter((s) => s.category === 'export')
                          .map((s) => (
                            <div key={s.id}>{s.render(store)}</div>
                          ))}
                      </div>
                    </div>
                  )}
```

- [ ] **Step 6: Add 2 Sync settings to settingsDefinitions**

```ts
      {
        id: 'gitCommitTemplate',
        label: 'Commit message template',
        description: 'Template for auto-generated commit messages. Use {files} as placeholder for changed file names.',
        category: 'sync',
        render: (s) => (
          <TextInput
            label="Commit message template"
            description="Use {files} as placeholder. Example: 'Updated {files}'"
            value={s.gitCommitTemplate}
            placeholder="Updated {files}"
            onChange={(v) => s.updateSetting('gitCommitTemplate', v)}
          />
        )
      },
      {
        id: 'gitDefaultBranch',
        label: 'Default git branch',
        description: 'Branch name used as fallback when pushing to remote.',
        category: 'sync',
        render: (s) => (
          <TextInput
            label="Default git branch"
            description="Fallback branch name for git push/pull when local branch cannot be detected."
            value={s.gitDefaultBranch}
            placeholder="main"
            onChange={(v) => s.updateSetting('gitDefaultBranch', v)}
          />
        )
      },
```

- [ ] **Step 7: Add 3 action buttons to the About section**

Inside the About section render (after the existing "About Meridian" card), add:

```tsx
                      <div>
                        <h3 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: 16, fontWeight: 600 }}>
                          Actions
                        </h3>
                        <p style={{ margin: '0 0 16px 0', color: '#777', fontSize: 12 }}>
                          App utilities and developer tools.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <button
                            onClick={() => handleOpenLink('https://github.com/bvsmma/meridian/releases')}
                            style={{ padding: '10px 16px', background: '#161616', border: '1px solid #252525', borderRadius: 8, color: '#eee', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
                          >
                            Check for updates →
                          </button>
                          <button
                            onClick={async () => {
                              if (window.vault?.getConfigPath) {
                                const p = await window.vault.getConfigPath()
                                if (p) window.vault.openExternal('file://' + p)
                              }
                            }}
                            style={{ padding: '10px 16px', background: '#161616', border: '1px solid #252525', borderRadius: 8, color: '#eee', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
                          >
                            Open config folder in Finder →
                          </button>
                          <button
                            onClick={() => {
                              const raw = localStorage.getItem('meridian-settings') ?? '{}'
                              const blob = new Blob([raw], { type: 'application/json' })
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement('a')
                              a.href = url
                              a.download = 'meridian-settings.json'
                              a.click()
                              URL.revokeObjectURL(url)
                            }}
                            style={{ padding: '10px 16px', background: '#161616', border: '1px solid #252525', borderRadius: 8, color: '#eee', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
                          >
                            Export settings as JSON →
                          </button>
                        </div>
                      </div>
```

- [ ] **Step 8: Add `getConfigPath` to window.vault type declaration in SettingsModal**

Find the `window.vault` usage in SettingsModal (or the global type). The preload exposes this — for now just use optional chaining `window.vault?.getConfigPath` (type will be fixed in Task 10).

- [ ] **Step 9: Verify all new UI categories and controls render**

Open Settings, verify: Export category in sidebar, all 4 export controls, 2 new Sync controls, 3 About buttons. No errors.

- [ ] **Step 10: Commit**

```bash
git add meridian/src/renderer/src/components/Settings/SettingsModal.tsx
git commit -m "feat: add Appearance/Export/Sync/About settings UI + Export category"
```

---

## Task 4: Wire Editor behavior — typingMode, showInvisibles, defaultView, paragraphSpacing, indentWithTabs

**Files:**
- Modify: `meridian/src/renderer/src/components/Editor/EditorPane.tsx`
- Modify: `meridian/src/renderer/src/components/Editor/extensions/markdownExtensions.ts`

**Context:** EditorPane has a `viewRef` (CodeMirror EditorView), an `editorMode` state (`'editor' | 'preview' | 'split'`), and calls `createEditorExtensions()` from `markdownExtensions.ts`. The `markdownExtensions.ts` exports a function that returns CodeMirror extensions array. EditorPane reads settings from useSettingsStore.

- [ ] **Step 1: Read new settings in EditorPane**

Near the top of the `SinglePaneArea` component (or `EditorPane`), add:

```ts
  const typingMode = useSettingsStore((s) => s.typingMode)
  const showInvisibles = useSettingsStore((s) => s.showInvisibles)
  const defaultView = useSettingsStore((s) => s.defaultView)
  const paragraphSpacing = useSettingsStore((s) => s.paragraphSpacing)
  const indentWithTabs = useSettingsStore((s) => s.indentWithTabs)
```

- [ ] **Step 2: Apply defaultView as initial editorMode**

Find the `editorMode` state initialization. Change from:
```ts
const [editorMode, setEditorMode] = useState<'editor' | 'preview' | 'split'>('split')
```
To:
```ts
const [editorMode, setEditorMode] = useState<'editor' | 'preview' | 'split'>(defaultView)
```

Note: `defaultView` is read from settings at mount time. This is intentional — changing the setting only affects newly opened panes.

- [ ] **Step 3: Apply paragraphSpacing as CSS variable**

In the editor container div (the one with `className="cm-editor-wrap"` or similar outer wrapper), add a style:

```tsx
style={{ '--paragraph-spacing': `${paragraphSpacing}em` } as React.CSSProperties}
```

Then in the global CSS (or the CodeMirror theme in markdownExtensions.ts), add:
```css
.cm-line { margin-bottom: var(--paragraph-spacing, 0); }
```

Add to the CodeMirror theme object in `markdownExtensions.ts`:
```ts
'.cm-line': { marginBottom: 'var(--paragraph-spacing, 0)' },
```

- [ ] **Step 4: Pass showInvisibles and indentWithTabs to markdownExtensions**

Find where `createEditorExtensions()` (or equivalent) is called in EditorPane. It currently receives `{ fontSize, lineNumbers, lineWrapping, ... }`. Add `showInvisibles` and `indentWithTabs` to the params:

```ts
const extensions = useMemo(
  () => createEditorExtensions({ ..., showInvisibles, indentWithTabs }),
  [..., showInvisibles, indentWithTabs]
)
```

In `markdownExtensions.ts`, update the params type and extension creation:

```ts
// Add to params type:
showInvisibles: boolean
indentWithTabs: boolean

// In the extensions array, replace the existing indentUnit with:
indentUnit.of(indentWithTabs ? '\t' : ' '.repeat(tabSize)),

// Add showInvisibles extension conditionally:
...(showInvisibles ? [highlightSpecialChars()] : []),
```

Import `highlightSpecialChars` from `@codemirror/view`:
```ts
import { ..., highlightSpecialChars } from '@codemirror/view'
```

- [ ] **Step 5: Add typewriter and focus mode via EditorView.updateListener**

In EditorPane, in the `useMemo` that builds extensions (or in a separate `useEffect` on `viewRef.current`), add an updateListener when `typingMode !== 'normal'`:

```ts
// Add to the extensions array inside createEditorExtensions or directly in EditorPane useMemo:
...(typingMode !== 'normal' ? [
  EditorView.updateListener.of((update) => {
    if (!update.selectionSet && !update.docChanged) return
    const view = update.view
    if (typingMode === 'typewriter') {
      const { head } = update.state.selection.main
      const line = view.lineBlockAt(head)
      const target = line.top - view.scrollDOM.clientHeight / 2 + line.height / 2
      view.scrollDOM.scrollTop = Math.max(0, target)
    }
    if (typingMode === 'focus') {
      const { head } = update.state.selection.main
      const activeLine = update.state.doc.lineAt(head).number
      view.dom.querySelectorAll('.cm-line').forEach((el, i) => {
        ;(el as HTMLElement).style.opacity = i + 1 === activeLine ? '1' : '0.25'
        ;(el as HTMLElement).style.transition = 'opacity 0.15s'
      })
    }
  })
] : []),
```

Import `EditorView` from `@codemirror/view` (already imported).

- [ ] **Step 6: Reset focus mode opacity when switching back to normal**

Add a `useEffect` that clears opacity styles when `typingMode` changes to `'normal'`:

```ts
useEffect(() => {
  if (typingMode !== 'focus') {
    viewRef.current?.dom.querySelectorAll('.cm-line').forEach((el) => {
      ;(el as HTMLElement).style.opacity = ''
    })
  }
}, [typingMode])
```

- [ ] **Step 7: Verify in running app**

Start app. Open a note with multiple paragraphs.
- Switch to Typewriter mode in Settings → typing should keep cursor centered
- Switch to Focus mode → other lines dim
- Change Paragraph spacing to 1em → lines get more space
- Toggle "Show invisible characters" → tabs show as highlighted
- Toggle "Indent with tabs" → Tab key inserts tab char

- [ ] **Step 8: Commit**

```bash
git add meridian/src/renderer/src/components/Editor/EditorPane.tsx meridian/src/renderer/src/components/Editor/extensions/markdownExtensions.ts
git commit -m "feat: wire typingMode, showInvisibles, defaultView, paragraphSpacing, indentWithTabs"
```

---

## Task 5: Wire spell check + code block theme

**Files:**
- Modify: `meridian/src/shared/types.ts`
- Modify: `meridian/src/main/ipc.ts`
- Modify: `meridian/src/preload/index.ts`
- Modify: `meridian/src/renderer/src/components/Editor/EditorPane.tsx`
- Modify: `meridian/src/renderer/src/components/Editor/MarkdownPreview.tsx`

**Context:** Spell check in Electron works by setting `spellcheck` attribute on the contenteditable `.cm-content` div. Language is set via `win.webContents.session.setSpellCheckerLanguages([lang])` from the main process. Code block theme: MarkdownPreview renders HTML with highlight.js — swap the theme CSS by adding a `<link id="hljs-theme">` that dynamically changes `href`.

- [ ] **Step 1: Add IPC constants to types.ts**

In `src/shared/types.ts`, in the `IPC` const object, add:
```ts
  SPELL_SET_LANGUAGE: 'spell:set-language',
  GET_CONFIG_PATH: 'config:get-path',
```

- [ ] **Step 2: Add IPC handlers in ipc.ts**

In `src/main/ipc.ts`, after the existing handlers, add:

```ts
  ipcMain.handle(IPC.SPELL_SET_LANGUAGE, async (event, lang: string) => {
    event.sender.session.setSpellCheckerLanguages([lang])
  })

  ipcMain.handle(IPC.GET_CONFIG_PATH, async () => {
    const { app } = await import('electron')
    return app.getPath('userData')
  })
```

- [ ] **Step 3: Expose in preload**

In `src/preload/index.ts`, add to the `contextBridge.exposeInMainWorld('vault', {...})` object:

```ts
    setSpellLanguage: (lang: string) => ipcRenderer.invoke(IPC.SPELL_SET_LANGUAGE, lang),
    getConfigPath: () => ipcRenderer.invoke(IPC.GET_CONFIG_PATH),
```

- [ ] **Step 4: Wire spell check in EditorPane**

In EditorPane, read spellCheck and spellCheckLanguage settings:
```ts
  const spellCheck = useSettingsStore((s) => s.spellCheck)
  const spellCheckLanguage = useSettingsStore((s) => s.spellCheckLanguage)
```

Add a `useEffect` that updates the `.cm-content` element's `spellcheck` attribute and calls the language IPC:

```ts
  useEffect(() => {
    const content = viewRef.current?.dom.querySelector('.cm-content') as HTMLElement | null
    if (content) {
      content.setAttribute('spellcheck', spellCheck ? 'true' : 'false')
    }
    if (spellCheck) {
      window.vault?.setSpellLanguage?.(spellCheckLanguage).catch(() => {})
    }
  }, [spellCheck, spellCheckLanguage])
```

- [ ] **Step 5: Wire code block theme in MarkdownPreview**

MarkdownPreview renders HTML that includes highlight.js-highlighted code. The theme CSS comes from a static import. Replace it with dynamic injection.

In `MarkdownPreview.tsx`, read the setting:
```ts
  const codeBlockTheme = useSettingsStore((s) => s.codeBlockTheme)
```

Add a `useEffect` that swaps a `<link>` tag:

```ts
  useEffect(() => {
    const themeUrls: Record<string, string> = {
      'github-dark': 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css',
      'monokai': 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/monokai.min.css',
      'one-dark': 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css',
      'solarized': 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/base16/solarized-dark.min.css'
    }
    let link = document.getElementById('hljs-theme') as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.id = 'hljs-theme'
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }
    link.href = themeUrls[codeBlockTheme] ?? themeUrls['github-dark']
  }, [codeBlockTheme])
```

If there is already a static highlight.js CSS import in the renderer (e.g. in `index.css` or `App.tsx`), remove it to avoid theme conflicts.

- [ ] **Step 6: Verify**

Open a note with a fenced code block. Change code block theme in Settings → preview updates. Enable spell check → red underlines appear on misspelled words in editor.

- [ ] **Step 7: Commit**

```bash
git add meridian/src/shared/types.ts meridian/src/main/ipc.ts meridian/src/preload/index.ts meridian/src/renderer/src/components/Editor/EditorPane.tsx meridian/src/renderer/src/components/Editor/MarkdownPreview.tsx
git commit -m "feat: wire spell check (Electron IPC) + dynamic code block theme"
```

---

## Task 6: Wire FileTree — showHiddenFiles, excludedFolders, fileSortBy

**Files:**
- Modify: `meridian/src/renderer/src/components/Sidebar/Sidebar.tsx`

**Context:** `Sidebar.tsx` already has local sort state (`sortOrder: SortOrder`) with a cycle button. The existing `sortFiles` function sorts by name-asc, name-desc, or modified. The `sortedFiles` useMemo wraps `files` before passing to `FileTree`. We need to: (1) replace the local sort with `fileSortBy` from settings, (2) add hidden file filter, (3) add excluded folder filter. The local sort cycle button should be removed or kept as an override — remove it and use settings instead.

- [ ] **Step 1: Read settings in Sidebar**

At the top of the `Sidebar` function component, add:
```ts
  const fileSortBy = useSettingsStore((s) => s.fileSortBy)
  const showHiddenFiles = useSettingsStore((s) => s.showHiddenFiles)
  const excludedFolders = useSettingsStore((s) => s.excludedFolders)
```

Import `useSettingsStore` at the top of the file if not already imported.

- [ ] **Step 2: Replace the existing sortFiles function to support new sort options**

Replace the existing `sortFiles` function (currently at the top of Sidebar.tsx, lines 23–34) with:

```ts
function sortAndFilterFiles(
  files: VaultFile[],
  sortBy: 'name' | 'created' | 'modified',
  showHidden: boolean,
  excluded: string[]
): VaultFile[] {
  const filtered = files.filter((f) => {
    if (!showHidden && f.name.startsWith('.')) return false
    if (excluded.includes(f.name)) return false
    return true
  })
  const sorted = [...filtered].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
    if (sortBy === 'name') return a.name.localeCompare(b.name)
    if (sortBy === 'created') return b.birthtime - a.birthtime
    if (sortBy === 'modified') return b.mtime - a.mtime
    return 0
  })
  return sorted.map((f) =>
    f.isDirectory && f.children
      ? { ...f, children: sortAndFilterFiles(f.children, sortBy, showHidden, excluded) }
      : f
  )
}
```

- [ ] **Step 3: Update sortedFiles useMemo**

Replace:
```ts
const sortedFiles = useMemo(() => sortFiles(files, sortOrder), [files, sortOrder])
```
With:
```ts
const excludedList = useMemo(
  () => excludedFolders.split(',').map((s) => s.trim()).filter(Boolean),
  [excludedFolders]
)
const sortedFiles = useMemo(
  () => sortAndFilterFiles(files, fileSortBy, showHiddenFiles, excludedList),
  [files, fileSortBy, showHiddenFiles, excludedList]
)
```

- [ ] **Step 4: Remove the local sort cycle button from UI**

Find the sort cycle button (renders `SORT_LABELS[sortOrder]`) and its `sortOrder` state, and remove them. The sort is now controlled entirely by settings.

Also remove the `sortOrder` state, `SORT_LABELS`, `SORT_CYCLE`, and the related `useState`.

- [ ] **Step 5: Verify**

- Change "Sort files by" in Settings → file tree reorders instantly
- Toggle "Show hidden files" off → `.git` folder disappears
- Type `.git` in "Excluded folders" → `.git` folder disappears even if show hidden is on

- [ ] **Step 6: Commit**

```bash
git add meridian/src/renderer/src/components/Sidebar/Sidebar.tsx
git commit -m "feat: wire fileSortBy, showHiddenFiles, excludedFolders from settings to FileTree"
```

---

## Task 7: Wire Layout/UI — uiZoom, compactMode, showStatusBar, previewFontFamily, alwaysShowTabBar

**Files:**
- Modify: `meridian/src/renderer/src/App.tsx`
- Modify: `meridian/src/renderer/src/components/Editor/MarkdownPreview.tsx`
- Modify: `meridian/src/renderer/src/components/Editor/TabBar.tsx`

**Context:** StatusBar is rendered in App.tsx at line ~402. uiZoom and compactMode should be applied to the root document element. previewFontFamily goes on MarkdownPreview's container. alwaysShowTabBar is read in TabBar to conditionally hide itself.

- [ ] **Step 1: Apply uiZoom, compactMode, showStatusBar in App.tsx**

In `App.tsx`, read from settings:
```ts
  const uiZoom = useSettingsStore((s) => s.uiZoom)
  const compactMode = useSettingsStore((s) => s.compactMode)
  const showStatusBar = useSettingsStore((s) => s.showStatusBar)
```

Add a `useEffect` for zoom and compact:
```ts
  useEffect(() => {
    document.documentElement.style.zoom = `${uiZoom}%`
  }, [uiZoom])

  useEffect(() => {
    document.documentElement.setAttribute('data-compact', compactMode ? 'true' : 'false')
  }, [compactMode])
```

Wrap the StatusBar render conditionally:
```tsx
  {showStatusBar && <StatusBar />}
```

- [ ] **Step 2: Add compact mode CSS**

In the app's global CSS file (e.g. `src/renderer/src/assets/index.css` or wherever global styles live), add:

```css
[data-compact="true"] .cm-content {
  line-height: 1.4;
}
[data-compact="true"] .tab-item {
  height: 30px;
  padding: 0 8px;
}
```

Find the existing class names for sidebar items and tabs by checking the rendered output and adjust selectors as needed.

- [ ] **Step 3: Apply previewFontFamily in MarkdownPreview**

In `MarkdownPreview.tsx`, read the setting:
```ts
  const previewFontFamily = useSettingsStore((s) => s.previewFontFamily)
```

Apply to the preview container div's style:
```tsx
style={{ fontFamily: previewFontFamily, ... }}
```
(The container currently has `fontFamily` set from a CSS variable or direct style — replace with the setting value.)

- [ ] **Step 4: Apply alwaysShowTabBar in TabBar**

In `TabBar.tsx`, read settings:
```ts
  const alwaysShowTabBar = useSettingsStore((s) => s.alwaysShowTabBar)
  const openTabs = useVaultStore((s) => s.panes.find(p => p.id === paneId)?.openTabs ?? [])
```

At the top of the return, add early return:
```ts
  if (!alwaysShowTabBar && openTabs.length <= 1) return null
```

- [ ] **Step 5: Verify**

- Drag UI Zoom slider → entire interface scales
- Toggle Compact mode → reduced spacing
- Toggle Show status bar off → status bar disappears
- Change Preview font → preview text font changes
- Toggle "Always show tab bar" off + close all but 1 tab → tab bar hides

- [ ] **Step 6: Commit**

```bash
git add meridian/src/renderer/src/App.tsx meridian/src/renderer/src/components/Editor/MarkdownPreview.tsx meridian/src/renderer/src/components/Editor/TabBar.tsx
git commit -m "feat: wire uiZoom, compactMode, showStatusBar, previewFontFamily, alwaysShowTabBar"
```

---

## Task 8: Wire Export settings — pdfPageSize, exportIncludeFrontmatter, exportCustomCSS

**Files:**
- Modify: `meridian/src/main/ipc.ts`
- Modify: `meridian/src/preload/index.ts`
- Modify: `meridian/src/shared/types.ts`
- Modify: `meridian/src/renderer/src/hooks/useVaultBridge.ts`

**Context:** `VAULT_EXPORT_PDF` in ipc.ts at line ~263 hardcodes `pageSize: 'A4'`. `VAULT_EXPORT_HTML` at ~250 takes `html: string` and saves it. The `exportNote` function in useVaultBridge generates the HTML string. We need to: (1) pass pdfPageSize to the PDF IPC handler, (2) pass exportCustomCSS to both HTML and PDF handlers, (3) handle exportIncludeFrontmatter in the HTML generation.

- [ ] **Step 1: Update VAULT_EXPORT_PDF signature in ipc.ts to accept pageSize and customCSS**

Change line ~263 from:
```ts
ipcMain.handle(IPC.VAULT_EXPORT_PDF, async (_event, suggestedName: string, html: string) => {
```
To:
```ts
ipcMain.handle(IPC.VAULT_EXPORT_PDF, async (_event, suggestedName: string, html: string, pageSize: 'A4' | 'Letter' = 'A4') => {
```

Change the `printToPDF` call at line ~284 from:
```ts
      const pdfData = await win.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4'
      })
```
To:
```ts
      const pdfData = await win.webContents.printToPDF({
        printBackground: true,
        pageSize: pageSize
      })
```

- [ ] **Step 2: Update VAULT_EXPORT_HTML in ipc.ts to inject customCSS**

Change line ~250 from:
```ts
ipcMain.handle(IPC.VAULT_EXPORT_HTML, async (_event, suggestedName: string, html: string) => {
```
To:
```ts
ipcMain.handle(IPC.VAULT_EXPORT_HTML, async (_event, suggestedName: string, html: string, customCSS: string = '') => {
```

Find where the HTML is written to file (the `result` or `write` call). If the IPC handler writes HTML directly, inject `<style>${customCSS}</style>` before `</head>` in the html string:
```ts
  const finalHtml = customCSS
    ? html.replace('</head>', `<style>${customCSS}</style></head>`)
    : html
  // use finalHtml instead of html for the file write
```

- [ ] **Step 3: Update preload to pass new args**

In `preload/index.ts`, find the `exportHtml` and `exportPdf` exposures and update to forward the extra args:
```ts
exportHtml: (name: string, html: string, customCSS: string) =>
  ipcRenderer.invoke(IPC.VAULT_EXPORT_HTML, name, html, customCSS),
exportPdf: (name: string, html: string, pageSize: string, customCSS: string) =>
  ipcRenderer.invoke(IPC.VAULT_EXPORT_PDF, name, html, pageSize, customCSS),
```

- [ ] **Step 4: Read settings and pass them in useVaultBridge exportNote**

In `useVaultBridge.ts`, in the `exportNote` function, read settings from store at call time:
```ts
const { exportCustomCSS, pdfPageSize, exportIncludeFrontmatter } = useSettingsStore.getState()
```

For `exportIncludeFrontmatter`: find where the markdown content is converted to HTML. If frontmatter is currently stripped (lines starting with `---`), conditionally keep it based on the setting. Add before the `unified()` pipeline:
```ts
let mdContent = content
if (!exportIncludeFrontmatter) {
  mdContent = mdContent.replace(/^---[\s\S]*?---\n/, '')
}
```

For `exportCustomCSS` and `pdfPageSize`, pass them to the IPC calls:
- HTML export: `window.vault.exportHtml(suggestedName, htmlString, exportCustomCSS)`
- PDF export: `window.vault.exportPdf(suggestedName, htmlString, pdfPageSize, exportCustomCSS)`

- [ ] **Step 5: Wire defaultExportFormat to Cmd+E shortcut in App.tsx**

In `App.tsx`, find the Cmd+E keydown handler. Read the setting:
```ts
const defaultExportFormat = useSettingsStore.getState().defaultExportFormat
```

Change the handler to call the appropriate export:
```ts
if (e.key === 'e' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
  e.preventDefault()
  if (defaultExportFormat === 'pdf') {
    exportNotePdf() // call the PDF export function
  } else {
    exportNote() // existing HTML export
  }
}
```

(Cmd+Shift+E remains PDF export regardless of this setting, as a quick override.)

- [ ] **Step 6: Verify**

- Export a note to PDF, change page size to Letter in Settings → exported PDF uses Letter size
- Add custom CSS (`body { background: #fff !important; }`) → exported HTML has it injected
- Toggle "Include frontmatter" → frontmatter appears/disappears in exports

- [ ] **Step 7: Commit**

```bash
git add meridian/src/main/ipc.ts meridian/src/preload/index.ts meridian/src/shared/types.ts meridian/src/renderer/src/hooks/useVaultBridge.ts meridian/src/renderer/src/App.tsx
git commit -m "feat: wire pdfPageSize, exportIncludeFrontmatter, exportCustomCSS, defaultExportFormat"
```

---

## Task 9: Wire Files behavior — attachmentFolder, confirmDelete, dailyNoteDateFormat

**Files:**
- Modify: `meridian/src/renderer/src/hooks/useVaultBridge.ts`

**Context:** `saveImage` at line 375 hardcodes `'assets'` as the folder. `deleteFile` at line 303 has no confirm dialog (the confirm is in FileTree's context menu handlers). `openDailyNote` at line 340 hardcodes the date format.

- [ ] **Step 1: Apply attachmentFolder in saveImage**

In `saveImage` callback, read the setting:
```ts
const { attachmentFolder } = useSettingsStore.getState()
const folder = attachmentFolder.trim() || 'assets'
```

Replace the hardcoded path:
```ts
// Before:
const filePath = `${vault.path}/assets/${fileName}`
// After:
const filePath = `${vault.path}/${folder}/${fileName}`
```

Also create the folder if it doesn't exist (before writeBinary):
```ts
try {
  await window.vault.createDir(vault.path, folder)
} catch { /* folder may already exist */ }
```

Fix the return value:
```ts
// Before:
return `assets/${fileName}`
// After:
return `${folder}/${fileName}`
```

- [ ] **Step 2: Apply dailyNoteDateFormat in openDailyNote**

In `openDailyNote`, replace the hardcoded date format:

```ts
// Before:
const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// After:
const { dailyNoteDateFormat } = useSettingsStore.getState()
const Y = String(d.getFullYear())
const M = String(d.getMonth() + 1).padStart(2, '0')
const D = String(d.getDate()).padStart(2, '0')
const today = dailyNoteDateFormat
  .replace('YYYY', Y)
  .replace('MM', M)
  .replace('DD', D)
```

- [ ] **Step 3: Apply confirmDelete in deleteFile**

In `deleteFile` callback, before calling `window.vault.deleteFile(path)`, add:

```ts
const { confirmDelete } = useSettingsStore.getState()
if (confirmDelete) {
  const fileName = path.split('/').pop() ?? path
  if (!window.confirm(`Delete "${fileName}"? This cannot be undone.`)) return
}
```

Note: FileTree's context menu already has its own confirm dialog. With `confirmDelete: true`, users will see two confirms. Fix: remove the existing `window.confirm` from `FileTree.tsx` context menu delete handler (lines ~368 and ~320), so confirmation is handled only in `deleteFile`.

In `FileTree.tsx`, find the delete handler in the context menu and remove the `window.confirm(...)` wrapper — just call `onDelete(contextMenu.file.path)` directly.

- [ ] **Step 4: Verify**

- Change attachment folder to `images`, drop an image into editor → saved to `images/` folder, link uses `images/filename.png`
- Change daily note date format to `DD.MM.YYYY`, press Cmd+D → creates file `21.05.2026.md`
- Toggle confirm delete off, delete a file → no dialog shown
- Toggle confirm delete on, delete a file → dialog appears

- [ ] **Step 5: Commit**

```bash
git add meridian/src/renderer/src/hooks/useVaultBridge.ts meridian/src/renderer/src/components/Sidebar/FileTree.tsx
git commit -m "feat: wire attachmentFolder, dailyNoteDateFormat, confirmDelete"
```

---

## Task 10: Wire Sync + About — gitCommitTemplate, gitDefaultBranch, getConfigPath IPC

**Files:**
- Modify: `meridian/src/renderer/src/components/Sidebar/GitPanel.tsx`
- Modify: `meridian/src/main/ipc.ts`
- Modify: `meridian/src/renderer/src/hooks/useVaultBridge.ts` (or wherever gitSync is called with branch)

**Context:** `autoCommitMessage` in GitPanel.tsx generates commit text. `GIT_SYNC` handler in ipc.ts at line ~464 detects branch with `rev-parse --abbrev-ref HEAD` and uses `|| 'main'` as fallback. We need to pass `gitDefaultBranch` from settings as the fallback. The `getConfigPath` and `setSpellLanguage` IPC handlers were added in Task 5.

- [ ] **Step 1: Apply gitCommitTemplate in GitPanel autoCommitMessage**

In `GitPanel.tsx`, read the setting at the top of the component:
```ts
const gitCommitTemplate = useSettingsStore((s) => s.gitCommitTemplate)
```

Update `autoCommitMessage` call: the function currently returns a string like `"Updated: file1, file2"`. Replace the function with template interpolation. Find where `autoCommitMessage(gitState.changes ?? [])` is called (line ~264) and replace with:

```ts
function applyCommitTemplate(template: string, changes: { path: string; status: string }[]): string {
  if (changes.length === 0) return ''
  const names = changes.slice(0, 3).map((c) => c.path.split('/').pop() ?? c.path)
  const suffix = changes.length > 3 ? ` +${changes.length - 3} more` : ''
  const files = names.join(', ') + suffix
  return template.replace('{files}', files)
}
```

Then in the useEffect or wherever `autoCommitMessage` is called:
```ts
applyCommitTemplate(gitCommitTemplate, gitState.changes ?? [])
```

Remove the old `autoCommitMessage` function.

- [ ] **Step 2: Pass gitDefaultBranch to GIT_SYNC IPC handler**

The GIT_SYNC handler currently uses `const branch = branchOut.trim() || 'main'`. We need `gitDefaultBranch` setting to be used instead of `'main'`.

Option: pass `gitDefaultBranch` as an argument to `window.vault.gitSync()`. 

In `useVaultBridge.ts` (or wherever `gitSync` is called in GitPanel), pass the setting:
```ts
const gitDefaultBranch = useSettingsStore.getState().gitDefaultBranch
await window.vault.gitSync(gitDefaultBranch)
```

Update the preload `gitSync` to forward the arg:
```ts
gitSync: (defaultBranch?: string) => ipcRenderer.invoke(IPC.GIT_SYNC, defaultBranch),
```

Update the IPC handler signature:
```ts
ipcMain.handle(IPC.GIT_SYNC, async (_event, defaultBranch: string = 'main') => {
```

Replace the fallback in branch detection:
```ts
// Before:
const branch = branchOut.trim() || 'main'
// After:
const branch = branchOut.trim() || defaultBranch
```

- [ ] **Step 3: Update window.vault type declaration for getConfigPath and setSpellLanguage**

In `useVaultBridge.ts`, the `window.vault` type is declared. Add:
```ts
      getConfigPath: () => Promise<string>
      setSpellLanguage: (lang: string) => Promise<void>
```

- [ ] **Step 4: Verify Sync settings**

- Change commit template to `"Notes update: {files}"`, make changes and click Save Snapshot → commit message uses new template
- Change default branch to `develop` in Settings, sync → push goes to `develop` branch (if it exists on remote)

- [ ] **Step 5: Verify About buttons**

- Click "Check for updates" → opens GitHub releases page in browser
- Click "Open config folder" → opens Finder at Electron userData directory
- Click "Export settings as JSON" → downloads `meridian-settings.json` file

- [ ] **Step 6: Final build check**

```bash
cd meridian && npm run build 2>&1 | tail -20
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add meridian/src/renderer/src/components/Sidebar/GitPanel.tsx meridian/src/main/ipc.ts meridian/src/preload/index.ts meridian/src/renderer/src/hooks/useVaultBridge.ts
git commit -m "feat: wire gitCommitTemplate, gitDefaultBranch, getConfigPath IPC + About actions"
```
