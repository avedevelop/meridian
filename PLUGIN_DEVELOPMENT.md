# Meridian Community Plugin Development

Meridian allows you to write custom plugins to extend the capabilities of your notebook editor, daily notes, command palette, and spatial canvas.

Community plugins are loaded from your vault's `.meridian/plugins/` directory.

## Plugin Structure

A plugin is a folder containing at least two files:

```
{vault}/.meridian/plugins/{plugin-id}/
├── manifest.json
└── main.js
```

### 1. `manifest.json`

This file contains metadata about your plugin.

```json
{
  "id": "hello-world",
  "name": "Hello World Plugin",
  "version": "1.0.0",
  "description": "Registers a custom command that shows a toast message.",
  "author": "Your Name",
  "main": "main.js",
  "minAppVersion": "1.0.0"
}
```

- **id**: Unique identifier for the plugin (lowercase, alphanumeric, dashes).
- **name**: Human-readable name.
- **version**: Version string.
- **description**: Brief summary of what your plugin does.
- **author**: Author name.
- **main**: Main entry point file, served as an ESM module (must be `main.js` or configured path).
- **minAppVersion**: Minimum version of Meridian required.

### 2. `main.js`

This is the entry file of your plugin. It must export a default class (or object) implementing the plugin interface. It runs as a **browser ESM module** (meaning you cannot use Node.js `require` or built-in modules directly, only browser APIs, fetch, and the provided `PluginAPI` window context).

```javascript
export default class HelloWorldPlugin {
  // Lifecycle hook called when the plugin is enabled
  onLoad(api) {
    this.api = api
    this.api.ui.toast('Hello World plugin loaded!')

    // Register a command to the Command Palette (⌘K)
    this.api.registerCommand({
      id: 'say-hello',
      title: 'Say Hello in toast',
      run: (api) => {
        api.ui.toast('Hello! You ran a plugin command!')
      }
    })
  }

  // Lifecycle hook called when the plugin is disabled or the vault closes
  onUnload() {
    this.api.ui.toast('Hello World plugin unloaded!')
  }
}
```

---

## Plugin API Reference

The `onLoad(api)` method receives a `PluginAPI` object:

```typescript
export interface PluginAPI {
  // Access to the vault file systems
  vault: typeof window.vault

  // Access to settings configurations
  settings: {
    get<T>(key: string): T
    set(key: string, value: unknown): void
  }

  // UI helpers
  ui: {
    toast(message: string): void
    openSettings?(tab?: string): void
  }

  // Application controls
  app: {
    openDailyNote(): Promise<void>
  }

  // Register command palette items
  registerCommand(cmd: PluginCommand): void
}
```

### File Operations (`api.vault`)

- **`api.vault.listFiles()`**: Resolves to list of all files/directories in the vault.
- **`api.vault.readFile(path)`**: Read content of a text file in the vault.
- **`api.vault.writeFile(path, content)`**: Write content of a file.

---

## Testing / Development Workflow

1. Open your active vault folder on your machine.
2. Create `.meridian/plugins/my-plugin/` directory.
3. Put `manifest.json` and `main.js` inside.
4. Open Meridian settings (⌘,), go to the **Community Plugins** tab.
5. Click **Open Plugins Folder** to verify the folder opens, and click **Reload/Refresh** (or reopen the settings dialog) to see your plugin.
6. Toggle the switch to enable it!
7. Open the Command Palette (⌘K) to verify that any registered commands are shown and can be executed.

## Bundled Demo Plugins

The demo vault includes several community plugins under
`meridian/demo-vault/.meridian/plugins/` that can be copied into another vault
or used as implementation examples:

- **Quick Capture** — appends prompted text to `Inbox.md`.
- **Vault Index** — rebuilds `Vault Index.md` with wiki-links for every note.
- **Link Auditor** — scans wiki-links and writes `Reports/Broken Links.md`.
- **Template Pack** — installs starter templates into `_templates/`.

Enable them in Settings → Community Plugins, then run their commands from the
Command Palette with `>` command mode.

## Smoke Checklist (run after every plugin or loader change)

Repeat these steps before claiming community plugins still work — vault switches, CSP, and the dev reload path are easy to break.

1. Restart `npm run dev` from the canonical workspace
   (`/Users/vladyslav/Desktop/dev/new project/meridian`).
2. Open the welcome vault, then **Settings → Community Plugins**.
3. Enable the bundled **Sample Plugin** (`demo-vault/.meridian/plugins/meridian-sample/`).
4. A toast similar to «Hello from sample plugin!» should appear within ~1s.
   No «Failed to load community plugin …» toast.
5. Open Command Palette (⌘K) and run **Sample: Show Greeting Toast**
   (or whatever command the sample registers). It should toast again.
6. Open DevTools (⌥⌘I) → **Console** and verify there are **no
   `Refused to load … because it violates the following Content Security Policy directive`** errors.
   The CSP in `src/renderer/index.html` must whitelist `meridian-plugin:` for both
   `script-src` and `connect-src`.
7. Switch vaults via the vault picker. The previous vault's plugin must
   not produce a load-error toast in the new vault, even if its id is
   still listed in `pluginsEnabled` (see `App.tsx` community sync).

**Troubleshooting:** If enabling shows «Failed to load community plugin», check DevTools console. A common cause is Content-Security-Policy blocking `meridian-plugin://` module loads — `src/renderer/index.html` must include `meridian-plugin:` in `script-src` and `connect-src`.
