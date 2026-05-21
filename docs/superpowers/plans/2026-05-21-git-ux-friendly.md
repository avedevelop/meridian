# Git UX — Friendly for Non-Technical Users

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the Cloud Backup panel to speak plain English — no git jargon — with auto-generated snapshot messages, human dates, a setup wizard, and a configurable auto-backup toggle.

**Architecture:** All changes are UI-only in `GitPanel.tsx` (rename strings, new wizard, human dates, auto-message) plus `useSettingsStore.ts` (add `autoBackupInterval`) plus `StatusBar.tsx` (read the new interval). No new IPC handlers needed — existing git operations are reused.

**Tech Stack:** React, Zustand, TypeScript

---

## File map

| File | What changes |
|------|-------------|
| `meridian/src/renderer/src/components/Sidebar/GitPanel.tsx` | All UI: renamed labels, setup wizard, auto-message, human dates, auto-backup toggle |
| `meridian/src/renderer/src/store/useSettingsStore.ts` | Add `autoBackupInterval: 15 | 30 | 60` to settings |
| `meridian/src/renderer/src/components/StatusBar.tsx` | Read `autoBackupInterval` instead of hardcoded 45000ms |

---

## Task 1: Human-readable dates + auto-generated snapshot messages

**Files:**
- Modify: `meridian/src/renderer/src/components/Sidebar/GitPanel.tsx`

These are pure display changes with no side effects — safe to do first.

### Human-readable date helper

- [ ] **Step 1: Add `timeAgo` helper at the top of `GitPanel.tsx` (before the component)**

```tsx
function timeAgo(dateStr: string): string {
  // dateStr is YYYY-MM-DD from git log --date=short
  const now = new Date()
  const then = new Date(dateStr)
  if (isNaN(then.getTime())) return dateStr
  const diffDays = Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) === 1 ? '' : 's'} ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) === 1 ? '' : 's'} ago`
  return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) === 1 ? '' : 's'} ago`
}
```

- [ ] **Step 2: Add `autoCommitMessage` helper**

This derives a readable message from the `changes[]` array (already in `gitState`):

```tsx
function autoCommitMessage(changes: { path: string; status: string }[]): string {
  if (changes.length === 0) return ''
  const names = changes
    .slice(0, 3)
    .map((c) => c.path.split('/').pop() ?? c.path)
  const suffix = changes.length > 3 ? ` +${changes.length - 3} more` : ''
  const action =
    changes.every((c) => c.status === 'added' || c.status === 'untracked')
      ? 'Added'
      : changes.every((c) => c.status === 'deleted')
      ? 'Deleted'
      : 'Updated'
  return `${action}: ${names.join(', ')}${suffix}`
}
```

- [ ] **Step 3: Apply `timeAgo` in the commit history list**

Find where `commit.date` is displayed in the history accordion (search for `commit.date` in the file). Replace the raw date with:

```tsx
<span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>
  {timeAgo(commit.date)}
</span>
```

- [ ] **Step 4: Pre-fill commit message textarea with auto-generated message**

Find the `useEffect` that runs on `[fetchStatus, fetchCommits]` or add a new one that watches `gitState.changes`:

```tsx
useEffect(() => {
  if (!gitState?.changes || gitState.changes.length === 0) return
  setCommitMessage((prev) => {
    // Only auto-fill if the field is empty or still contains a previous auto-message
    if (prev.trim() === '' || prev.startsWith('Updated:') || prev.startsWith('Added:') || prev.startsWith('Deleted:')) {
      return autoCommitMessage(gitState.changes ?? [])
    }
    return prev
  })
}, [gitState?.changes])
```

