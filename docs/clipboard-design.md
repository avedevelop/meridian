# Clipboard history: engine design

Status: engine, history window, save-to-note and snippets. Not yet verified on a real Windows/macOS desktop.
Code: `meridian/src/main/clipboard/`, shared types in `meridian/src/shared/clipboard.ts`.

## History window

Hidden `BrowserWindow` (`?clipboard=1`, same pattern as Quick Capture), toggled by a global hotkey
(default `Ctrl/Cmd+Shift+H`, configurable through `ClipboardSettings.hotkey`; the window warns if another
app owns it). Hides on blur and on `Esc`. Windows' `Win+V` is owned by the OS and is not bound.

| Keys | Action |
| --- | --- |
| type | search (debounced, prefix + fuzzy) |
| `↑` `↓` `PgUp` `PgDn` | move selection |
| `Enter` | copy the entry back and close |
| `Shift+Enter` | copy back as plain text |
| `Ctrl/Cmd+P` | pin / unpin |
| `Del` (or `Ctrl/Cmd+Backspace`) | remove from history |
| `Ctrl/Cmd+Enter` | save to `Inbox.md` |
| `Ctrl/Cmd+Shift+Enter` | save as a new note |
| `Ctrl/Cmd+D` | save to today's daily note (`Daily/`, honours the date format preference) |
| `Tab` / `Shift+Tab`, `Ctrl/Cmd+1..6` | switch filter: All, Text, Links, Images, Pinned, Snippets |
| `Esc` | clear the search, then close |

Saving converts content: a URL becomes `<url>`, tab-separated rows become a Markdown table, code becomes a
fenced block, images are written to the attachment folder (default `assets/`, never outside the vault) and
linked. New notes are named after the first line and never overwrite an existing note.

Snippets are notes in `<vault>/_snippets/`. `{{date}}`, `{{time}}` and `{{clipboard}}` are expanded when a
snippet is copied; frontmatter is stripped; names cannot contain path separators.

Until the user turns recording on, the window shows a short consent card instead of the history.

## Principles

- **Opt-in.** Nothing is recorded until the user enables it (`enabled: false` by default).
  Turning it on does not record what is already on the clipboard.
- **Local only.** Data lives in `<userData>/clipboard/` (`history.jsonl`, `blobs/`, `settings.json`).
- **No native modules.** Works the same on macOS and Windows and does not add node-gyp builds.

## Pieces

| File | Role |
| --- | --- |
| `watcher.ts` | Polls the clipboard (400 ms, backs off to 2 s when idle, 2 s while disabled), fingerprints content, ignores own writes. |
| `privacy.ts` | Skips content flagged by the OS or password managers; heuristics for secrets. |
| `sanitizeHtml.ts` | `rehype-sanitize` pass before HTML is stored. |
| `store.ts` | JSONL journal (compacted on load), content-addressed PNG blobs, MiniSearch index, dedupe, pins, expiry. |
| `service.ts` | Settings, expiry timer, `copyBack` without re-recording. |
| `ipc.ts` | Validated IPC handlers, `clipboard:changed` broadcast. |

## Privacy rules

- Windows: skip when `ExcludeClipboardContentFromMonitorProcessing` is present, or
  `CanIncludeInClipboardHistory` is a DWORD 0.
- macOS: skip `org.nspasteboard.ConcealedType` and `org.nspasteboard.TransientType`.
- Secret heuristics (private keys, AWS/GitHub/Slack/OpenAI-style tokens, JWTs, Luhn-valid card numbers,
  long mixed-class tokens). `sensitiveMode: 'mark'` (default) stores them with a masked preview and keeps
  them out of the search index; `'skip'` never stores them.
- HTML is sanitized before storage. Previews sent to the renderer are bounded (300 chars).
- "Clear all" deletes the journal and every image blob. Pinned entries do not expire but do get cleared.

## Storage choice

JSONL + in-memory MiniSearch, not SQLite:
`better-sqlite3` needs a native rebuild per platform, and `node:sqlite` could not be verified inside
Electron 39 from the Linux build environment. Measured here (Node 22, 50,000 entries of ~150 chars):
insert 5.5 s total, search p95 11.5 ms, reload 0.5 s, about 200 MB heap for two stores. The default cap is
5,000 entries (configurable up to 50,000). Only the first 2,000 characters of each entry are indexed.

## Not done / known limits

- **Foreground-app blocklist.** Needs a native module (or platform tooling) to learn the source app. Skipped.
- **Auto-paste** into the previous app (macOS Accessibility, Windows SendInput). Only `copyBack` exists.
- **Multiple files.** Electron exposes one file via `FileNameW` / `public.file-url`; multi-file copy records the first.
- **Polling.** No native change event; image-only clipboards are hashed on each poll (cost grows with image size,
  mitigated by the backoff and the 5 MB image cap).
- **Settings page.** Pause and clear live in the window footer; the hotkey, limits and secret handling have no Settings UI yet.
- **Tray / start at login.** Not part of this change.

## Needs verification on real machines

- `clipboard.has()/readBuffer()` with the custom format names on Windows and macOS (unit-tested with fakes only).
- `require()` of the ESM-only `rehype-parse` from the packaged main process (same mechanism as `chokidar`).
- Antivirus behaviour for a background clipboard reader on Windows.
- Battery impact of the 400 ms poll on laptops.
