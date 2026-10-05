# Clipboard history: engine design

Status: engine only (main process, IPC, preload API). No UI yet.
Code: `meridian/src/main/clipboard/`, shared types in `meridian/src/shared/clipboard.ts`.

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
- **Save to note** (Inbox, new note, daily note) belongs to the UI task.

## Needs verification on real machines

- `clipboard.has()/readBuffer()` with the custom format names on Windows and macOS (unit-tested with fakes only).
- `require()` of the ESM-only `rehype-parse` from the packaged main process (same mechanism as `chokidar`).
- Antivirus behaviour for a background clipboard reader on Windows.
- Battery impact of the 400 ms poll on laptops.
