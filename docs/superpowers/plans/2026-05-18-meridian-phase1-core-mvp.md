# Meridian Phase 1: Core MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working macOS Electron desktop app with vault management, file tree sidebar, CodeMirror 6 markdown editor with split-view preview, multi-tab support, and a status bar.

**Architecture:** Electron main process owns filesystem via `VaultManager`; renderer is a React 18 app communicating through a typed contextBridge IPC layer. Three-column layout: collapsible file tree sidebar, tabbed editor area, placeholder right panel. All state lives in a Zustand store.

**Tech Stack:** electron-vite, Electron 29, React 18, TypeScript 5, CodeMirror 6, Zustand 4, remark + rehype (markdown preview), Vitest + @testing-library/react + happy-dom

---

## File Structure

```
meridian/
├── electron.vite.config.ts       # electron-vite config (main + preload + renderer)
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── tsconfig.web.json
├── vitest.config.ts              # test runner config
├── src/
│   ├── main/
│   │   ├── index.ts              # app entry, BrowserWindow creation
│   │   ├── vault.ts              # VaultManager — all fs operations
│   │   ├── settings.ts           # AppSettings — ~/.meridian/config.json
│   │   └── ipc.ts                # IPC handler registration
│   ├── preload/
│   │   └── index.ts              # contextBridge — exposes typed API to renderer
│   ├── shared/
│   │   └── types.ts              # VaultFile, IPC channel names, shared interfaces
│   └── renderer/
│       ├── index.html
│       └── src/
│           ├── main.tsx           # React root
│           ├── App.tsx            # Root component, vault-open gate
│           ├── store/
│           │   └── useVaultStore.ts  # Zustand store
│           ├── hooks/
│           │   └── useVaultBridge.ts # Typed wrappers around window.vault IPC calls
│           └── components/
│               ├── Layout.tsx        # Three-column shell
│               ├── VaultPicker.tsx   # First-launch / open-vault screen
│               ├── Sidebar/
│               │   ├── Sidebar.tsx
│               │   └── FileTree.tsx
│               ├── Editor/
│               │   ├── EditorPane.tsx       # CodeMirror 6 instance
│               │   ├── TabBar.tsx           # Open file tabs
│               │   ├── MarkdownPreview.tsx  # remark/rehype rendered HTML
│               │   └── extensions/
│               │       └── markdownExtensions.ts  # CM6 extension bundle
│               └── StatusBar.tsx
├── tests/
│   ├── main/
│   │   ├── vault.test.ts
│   │   └── settings.test.ts
│   └── renderer/
│       ├── useVaultStore.test.ts
│       ├── FileTree.test.tsx
│       └── TabBar.test.tsx
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `electron.vite.config.ts`
- Create: `tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Scaffold with electron-vite**

```bash
cd "/Users/vladyslav/Desktop/dev/new project"
npm create @quick-start/electron@latest meridian -- --template react-ts
cd meridian
```

Expected output: project files created, prompts answered with `react-ts` template.

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install zustand @codemirror/state @codemirror/view @codemirror/lang-markdown \
  @codemirror/language-data @codemirror/commands @codemirror/theme-one-dark \
  remark remark-html remark-gfm chokidar electron-store
```

- [ ] **Step 3: Install dev/test dependencies**

```bash
npm install -D vitest @vitest/coverage-v8 @testing-library/react \
  @testing-library/jest-dom @testing-library/user-event happy-dom \
  @types/node concurrently wait-on
```

- [ ] **Step 4: Create vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@renderer': resolve(__dirname, 'src/renderer/src'),
    },
  },
})
```

- [ ] **Step 5: Create test setup file**

Create `tests/setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Add test script to package.json**

In `package.json`, add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 7: Initialize git and commit scaffold**

```bash
git init
echo "node_modules\ndist\ndist-electron\nout\n.superpowers" > .gitignore
git add -A
git commit -m "feat: scaffold meridian with electron-vite"
```

---

## Task 2: Shared Types

**Files:**
- Create: `src/shared/types.ts`

- [ ] **Step 1: Write the shared types file**

Create `src/shared/types.ts`:

```typescript
export interface VaultFile {
  name: string        // filename with extension, e.g. "Notes.md"
  path: string        // absolute path
  relativePath: string // relative to vault root, e.g. "Projects/Notes.md"
  isDirectory: boolean
  children?: VaultFile[]
  mtime: number       // last modified timestamp (ms)
}

export interface VaultConfig {
  path: string
  name: string
}

export interface AppConfig {
  recentVaults: VaultConfig[]
  lastVault: string | null  // path of last opened vault
  windowBounds: { width: number; height: number; x?: number; y?: number }
}

export const IPC = {
  VAULT_OPEN_DIALOG: 'vault:open-dialog',
  VAULT_LIST_FILES: 'vault:list-files',
  VAULT_READ_FILE: 'vault:read-file',
  VAULT_WRITE_FILE: 'vault:write-file',
  VAULT_CREATE_FILE: 'vault:create-file',
  VAULT_DELETE_FILE: 'vault:delete-file',
  VAULT_RENAME_FILE: 'vault:rename-file',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  FILE_CHANGED: 'file:changed',   // main → renderer push event
} as const
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add shared IPC types and VaultFile interface"
```

---

## Task 3: VaultManager

**Files:**
- Create: `src/main/vault.ts`
- Create: `tests/main/vault.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/main/vault.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { VaultManager } from '../../src/main/vault'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