- [ ] **Step 5: Typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm run typecheck 2>&1 | tail -8
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
git add src/renderer/src/components/Sidebar/GitPanel.tsx
git commit -m "feat: human-readable dates and auto-generated snapshot messages in git panel"
```

---

## Task 2: Rename git terminology to plain English

**Files:**
- Modify: `meridian/src/renderer/src/components/Sidebar/GitPanel.tsx`

Replace every user-facing git term with plain English. No logic changes — strings only.

- [ ] **Step 1: Replace all git-jargon strings in `GitPanel.tsx`**

Find and replace these exact strings (use your Read tool to find exact locations, then Edit):

| Find | Replace |
|------|---------|
| `Source Control` | `Cloud Backup` |
| `Initialize Repository` | `Enable Backup` |
| `This folder is not a Git repository.` | `Backup is not set up for this vault yet.` |
| `Commit message (Cmd+Enter to commit)` | `What changed? (optional — auto-filled)` |
| `Committing...` | `Saving…` |
| `Commit` (button label) | `Save Snapshot` |
| `Syncing…` | `Backing up…` |
| `Checking…` | `Checking…` (keep) |
| `Sync` (button label) | `Backup Now` |
| `CHANGES` (accordion header) | `UNSAVED CHANGES` |
| `COMMIT HISTORY` (accordion header) | `SNAPSHOT HISTORY` |
| `No changes detected` | `Everything is saved` |
| `Synced successfully!` | `Backup complete!` |
| `Nothing to commit — already up to date.` | `Everything is already backed up.` |
| `Configure a remote first to sync.` | `Connect a GitHub repo first to back up online.` |
| `Remote configured! Click Sync to push.` | `GitHub connected! Click Backup Now to upload.` |
| `Will commit and push your notes to initialize the remote repo.` | `Your notes will be uploaded to GitHub for the first time.` |
| `Will commit local changes and push to remote.` | `Your changes will be saved and uploaded to GitHub.` |
| `Commit & Push` (confirm button) | `Save & Upload` |
| `Connect to a remote to enable sync (GitHub, GitLab, etc.)` | `Paste your GitHub repository URL to enable online backup.` |
| `Set Remote` | `Connect Repository` |
| `Connecting…` | `Connecting…` (keep) |
| `Refresh Git Status` (title attr) | `Refresh` (keep current) |

- [ ] **Step 2: Rename section accordion labels**

Find the accordion header divs that display "CHANGES" and "COMMIT HISTORY". They look like:
```tsx
<span>CHANGES</span>
```
Replace with:
```tsx
<span>UNSAVED CHANGES</span>
```
And:
```tsx
<span>COMMIT HISTORY</span>
```
Replace with:
```tsx
<span>SNAPSHOT HISTORY</span>
```

- [ ] **Step 3: Update empty state for "not a repo"**

The current empty state says "This folder is not a Git repository." and has "Initialize Repository". Change to:

```tsx
<div style={{
  padding: 12,
  background: 'var(--bg-secondary)',
  border: '1px dashed var(--border-color)',
  borderRadius: 8,
  fontSize: 13,
  color: 'var(--text-secondary)',
  lineHeight: '1.6',
  textAlign: 'center'
}}>
  <div style={{ fontSize: 20, marginBottom: 8 }}>☁️</div>
  <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>No backup set up</div>
  <div style={{ fontSize: 12 }}>
    Enable backup to keep a full history of your notes and sync them to GitHub.
  </div>
</div>
```

And the button label changes from "Initialize Repository" to "Enable Backup".

- [ ] **Step 4: Typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm run typecheck 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
git add src/renderer/src/components/Sidebar/GitPanel.tsx
git commit -m "feat: rename git jargon to plain English in backup panel"
```

---

## Task 3: Setup wizard for first-time users

**Files:**
- Modify: `meridian/src/renderer/src/components/Sidebar/GitPanel.tsx`

Replace the cryptic "not a repo" state + disconnected-remote state with a step-by-step wizard.

The wizard has 3 steps shown in sequence:
1. **Enable backup** (git init) — shown when `!gitState.isRepo`
2. **Connect GitHub** (link to Settings → Sync & GitHub) — shown when `isRepo && !ghConnected`  
3. **Add repository URL** (set remote) — shown when `isRepo && ghConnected && !hasRemote`

Once all steps done, show the normal panel.

- [ ] **Step 1: Add a `SetupWizard` component at the top of `GitPanel.tsx` (before the main component)**

