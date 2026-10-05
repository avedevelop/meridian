# Plugin security audit

Date: 2026-10-05. Scope: what a community plugin (or any script that runs in the app window) can do.
Method: reading the code, with file and line references. No exploit was executed, and this was done
on Linux, so platform behaviour (for example what `shell.openPath` does with an executable) is taken from
Electron's documentation. The plugin API was not changed.

## Summary

**A plugin is fully trusted code.** It is loaded with a dynamic `import()` into the same window as the app
(`App.tsx`, `window.vault.loadPlugin` then `import(entryUrl)`), so it can call everything the preload
exposes (`window.vault`, `window.settings`, `window.clipboardHistory`, `window.capture`), not just the
smaller `PluginAPI` object it is handed. The `PluginAPI` subset is a convenience, not a security boundary.

What holds up:

- No Node in the renderer (`nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`).
- The renderer's CSP blocks direct network access (`connect-src 'self' meridian-plugin: meridian-app-plugin: vault:`).
- Reading and writing notes goes through `VaultManager.resolveAndAssert`, so paths cannot leave the
  **current** vault root; binary files cannot be read as text (`VAULT_READ_FILE`).
- Plugin URLs are validated (id pattern, paths cannot escape the plugin folder).
- Community plugins are off until the user enables them.

What does not hold up is below. "Reachable from a plugin" means: callable as `window.vault.<fn>` or
`window.settings.<fn>` with arguments the plugin chooses.

## Findings

| # | Severity | Finding | Where |
|---|----------|---------|-------|
| 1 | High | **Re-rooting the vault.** `openByPath(anyDirectory)` replaces the vault root with any directory. After that `readFile`/`writeFile`/`deleteFile` work on everything under it, for example the home folder, because the check is relative to the new root. | `ipc.ts:224` (`VAULT_OPEN_BY_PATH`) |
| 2 | High | **Launching files.** `openPath(anyPath)` calls `shell.openPath`, which opens or launches any file. A plugin can write a file with any extension into the vault (`createFile` and `writeFile` do not restrict names) and then launch it, e.g. a `.bat`, `.cmd` or `.command` file. | `ipc.ts:522`, `vault.ts:95`, `ipc.ts:287` |
| 3 | High | **Recursive delete of a chosen folder.** `welcomeDownload(destPath)` runs `rmSync(destPath, { recursive: true, force: true })` when the folder exists, with `destPath` taken from the renderer. | `ipc.ts:554`, `ipc.ts:611` |
| 4 | Medium | **Network access that bypasses the CSP.** `fetchUrlMetadata(url)` fetches any URL from the main process (so data can leave in the query string, and local or internal addresses can be probed). `openExternal`/`window.open` also open any http(s) URL in the browser. | `ipc.ts:472`, `ipc.ts:634` |
| 5 | Medium | **Pushing the vault elsewhere.** `gitSetRemote(url)` accepts any URL and `gitSync` then pushes the vault to it. | `ipc.ts:947`, `ipc.ts:731` |
| 6 | Medium | **Clipboard history is reachable by plugins.** `window.clipboardHistory` can list entries (300-character previews; secrets are masked, other entries are readable), fetch images, and `setSettings({ enabled: true })` turns recording on without the user's consent. This surface was added after the first design and has the same problem as the rest. | `clipboard/ipc.ts:51`, `clipboard/ipc.ts:127` |
| 7 | Medium | **Persistence.** `settings.setPreferences` writes arbitrary preferences, including `runInBackground` and `launchAtLogin`, which register the app to start at login and keep it in the tray. | `ipc.ts:380`, `main/background.ts` |
| 8 | Low | **Enabling is by id, not by code.** `pluginsEnabled[id]` is global. Hot reload (`?t=`) runs new code for an enabled plugin without asking again. A vault-local plugin that reuses an id the user once enabled would start without a prompt (bundled and user plugins take precedence over vault ones for the same id, so the collision only applies to other ids). There are no declared permissions and no integrity check. | `App.tsx` plugin sync, `SettingsCommunityPluginsSection.tsx` |

Combined: findings 1, 2 and 4 together are enough for a malicious plugin to read files outside the vault,
run a program, and send data out. They are one decision (enable the plugin) away from a normal user, and
findings 1 to 3 are also reachable by any script that manages to run in the app window.

## Recommendations, in order

1. **Harden the main process (small, testable, no plugin API change).**
   - `openByPath`: only accept a path the user picked in a dialog or that is already in the recent list
     (main keeps the allowlist).
   - `openPath`: only paths inside the current vault, and never executable extensions.
   - `welcomeDownload`: the main process should choose the destination (the default welcome-vault folder)
     and refuse a folder that is not empty or missing.
   - `fetchUrlMetadata`: http(s) only, block private and loopback addresses, cap size and time.
   - `gitSetRemote`: accept https URLs for known hosts, or ask the user to confirm.
   - Clipboard: ignore `enabled: true` unless the user turned it on from the Settings page or the history
     window (a flag the main process sets after a confirmation dialog).
2. **A real boundary for plugins.** Load plugins in a sandboxed iframe without `allow-same-origin` (or a
   worker) and give them only a `postMessage` bridge that implements `PluginAPI`. Everything above then stops
   being reachable from plugin code.
3. **Permissions and trust.** A manifest `permissions` list, a consent prompt when enabling a plugin, and
   pinning the enabled version by content hash so updates re-ask.

Items 1 and 3 can be done without breaking existing plugins that stay within `PluginAPI`. Item 2 breaks
plugins that touch `window.*` directly or the DOM, so it needs a plugin API version bump.

## Not covered

- Third-party dependencies.
- The Windows and macOS code paths of `shell.openPath`.
- Whether `git` honours `protocol.*` settings that make a remote URL executable on a given machine.
- Plugins' effect on rendering (they can already draw anything in the window).