let tmpDir: string
let vault: VaultManager

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'meridian-test-'))
  vault = new VaultManager(tmpDir)
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('VaultManager', () => {
  it('lists files in the vault root', async () => {
    writeFileSync(join(tmpDir, 'Hello.md'), '# Hello')
    writeFileSync(join(tmpDir, 'World.md'), '# World')

    const files = await vault.listFiles()
    const names = files.map(f => f.name).sort()
    expect(names).toEqual(['Hello.md', 'World.md'])
  })

  it('reads file content', async () => {
    writeFileSync(join(tmpDir, 'Note.md'), '# My Note')
    const content = await vault.readFile(join(tmpDir, 'Note.md'))
    expect(content).toBe('# My Note')
  })

  it('writes file content', async () => {
    const filePath = join(tmpDir, 'New.md')
    await vault.writeFile(filePath, '# Written')
    const content = await vault.readFile(filePath)
    expect(content).toBe('# Written')
  })

  it('creates a new file with default content', async () => {
    const filePath = await vault.createFile(tmpDir, 'Created.md')
    expect(filePath).toContain('Created.md')
    const content = await vault.readFile(filePath)
    expect(content).toBe('')
  })

  it('returns relative paths', async () => {
    writeFileSync(join(tmpDir, 'Note.md'), '')
    const files = await vault.listFiles()
    expect(files[0].relativePath).toBe('Note.md')
  })

  it('lists subdirectory files recursively', async () => {
    mkdirSync(join(tmpDir, 'Projects'))
    writeFileSync(join(tmpDir, 'Projects', 'Alpha.md'), '')
    const files = await vault.listFiles()
    const dir = files.find(f => f.isDirectory && f.name === 'Projects')
    expect(dir).toBeDefined()
    expect(dir!.children?.length).toBe(1)
    expect(dir!.children?.[0].name).toBe('Alpha.md')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run tests/main/vault.test.ts
```

Expected: FAIL — `Cannot find module '../../src/main/vault'`

- [ ] **Step 3: Implement VaultManager**

Create `src/main/vault.ts`:

```typescript
import { readFile, writeFile, readdir, stat, mkdir } from 'fs/promises'
import { join, relative } from 'path'
import { VaultFile } from '../shared/types'

export class VaultManager {
  constructor(public readonly vaultPath: string) {}

  async listFiles(dir = this.vaultPath): Promise<VaultFile[]> {
    const entries = await readdir(dir)
    const files: VaultFile[] = []

    for (const entry of entries) {
      if (entry.startsWith('.')) continue
      const fullPath = join(dir, entry)
      const info = await stat(fullPath)
      const isDirectory = info.isDirectory()

      const file: VaultFile = {
        name: entry,
        path: fullPath,
        relativePath: relative(this.vaultPath, fullPath),
        isDirectory,
        mtime: info.mtimeMs,
      }

      if (isDirectory) {
        file.children = await this.listFiles(fullPath)
      }

      files.push(file)
    }

    return files.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }

  async readFile(filePath: string): Promise<string> {
    return readFile(filePath, 'utf-8')
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    await writeFile(filePath, content, 'utf-8')
  }

  async createFile(dir: string, name: string): Promise<string> {
    const filePath = join(dir, name)
    await writeFile(filePath, '', 'utf-8')
    return filePath
  }

  async deleteFile(filePath: string): Promise<void> {
    const { rm } = await import('fs/promises')
    await rm(filePath, { recursive: true })
  }

  async createDirectory(parentDir: string, name: string): Promise<string> {
    const dirPath = join(parentDir, name)
    await mkdir(dirPath, { recursive: true })
    return dirPath
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run tests/main/vault.test.ts
```

Expected: PASS — all 6 tests green

- [ ] **Step 5: Commit**

```bash
git add src/main/vault.ts tests/main/vault.test.ts
git commit -m "feat: add VaultManager with file CRUD and recursive listing"
```

---

## Task 4: AppSettings

**Files:**
- Create: `src/main/settings.ts`
- Create: `tests/main/settings.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/main/settings.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

// Mock electron-store to use a temp path
vi.mock('electron-store', () => {
  const { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } = require('fs')
  const { join } = require('path')
  return {
    default: class MockStore {
      private data: Record<string, unknown> = {}
      get<T>(key: string, defaultValue: T): T {
        return (this.data[key] as T) ?? defaultValue
      }
      set(key: string, value: unknown) {
        this.data[key] = value
      }
    }
  }
})

import { AppSettings } from '../../src/main/settings'
import { AppConfig } from '../../src/shared/types'

describe('AppSettings', () => {
  let settings: AppSettings

  beforeEach(() => {
    settings = new AppSettings()
  })

  it('returns default config when nothing saved', () => {
    const config = settings.get()
    expect(config.recentVaults).toEqual([])
    expect(config.lastVault).toBeNull()
  })

  it('saves and retrieves last vault', () => {
    settings.setLastVault('/Users/test/MyVault')
    expect(settings.get().lastVault).toBe('/Users/test/MyVault')
  })

  it('adds to recent vaults without duplicates', () => {
    settings.addRecentVault('/path/A', 'A')
    settings.addRecentVault('/path/B', 'B')
    settings.addRecentVault('/path/A', 'A')
    const recents = settings.get().recentVaults
    expect(recents.length).toBe(2)
    expect(recents[0].path).toBe('/path/A') // most recent first
  })
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
npx vitest run tests/main/settings.test.ts
```

Expected: FAIL — `Cannot find module '../../src/main/settings'`

- [ ] **Step 3: Implement AppSettings**

Create `src/main/settings.ts`:

```typescript
import Store from 'electron-store'
import { AppConfig, VaultConfig } from '../shared/types'

const DEFAULT_CONFIG: AppConfig = {
  recentVaults: [],
  lastVault: null,
  windowBounds: { width: 1200, height: 800 },
}

export class AppSettings {
  private store = new Store<AppConfig>({ name: 'meridian-config', defaults: DEFAULT_CONFIG })

  get(): AppConfig {
    return {
      recentVaults: this.store.get('recentVaults', DEFAULT_CONFIG.recentVaults),
      lastVault: this.store.get('lastVault', DEFAULT_CONFIG.lastVault),
      windowBounds: this.store.get('windowBounds', DEFAULT_CONFIG.windowBounds),
    }
  }

  setLastVault(path: string | null): void {
    this.store.set('lastVault', path)
  }

  addRecentVault(path: string, name: string): void {
    const recents = this.store.get('recentVaults', DEFAULT_CONFIG.recentVaults)
    const filtered = recents.filter(v => v.path !== path)
    filtered.unshift({ path, name })
    this.store.set('recentVaults', filtered.slice(0, 10))
  }

  setWindowBounds(bounds: AppConfig['windowBounds']): void {
    this.store.set('windowBounds', bounds)
  }
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx vitest run tests/main/settings.test.ts
```

Expected: PASS — all 3 tests green

- [ ] **Step 5: Commit**

```bash
git add src/main/settings.ts tests/main/settings.test.ts
git commit -m "feat: add AppSettings with recent vaults and window bounds persistence"
```

---

## Task 5: IPC Handlers

**Files:**
- Create: `src/main/ipc.ts`
- Modify: `src/main/index.ts`
- Create: `src/preload/index.ts`

- [ ] **Step 1: Create IPC handler registration**

Create `src/main/ipc.ts`:

```typescript
import { ipcMain, dialog } from 'electron'
import { IPC } from '../shared/types'
import { VaultManager } from './vault'
import { AppSettings } from './settings'

let vaultManager: VaultManager | null = null

export function registerIpcHandlers(settings: AppSettings): void {
  ipcMain.handle(IPC.VAULT_OPEN_DIALOG, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Open Vault',
      buttonLabel: 'Open Vault',
    })
    if (result.canceled || result.filePaths.length === 0) return null

    const vaultPath = result.filePaths[0]
    const name = vaultPath.split('/').pop() ?? 'Vault'
    vaultManager = new VaultManager(vaultPath)
    settings.addRecentVault(vaultPath, name)
    settings.setLastVault(vaultPath)
    return { path: vaultPath, name }
  })

  ipcMain.handle(IPC.VAULT_LIST_FILES, async () => {
    if (!vaultManager) throw new Error('No vault open')
    return vaultManager.listFiles()
  })

  ipcMain.handle(IPC.VAULT_READ_FILE, async (_event, filePath: string) => {
    if (!vaultManager) throw new Error('No vault open')
    return vaultManager.readFile(filePath)
  })

  ipcMain.handle(IPC.VAULT_WRITE_FILE, async (_event, filePath: string, content: string) => {
    if (!vaultManager) throw new Error('No vault open')
    return vaultManager.writeFile(filePath, content)
  })

  ipcMain.handle(IPC.VAULT_CREATE_FILE, async (_event, dir: string, name: string) => {
    if (!vaultManager) throw new Error('No vault open')
    return vaultManager.createFile(dir, name)
  })

  ipcMain.handle(IPC.VAULT_DELETE_FILE, async (_event, filePath: string) => {
    if (!vaultManager) throw new Error('No vault open')
    return vaultManager.deleteFile(filePath)
  })

  ipcMain.handle(IPC.SETTINGS_GET, async () => {
    return settings.get()
  })

  ipcMain.handle(IPC.SETTINGS_SET, async (_event, key: string, value: unknown) => {
    if (key === 'lastVault') settings.setLastVault(value as string)
  })
}

export function getVaultManager(): VaultManager | null {
  return vaultManager
}

export function setVaultManager(vm: VaultManager): void {
  vaultManager = vm
}
```

- [ ] **Step 2: Create preload script**

Create `src/preload/index.ts` (replace existing content):

```typescript
import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/types'
import type { VaultFile, VaultConfig, AppConfig } from '../shared/types'

const vaultAPI = {
  openDialog: (): Promise<VaultConfig | null> =>
    ipcRenderer.invoke(IPC.VAULT_OPEN_DIALOG),

  listFiles: (): Promise<VaultFile[]> =>
    ipcRenderer.invoke(IPC.VAULT_LIST_FILES),

  readFile: (filePath: string): Promise<string> =>
    ipcRenderer.invoke(IPC.VAULT_READ_FILE, filePath),

  writeFile: (filePath: string, content: string): Promise<void> =>
    ipcRenderer.invoke(IPC.VAULT_WRITE_FILE, filePath, content),

  createFile: (dir: string, name: string): Promise<string> =>
    ipcRenderer.invoke(IPC.VAULT_CREATE_FILE, dir, name),

  deleteFile: (filePath: string): Promise<void> =>
    ipcRenderer.invoke(IPC.VAULT_DELETE_FILE, filePath),

  onFileChanged: (callback: (file: VaultFile) => void) => {
    ipcRenderer.on(IPC.FILE_CHANGED, (_event, file) => callback(file))
  },
}

const settingsAPI = {
  get: (): Promise<AppConfig> =>
    ipcRenderer.invoke(IPC.SETTINGS_GET),
  set: (key: string, value: unknown): Promise<void> =>
    ipcRenderer.invoke(IPC.SETTINGS_SET, key, value),
}

contextBridge.exposeInMainWorld('vault', vaultAPI)
contextBridge.exposeInMainWorld('settings', settingsAPI)
```

- [ ] **Step 3: Update main entry to wire everything together**

Replace `src/main/index.ts` with:

```typescript
import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { AppSettings } from './settings'
import { registerIpcHandlers } from './ipc'

const settings = new AppSettings()

function createWindow(): BrowserWindow {
  const { windowBounds } = settings.get()

  const win = new BrowserWindow({
    width: windowBounds.width,
    height: windowBounds.height,
    x: windowBounds.x,
    y: windowBounds.y,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.on('resize', () => {
    const [width, height] = win.getSize()
    const [x, y] = win.getPosition()
    settings.setWindowBounds({ width, height, x, y })
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  return win
}

app.whenReady().then(() => {
  registerIpcHandlers(settings)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/main/ipc.ts src/main/index.ts src/preload/index.ts
git commit -m "feat: wire IPC handlers and contextBridge preload"
```

---

## Task 6: Zustand Store

**Files:**
- Create: `src/renderer/src/store/useVaultStore.ts`
- Create: `tests/renderer/useVaultStore.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/renderer/useVaultStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

// Mock the IPC bridge
vi.stubGlobal('window', {
  vault: {
    listFiles: vi.fn().mockResolvedValue([
      { name: 'Note.md', path: '/vault/Note.md', relativePath: 'Note.md', isDirectory: false, mtime: 0 }
    ]),
    readFile: vi.fn().mockResolvedValue('# Note'),
    writeFile: vi.fn().mockResolvedValue(undefined),
    createFile: vi.fn().mockResolvedValue('/vault/New.md'),
  },
  settings: { get: vi.fn(), set: vi.fn() },
})

import { useVaultStore } from '../../src/renderer/src/store/useVaultStore'

beforeEach(() => {
  useVaultStore.setState({ files: [], openTabs: [], activeTabPath: null, vault: null })
})

describe('useVaultStore', () => {
  it('starts with empty state', () => {
    const { result } = renderHook(() => useVaultStore())
    expect(result.current.files).toEqual([])
    expect(result.current.openTabs).toEqual([])
  })

  it('opens a tab and sets it active', () => {
    const { result } = renderHook(() => useVaultStore())
    act(() => result.current.openTab('/vault/Note.md', 'Note.md'))
    expect(result.current.openTabs.length).toBe(1)
    expect(result.current.activeTabPath).toBe('/vault/Note.md')
  })

  it('does not duplicate tabs', () => {
    const { result } = renderHook(() => useVaultStore())
    act(() => result.current.openTab('/vault/Note.md', 'Note.md'))
    act(() => result.current.openTab('/vault/Note.md', 'Note.md'))
    expect(result.current.openTabs.length).toBe(1)
  })

  it('closes a tab and activates the previous one', () => {
    const { result } = renderHook(() => useVaultStore())
    act(() => result.current.openTab('/vault/A.md', 'A.md'))
    act(() => result.current.openTab('/vault/B.md', 'B.md'))
    act(() => result.current.closeTab('/vault/B.md'))
    expect(result.current.openTabs.length).toBe(1)
    expect(result.current.activeTabPath).toBe('/vault/A.md')
  })

  it('sets tab content', () => {
    const { result } = renderHook(() => useVaultStore())
    act(() => result.current.openTab('/vault/Note.md', 'Note.md'))
    act(() => result.current.setTabContent('/vault/Note.md', '# Hello'))
    const tab = result.current.openTabs.find(t => t.path === '/vault/Note.md')
    expect(tab?.content).toBe('# Hello')
  })
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
npx vitest run tests/renderer/useVaultStore.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement the store**

Create `src/renderer/src/store/useVaultStore.ts`:

```typescript
import { create } from 'zustand'
import { VaultFile, VaultConfig } from '@shared/types'

export interface Tab {
  path: string
  name: string
  content: string
  isDirty: boolean
}

interface VaultState {
  vault: VaultConfig | null
  files: VaultFile[]
  openTabs: Tab[]
  activeTabPath: string | null

  setVault: (vault: VaultConfig) => void
  setFiles: (files: VaultFile[]) => void
  openTab: (path: string, name: string) => void
  closeTab: (path: string) => void
  setActiveTab: (path: string) => void
  setTabContent: (path: string, content: string) => void
  markTabDirty: (path: string, dirty: boolean) => void
}

export const useVaultStore = create<VaultState>((set, get) => ({
  vault: null,
  files: [],
  openTabs: [],
  activeTabPath: null,

  setVault: (vault) => set({ vault }),

  setFiles: (files) => set({ files }),

  openTab: (path, name) => {
    const { openTabs } = get()
    if (openTabs.some(t => t.path === path)) {
      set({ activeTabPath: path })
      return
    }
    set({
      openTabs: [...openTabs, { path, name, content: '', isDirty: false }],
      activeTabPath: path,
    })
  },

  closeTab: (path) => {
    const { openTabs, activeTabPath } = get()
    const index = openTabs.findIndex(t => t.path === path)
    const next = openTabs.filter(t => t.path !== path)
    let nextActive = activeTabPath
    if (activeTabPath === path) {
      nextActive = next[Math.max(0, index - 1)]?.path ?? next[0]?.path ?? null
    }
    set({ openTabs: next, activeTabPath: nextActive })
  },

  setActiveTab: (path) => set({ activeTabPath: path }),

  setTabContent: (path, content) =>
    set(state => ({
      openTabs: state.openTabs.map(t => t.path === path ? { ...t, content } : t),
    })),

  markTabDirty: (path, dirty) =>
    set(state => ({
      openTabs: state.openTabs.map(t => t.path === path ? { ...t, isDirty: dirty } : t),
    })),
}))
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx vitest run tests/renderer/useVaultStore.test.ts
```

Expected: PASS — all 5 tests green

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/store/useVaultStore.ts tests/renderer/useVaultStore.test.ts
git commit -m "feat: add Zustand vault store with tab management"
```

---

## Task 7: IPC Bridge Hook

**Files:**
- Create: `src/renderer/src/hooks/useVaultBridge.ts`

- [ ] **Step 1: Create the bridge hook**

Create `src/renderer/src/hooks/useVaultBridge.ts`:

```typescript
import { useCallback } from 'react'
import { useVaultStore } from '../store/useVaultStore'
import type { VaultConfig } from '@shared/types'

declare global {
  interface Window {
    vault: {
      openDialog: () => Promise<VaultConfig | null>
      listFiles: () => Promise<import('@shared/types').VaultFile[]>
      readFile: (path: string) => Promise<string>
      writeFile: (path: string, content: string) => Promise<void>
      createFile: (dir: string, name: string) => Promise<string>
      deleteFile: (path: string) => Promise<void>
      onFileChanged: (cb: (file: import('@shared/types').VaultFile) => void) => void
    }
    settings: {
      get: () => Promise<import('@shared/types').AppConfig>
      set: (key: string, value: unknown) => Promise<void>
    }
  }
}

export function useVaultBridge() {
  const { setVault, setFiles, openTab, setTabContent, markTabDirty } = useVaultStore()

  const openVault = useCallback(async () => {
    const config = await window.vault.openDialog()
    if (!config) return
    setVault(config)
    const files = await window.vault.listFiles()
    setFiles(files)
  }, [setVault, setFiles])

  const refreshFiles = useCallback(async () => {
    const files = await window.vault.listFiles()
    setFiles(files)
  }, [setFiles])

  const openFile = useCallback(async (path: string, name: string) => {
    openTab(path, name)
    const content = await window.vault.readFile(path)
    setTabContent(path, content)
  }, [openTab, setTabContent])

  const saveFile = useCallback(async (path: string, content: string) => {
    await window.vault.writeFile(path, content)
    markTabDirty(path, false)
  }, [markTabDirty])

  const createFile = useCallback(async (dir: string, name: string) => {
    const filePath = await window.vault.createFile(dir, name.endsWith('.md') ? name : `${name}.md`)
    await refreshFiles()
    await openFile(filePath, name.endsWith('.md') ? name : `${name}.md`)
  }, [refreshFiles, openFile])

  return { openVault, refreshFiles, openFile, saveFile, createFile }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/hooks/useVaultBridge.ts
git commit -m "feat: add useVaultBridge hook wrapping IPC calls"
```

---

## Task 8: App Layout & VaultPicker

**Files:**
- Create: `src/renderer/src/components/Layout.tsx`
- Create: `src/renderer/src/components/VaultPicker.tsx`
- Modify: `src/renderer/src/App.tsx`

- [ ] **Step 1: Create VaultPicker (first-launch screen)**

Create `src/renderer/src/components/VaultPicker.tsx`:

```typescript
import React from 'react'
import { useVaultBridge } from '../hooks/useVaultBridge'

export function VaultPicker() {
  const { openVault } = useVaultBridge()

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', gap: 24,
      background: '#1a1a1a', color: '#ccc',
    }}>
      <div style={{ fontSize: 48 }}>📓</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: 0 }}>Meridian</h1>
      <p style={{ color: '#666', margin: 0 }}>A knowledge base that works the way you do.</p>
      <button
        onClick={openVault}
        style={{
          marginTop: 16, padding: '12px 32px', borderRadius: 8,
          background: '#7c6af7', color: '#fff', border: 'none',
          fontSize: 15, cursor: 'pointer', fontWeight: 600,
        }}
      >
        Open Vault
      </button>
      <p style={{ color: '#444', fontSize: 13 }}>
        A vault is a folder of Markdown files on your computer.
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Create three-column Layout**

Create `src/renderer/src/components/Layout.tsx`:

```typescript
import React from 'react'

interface LayoutProps {
  sidebar: React.ReactNode
  editor: React.ReactNode
  rightPanel: React.ReactNode
}

export function Layout({ sidebar, editor, rightPanel }: LayoutProps) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#1a1a1a' }}>
      <div style={{
        width: 220, flexShrink: 0, borderRight: '1px solid #2a2a2a',
        background: '#161616', display: 'flex', flexDirection: 'column',
      }}>
        {sidebar}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {editor}
      </div>
      <div style={{
        width: 200, flexShrink: 0, borderLeft: '1px solid #2a2a2a',
        background: '#161616', overflow: 'auto',
      }}>
        {rightPanel}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update App.tsx**

Replace `src/renderer/src/App.tsx` with:

```typescript
import React from 'react'
import { useVaultStore } from './store/useVaultStore'
import { VaultPicker } from './components/VaultPicker'
import { Layout } from './components/Layout'
import { Sidebar } from './components/Sidebar/Sidebar'
import { EditorArea } from './components/Editor/EditorPane'
import { StatusBar } from './components/StatusBar'

export default function App() {
  const vault = useVaultStore(s => s.vault)

  if (!vault) return <VaultPicker />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Layout
        sidebar={<Sidebar />}
        editor={<EditorArea />}
        rightPanel={<div style={{ padding: 12, color: '#555', fontSize: 12 }}>Right Panel</div>}
      />
      <StatusBar />
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/components/Layout.tsx src/renderer/src/components/VaultPicker.tsx src/renderer/src/App.tsx
git commit -m "feat: add Layout shell and VaultPicker first-launch screen"
```

---

## Task 9: File Tree Sidebar

**Files:**
- Create: `src/renderer/src/components/Sidebar/Sidebar.tsx`
- Create: `src/renderer/src/components/Sidebar/FileTree.tsx`
- Create: `tests/renderer/FileTree.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `tests/renderer/FileTree.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FileTree } from '../../src/renderer/src/components/Sidebar/FileTree'
import { VaultFile } from '../../src/shared/types'

const mockFiles: VaultFile[] = [
  { name: 'Notes.md', path: '/v/Notes.md', relativePath: 'Notes.md', isDirectory: false, mtime: 0 },
  {
    name: 'Projects', path: '/v/Projects', relativePath: 'Projects', isDirectory: true, mtime: 0,
    children: [
      { name: 'Alpha.md', path: '/v/Projects/Alpha.md', relativePath: 'Projects/Alpha.md', isDirectory: false, mtime: 0 },
    ],
  },
]

describe('FileTree', () => {
  it('renders top-level files', () => {
    render(<FileTree files={mockFiles} onFileClick={vi.fn()} vaultPath="/v" />)
    expect(screen.getByText('Notes.md')).toBeInTheDocument()
    expect(screen.getByText('Projects')).toBeInTheDocument()
  })

  it('calls onFileClick with path when file is clicked', () => {
    const onClick = vi.fn()
    render(<FileTree files={mockFiles} onFileClick={onClick} vaultPath="/v" />)
    fireEvent.click(screen.getByText('Notes.md'))
    expect(onClick).toHaveBeenCalledWith('/v/Notes.md', 'Notes.md')
  })

  it('expands a directory on click', () => {
    render(<FileTree files={mockFiles} onFileClick={vi.fn()} vaultPath="/v" />)
    expect(screen.queryByText('Alpha.md')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Projects'))
    expect(screen.getByText('Alpha.md')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
npx vitest run tests/renderer/FileTree.test.tsx
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement FileTree**

Create `src/renderer/src/components/Sidebar/FileTree.tsx`:

```typescript
import React, { useState } from 'react'
import { VaultFile } from '@shared/types'

interface FileTreeProps {
  files: VaultFile[]
  onFileClick: (path: string, name: string) => void
  vaultPath: string
  depth?: number
}

export function FileTree({ files, onFileClick, vaultPath, depth = 0 }: FileTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (path: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(path) ? next.delete(path) : next.add(path)
      return next
    })
  }

  return (
    <div>
      {files.map(file => (
        <div key={file.path}>
          <div
            onClick={() => file.isDirectory ? toggle(file.path) : onFileClick(file.path, file.name)}
            style={{
              paddingLeft: 12 + depth * 16,
              paddingRight: 12,
              paddingTop: 3,
              paddingBottom: 3,
              cursor: 'pointer',
              color: '#ccc',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: 4,
              userSelect: 'none',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#2a2a2a')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontSize: 11, color: '#555', width: 10 }}>
              {file.isDirectory ? (expanded.has(file.path) ? '▾' : '▸') : ''}
            </span>
            <span>{file.isDirectory ? '📁' : '📄'}</span>
            <span>{file.name}</span>
          </div>
          {file.isDirectory && expanded.has(file.path) && file.children && (
            <FileTree
              files={file.children}
              onFileClick={onFileClick}
              vaultPath={vaultPath}
              depth={depth + 1}
            />
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Create Sidebar wrapper**

Create `src/renderer/src/components/Sidebar/Sidebar.tsx`:

```typescript
import React from 'react'
import { useVaultStore } from '../../store/useVaultStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'
import { FileTree } from './FileTree'

export function Sidebar() {
  const { vault, files } = useVaultStore()
  const { openFile, createFile } = useVaultBridge()

  if (!vault) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #2a2a2a', color: '#888', fontSize: 12 }}>
        📁 {vault.name}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        <FileTree files={files} onFileClick={openFile} vaultPath={vault.path} />
      </div>
      <div style={{ padding: 8, borderTop: '1px solid #2a2a2a' }}>
        <button
          onClick={() => createFile(vault.path, `Untitled ${Date.now()}.md`)}
          style={{
            width: '100%', padding: '6px 0', borderRadius: 6,
            background: '#2a2050', color: '#aaa', border: 'none',
            fontSize: 12, cursor: 'pointer',
          }}
        >
          + New note
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run tests to confirm pass**

```bash
npx vitest run tests/renderer/FileTree.test.tsx
```

Expected: PASS — all 3 tests green

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/components/Sidebar/
git commit -m "feat: add file tree sidebar with expand/collapse and new note button"
```

---

## Task 10: CodeMirror 6 Editor

**Files:**
- Create: `src/renderer/src/components/Editor/extensions/markdownExtensions.ts`
- Create: `src/renderer/src/components/Editor/EditorPane.tsx`

- [ ] **Step 1: Create CodeMirror extension bundle**

Create `src/renderer/src/components/Editor/extensions/markdownExtensions.ts`:

```typescript
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { oneDark } from '@codemirror/theme-one-dark'
import { keymap, EditorView } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { EditorState } from '@codemirror/state'
import {
  lineNumbers, highlightActiveLineGutter, highlightSpecialChars,
  drawSelection, dropCursor, rectangularSelection,
  crosshairCursor, highlightActiveLine,
} from '@codemirror/view'
import {
  foldGutter, indentOnInput, syntaxHighlighting,
  defaultHighlightStyle, bracketMatching, foldKeymap,
} from '@codemirror/language'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { lintKeymap } from '@codemirror/lint'

export const meridianTheme = EditorView.theme({
  '&': { height: '100%', fontSize: '15px' },
  '.cm-scroller': { overflow: 'auto', fontFamily: "'Georgia', serif", lineHeight: '1.8' },
  '.cm-content': { padding: '24px 32px', maxWidth: 720, margin: '0 auto' },
  '.cm-focused': { outline: 'none' },
  '.cm-line': { padding: '0' },
}, { dark: true })

export function createMarkdownExtensions(onChange?: (content: string) => void) {
  return [
    oneDark,
    meridianTheme,
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    foldGutter(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      ...lintKeymap,
    ]),
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    onChange
      ? EditorView.updateListener.of(update => {
          if (update.docChanged) onChange(update.state.doc.toString())
        })
      : [],
  ]
}
```

- [ ] **Step 2: Create EditorPane component**

Create `src/renderer/src/components/Editor/EditorPane.tsx`:

```typescript
import React, { useEffect, useRef, useCallback } from 'react'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { useVaultStore } from '../../store/useVaultStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'
import { createMarkdownExtensions } from './extensions/markdownExtensions'
import { TabBar } from './TabBar'
import { MarkdownPreview } from './MarkdownPreview'

export function EditorArea() {
  const { openTabs, activeTabPath, markTabDirty, setTabContent } = useVaultStore()
  const { saveFile } = useVaultBridge()
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const activeTab = openTabs.find(t => t.path === activeTabPath)

  const handleChange = useCallback((content: string) => {
    if (!activeTabPath) return
    setTabContent(activeTabPath, content)
    markTabDirty(activeTabPath, true)
  }, [activeTabPath, setTabContent, markTabDirty])

  // Save with ⌘S
  useEffect(() => {
    const handleKeydown = async (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && activeTab) {
        e.preventDefault()
        await saveFile(activeTab.path, activeTab.content)
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [activeTab, saveFile])

  // Mount CodeMirror
  useEffect(() => {
    if (!editorRef.current) return

    const view = new EditorView({
      state: EditorState.create({
        doc: activeTab?.content ?? '',
        extensions: createMarkdownExtensions(handleChange),
      }),
      parent: editorRef.current,
    })

    viewRef.current = view
    return () => { view.destroy(); viewRef.current = null }
  }, [activeTabPath]) // recreate editor when tab changes

  // Sync content when tab content loads from disk
  useEffect(() => {
    const view = viewRef.current
    if (!view || !activeTab) return
    const current = view.state.doc.toString()
    if (current !== activeTab.content) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: activeTab.content },
      })
    }
  }, [activeTab?.content])

  if (openTabs.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
          <p>Open a note from the sidebar</p>
          <p style={{ fontSize: 12, color: '#333' }}>⌘K to search</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <TabBar />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div ref={editorRef} style={{ flex: 1, overflow: 'auto', height: '100%' }} />
        {activeTab && (
          <>
            <div style={{ width: 1, background: '#2a2a2a' }} />
            <MarkdownPreview content={activeTab.content} />
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/Editor/extensions/ src/renderer/src/components/Editor/EditorPane.tsx
git commit -m "feat: add CodeMirror 6 editor with markdown extensions and auto-save on ⌘S"
```

---

## Task 11: Markdown Preview

**Files:**
- Create: `src/renderer/src/components/Editor/MarkdownPreview.tsx`

- [ ] **Step 1: Create MarkdownPreview component**

Create `src/renderer/src/components/Editor/MarkdownPreview.tsx`:

```typescript
import React, { useMemo } from 'react'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkHtml from 'remark-html'

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkHtml, { sanitize: false })

interface MarkdownPreviewProps {
  content: string
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const html = useMemo(() => {
    try {
      return String(processor.processSync(content))
    } catch {
      return '<p>Preview error</p>'
    }
  }, [content])

  return (
    <div
      className="markdown-preview"
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        flex: 1,
        padding: '24px 32px',
        overflowY: 'auto',
        color: '#ccc',
        fontSize: 15,
        lineHeight: 1.8,
        fontFamily: 'Georgia, serif',
        background: '#1e1e1e',
        maxWidth: 720,
      }}
    />
  )
}
```

- [ ] **Step 2: Install remark dependencies (if not already)**

```bash
npm install remark-parse remark-gfm remark-html unified
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/Editor/MarkdownPreview.tsx
git commit -m "feat: add markdown preview panel using remark/unified"
```

---

## Task 12: Tab Bar

**Files:**
- Create: `src/renderer/src/components/Editor/TabBar.tsx`
- Create: `tests/renderer/TabBar.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `tests/renderer/TabBar.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TabBar } from '../../src/renderer/src/components/Editor/TabBar'
import { useVaultStore } from '../../src/renderer/src/store/useVaultStore'

beforeEach(() => {
  useVaultStore.setState({
    openTabs: [
      { path: '/v/A.md', name: 'A.md', content: '', isDirty: false },
      { path: '/v/B.md', name: 'B.md', content: '', isDirty: true },
    ],
    activeTabPath: '/v/A.md',
  })
})

describe('TabBar', () => {
  it('renders all open tab names', () => {
    render(<TabBar />)
    expect(screen.getByText('A.md')).toBeInTheDocument()
    expect(screen.getByText('B.md')).toBeInTheDocument()
  })

  it('shows dirty indicator for unsaved tabs', () => {
    render(<TabBar />)
    expect(screen.getByText('●')).toBeInTheDocument()
  })

  it('calls setActiveTab when tab is clicked', () => {
    render(<TabBar />)
    fireEvent.click(screen.getByText('B.md'))
    expect(useVaultStore.getState().activeTabPath).toBe('/v/B.md')
  })
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
npx vitest run tests/renderer/TabBar.test.tsx
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement TabBar**

Create `src/renderer/src/components/Editor/TabBar.tsx`:

```typescript
import React from 'react'
import { useVaultStore } from '../../store/useVaultStore'

export function TabBar() {
  const { openTabs, activeTabPath, setActiveTab, closeTab } = useVaultStore()

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end',
      background: '#161616', borderBottom: '1px solid #2a2a2a',
      height: 36, overflowX: 'auto', flexShrink: 0,
    }}>
      {openTabs.map(tab => {
        const isActive = tab.path === activeTabPath
        return (
          <div
            key={tab.path}
            onClick={() => setActiveTab(tab.path)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '0 12px', height: '100%', cursor: 'pointer',
              borderRight: '1px solid #2a2a2a', flexShrink: 0,
              background: isActive ? '#1a1a1a' : 'transparent',
              color: isActive ? '#fff' : '#666', fontSize: 13,
              borderBottom: isActive ? '1px solid #1a1a1a' : 'none',
              marginBottom: isActive ? -1 : 0,
            }}
          >
            {tab.isDirty && <span style={{ color: '#7c6af7', fontSize: 10 }}>●</span>}
            <span>{tab.name}</span>
            <span
              onClick={e => { e.stopPropagation(); closeTab(tab.path) }}
              style={{ color: '#555', fontSize: 16, lineHeight: 1, marginLeft: 4 }}
            >
              ×
            </span>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx vitest run tests/renderer/TabBar.test.tsx
```

Expected: PASS — all 3 tests green

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/components/Editor/TabBar.tsx tests/renderer/TabBar.test.tsx
git commit -m "feat: add tab bar with dirty indicator and close button"
```

---

## Task 13: Status Bar

**Files:**
- Create: `src/renderer/src/components/StatusBar.tsx`

- [ ] **Step 1: Create StatusBar**

Create `src/renderer/src/components/StatusBar.tsx`:

```typescript
import React, { useMemo } from 'react'
import { useVaultStore } from '../store/useVaultStore'

export function StatusBar() {
  const { openTabs, activeTabPath } = useVaultStore()
  const activeTab = openTabs.find(t => t.path === activeTabPath)

  const wordCount = useMemo(() => {
    if (!activeTab?.content) return 0
    return activeTab.content.trim().split(/\s+/).filter(Boolean).length
  }, [activeTab?.content])

  return (
    <div style={{
      height: 22, background: '#161616', borderTop: '1px solid #2a2a2a',
      display: 'flex', alignItems: 'center', padding: '0 12px',
      color: '#555', fontSize: 11, gap: 16, flexShrink: 0,
    }}>
      <span>{wordCount} words</span>
      <span>Markdown</span>
      {activeTab?.isDirty && <span style={{ color: '#7c6af7' }}>Unsaved</span>}
      <span style={{ marginLeft: 'auto' }}>Meridian</span>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/components/StatusBar.tsx
git commit -m "feat: add status bar with word count and dirty state"
```

---

## Task 14: Run Full App & Smoke Test

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```

Expected: all tests PASS, no failures

- [ ] **Step 2: Start the app in dev mode**

```bash
npm run dev
```

Expected: Electron window opens showing the VaultPicker screen (black background, "Open Vault" button).

- [ ] **Step 3: Manual smoke test**

Verify each of the following works:
1. Click "Open Vault" → macOS folder picker opens
2. Select any folder with `.md` files → files appear in sidebar
3. Click a `.md` file → file opens in editor with content
4. Edit content → tab shows `●` dirty indicator, status bar shows "Unsaved"
5. Press `⌘S` → dirty indicator clears
6. Open a second file → second tab appears
7. Close a tab via `×` → previous tab becomes active
8. Create a new note via `+ New note` → appears in sidebar, opens in editor

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: Phase 1 MVP complete — vault, editor, tabs, file tree"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Electron + Vite + React scaffold → Task 1
- ✅ VaultManager (fs operations) → Task 3
- ✅ AppSettings (persistence) → Task 4
- ✅ IPC handlers + contextBridge → Task 5
- ✅ Zustand store → Task 6
- ✅ Three-column layout → Task 8
- ✅ Vault open dialog (first-launch) → Task 8
- ✅ File tree sidebar → Task 9
- ✅ CodeMirror 6 editor → Task 10
- ✅ Markdown live preview (split) → Task 11
- ✅ Multi-tab support → Tasks 6, 12
- ✅ Status bar → Task 13
- ✅ ⌘S save → Task 10

**Not in Phase 1 (covered in later plans):**
- Wiki-links, backlinks, graph, search, command palette → Phase 2
- Themes, daily notes, templates → Phase 3
- Plugin system → Phase 4
- Canvas → Phase 5