```tsx
interface SetupWizardProps {
  isRepo: boolean
  ghConnected: boolean
  ghUsername: string
  hasRemote: boolean
  onInit: () => void
  onSetRemote: (url: string) => void
  loading: boolean
  error: string | null
}

function SetupWizard({ isRepo, ghConnected, ghUsername, hasRemote, onInit, onSetRemote, loading, error }: SetupWizardProps) {
  const [remoteUrl, setRemoteUrl] = React.useState('')

  const steps = [
    { done: isRepo, label: 'Enable backup', desc: 'Set up version history for this vault' },
    { done: ghConnected, label: 'Connect GitHub', desc: `Sign in to upload notes online` },
    { done: hasRemote, label: 'Set repository', desc: 'Choose where to store your backup' },
  ]
  const currentStep = steps.findIndex((s) => !s.done)

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
          ☁️ Set up Cloud Backup
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Complete these steps to back up your notes automatically.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map((step, i) => {
          const isActive = i === currentStep
          const isDone = step.done
          return (
            <div
              key={step.label}
              style={{
                display: 'flex',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 8,
                background: isActive ? 'var(--bg-surface)' : 'transparent',
                border: isActive ? '1px solid var(--border-color)' : '1px solid transparent',
                opacity: !isDone && !isActive ? 0.4 : 1
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                background: isDone ? '#4ade80' : isActive ? 'var(--accent-color)' : 'var(--bg-surface)',
                color: isDone || isActive ? '#fff' : 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700
              }}>
                {isDone ? '✓' : i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{step.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>{step.desc}</div>

                {isActive && i === 0 && (
                  <button
                    onClick={onInit}
                    disabled={loading}
                    style={{
                      marginTop: 8, padding: '6px 14px', borderRadius: 6,
                      background: 'var(--accent-color)', color: '#fff',
                      border: 'none', fontSize: 12, fontWeight: 600,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    {loading ? 'Setting up…' : 'Enable Backup'}
                  </button>
                )}

                {isActive && i === 1 && (
                  <button
                    onClick={() => window.vault.openExternal('about:blank').then(() => {
                      // Open settings by dispatching a custom event the parent listens to
                      window.dispatchEvent(new CustomEvent('meridian:open-settings', { detail: 'sync' }))
                    })}
                    style={{
                      marginTop: 8, padding: '6px 14px', borderRadius: 6,
                      background: '#24292e', color: '#fff',
                      border: '1px solid #444', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                    </svg>
                    Connect GitHub Account
                  </button>
                )}

                {isActive && i === 2 && (
                  <div style={{ marginTop: 8 }}>
                    {ghUsername && (
                      <div style={{ fontSize: 11, color: '#4ade80', marginBottom: 6 }}>
                        ✓ Signed in as @{ghUsername}
                      </div>
                    )}
                    <input
                      value={remoteUrl}
                      onChange={(e) => setRemoteUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && remoteUrl.trim()) onSetRemote(remoteUrl.trim()) }}
                      placeholder="https://github.com/you/my-notes.git"
                      style={{
                        width: '100%', padding: '6px 8px', borderRadius: 5,
                        background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                        outline: 'none', color: 'var(--text-primary)', fontSize: 11,
                        boxSizing: 'border-box' as const, marginBottom: 6
                      }}
                    />
                    <button
                      onClick={() => onSetRemote(remoteUrl.trim())}
                      disabled={!remoteUrl.trim()}
                      style={{
                        width: '100%', padding: '6px 0', borderRadius: 5,
                        background: 'var(--accent-color)', color: '#fff',
                        border: 'none', fontSize: 12, fontWeight: 600,
                        cursor: remoteUrl.trim() ? 'pointer' : 'not-allowed',
                        opacity: remoteUrl.trim() ? 1 : 0.5
                      }}
                    >
                      Connect Repository
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <div style={{ fontSize: 11, color: '#f87171', padding: '6px 10px', background: 'rgba(248,113,113,0.08)', borderRadius: 6 }}>
          ⚠ {error}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Use `SetupWizard` in the main `GitPanel` component**

Replace the current conditional rendering at the top of `GitPanel`'s return (the `if (!gitState?.isRepo)` block AND the remote setup form inside the main return):

```tsx
// Replace the early return:
if (!gitState?.isRepo || !ghConnected || !gitState.hasRemote) {
  return (
    <SetupWizard
      isRepo={gitState?.isRepo ?? false}
      ghConnected={ghConnected}
      ghUsername={ghUsername}
      hasRemote={gitState?.hasRemote ?? false}
      onInit={handleInit}
      onSetRemote={async (url) => {
        setError(null)
        const res = await window.vault.gitSetRemote(url)
        if (res.success) {
          await fetchStatus()
        } else {
          setError(res.error ?? 'Failed to connect repository')
        }
      }}
      loading={loading}
      error={error}
    />
  )
}
```

Also remove the `{/* Remote Setup Form */}` block from the main return JSX since it's now handled by the wizard.

- [ ] **Step 3: Wire the settings open event in `App.tsx`**

The wizard dispatches `window.dispatchEvent(new CustomEvent('meridian:open-settings', { detail: 'sync' }))`. Wire this in `App.tsx`:

Find the `useEffect` with the keyboard shortcut handler. Add inside it:
```tsx
const openSettingsHandler = (e: Event) => {
  setSettingsOpen(true)
  // The detail is the category to open — we'll use it later
}
window.addEventListener('meridian:open-settings', openSettingsHandler)
// In cleanup:
// window.removeEventListener('meridian:open-settings', openSettingsHandler)
```

Or more simply — just open settings without the category for now:
```tsx
useEffect(() => {
  const handler = () => setSettingsOpen(true)
  window.addEventListener('meridian:open-settings', handler)
  return () => window.removeEventListener('meridian:open-settings', handler)
}, [])
```

- [ ] **Step 4: Typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm run typecheck 2>&1 | tail -8
```

- [ ] **Step 5: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
git add src/renderer/src/components/Sidebar/GitPanel.tsx \
        src/renderer/src/App.tsx
git commit -m "feat: setup wizard for first-time backup configuration"
```

---

## Task 4: Auto-backup toggle with configurable interval

**Files:**
- Modify: `meridian/src/renderer/src/store/useSettingsStore.ts` — add `autoBackupInterval`
- Modify: `meridian/src/renderer/src/components/Sidebar/GitPanel.tsx` — add toggle UI
- Modify: `meridian/src/renderer/src/components/StatusBar.tsx` — read interval from settings

### Step 4a: Add `autoBackupInterval` to settings store

- [ ] **Step 1: Add the field to `useSettingsStore.ts`**

In the `pluginsEnabled` block, add `autoBackupInterval` as a top-level setting (not inside `pluginsEnabled`):

Find the `SettingsState` interface. After `autoSaveDelay: number`, add:
```ts
autoBackupInterval: 15 | 30 | 60 | 0 // 0 = disabled
```

In `DEFAULTS`, after `autoSaveDelay: 5`, add:
```ts
autoBackupInterval: 0,
```

(`0` = auto-backup off by default.)

### Step 4b: Add toggle UI inside GitPanel

- [ ] **Step 2: Import `useSettingsStore` at the top of `GitPanel.tsx`**

```tsx
import { useSettingsStore } from '../../store/useSettingsStore'
```

- [ ] **Step 3: Read settings in the component**

Inside `GitPanel`, add:
```tsx
const { autoBackupInterval, updateSetting } = useSettingsStore()
```

- [ ] **Step 4: Add auto-backup toggle UI**

Find the bottom of the panel (before or after the scrollable accordions section). Add:

```tsx
{/* Auto-backup toggle */}
<div style={{
  padding: '10px 14px',
  borderTop: '1px solid var(--border-color)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  flexShrink: 0
}}>
  <div>
    <div style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 500 }}>Auto-backup</div>
    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
      {autoBackupInterval === 0 ? 'Off' : `Every ${autoBackupInterval} min`}
    </div>
  </div>
  <select
    value={autoBackupInterval}
    onChange={(e) => updateSetting('autoBackupInterval', Number(e.target.value) as 0 | 15 | 30 | 60)}
    style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-color)',
      borderRadius: 5,
      color: 'var(--text-primary)',
      fontSize: 11,
      padding: '3px 6px',
      cursor: 'pointer',
      outline: 'none'
    }}
  >
    <option value={0}>Off</option>
    <option value={15}>15 min</option>
    <option value={30}>30 min</option>
    <option value={60}>1 hour</option>
  </select>
</div>
```

### Step 4c: Use `autoBackupInterval` in StatusBar

- [ ] **Step 5: Update `StatusBar.tsx` to use the setting**

Read `src/renderer/src/components/StatusBar.tsx`. Find the `setInterval` call that currently uses `45000` (45 seconds). 

Add to StatusBar:
```tsx
const autoBackupInterval = useSettingsStore((s) => s.autoBackupInterval)
```

Find the `useEffect` that sets up the interval timer (the one with `45000`). Change it to use `autoBackupInterval * 60 * 1000` and re-trigger when the setting changes:

```tsx
useEffect(() => {
  if (!gitBackupEnabled || autoBackupInterval === 0) return

  fetchGitStatus()
  const timer = setInterval(() => {
    fetchGitStatus().then(() => {
      if (gitState && gitState.isRepo && !gitState.clean && syncState === 'idle') {
        handleGitSync()
      }
    })
  }, autoBackupInterval * 60 * 1000)

  return () => clearInterval(timer)
}, [gitBackupEnabled, autoBackupInterval, fetchGitStatus, gitState, syncState, handleGitSync])
```

- [ ] **Step 6: Typecheck**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian" && npm run typecheck 2>&1 | tail -8
```

- [ ] **Step 7: Commit**

```bash
cd "/Users/vladyslav/Desktop/dev/new project/meridian"
git add src/renderer/src/store/useSettingsStore.ts \
        src/renderer/src/components/Sidebar/GitPanel.tsx \
        src/renderer/src/components/StatusBar.tsx
git commit -m "feat: configurable auto-backup interval in backup panel"
```
