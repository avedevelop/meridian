# Meridian

> A free, open-source knowledge base for macOS — a full-featured alternative to Obsidian.

Meridian stores your notes as plain Markdown files on your local filesystem. No cloud required, no subscriptions, no lock-in.

![Meridian screenshot](docs/assets/screenshot.png)

---

## Features

- **Rich Markdown editor** — CodeMirror 6 with live split-view preview
- **Wiki-links** — `[[Note name]]` syntax with autocomplete and backlinks panel
- **Graph view** — interactive D3 force-directed graph of note relationships
- **Full-text search** — instant search across your entire vault
- **Canvas** — infinite whiteboard for spatial thinking
- **Plugin system** — extend Meridian with community plugins
- **Themes** — dark/light mode, custom CSS per vault
- **Command palette** — `⌘K` to navigate everything
- **Vault-compatible** — works with existing Obsidian vaults (plain `.md` files)

---

## Stack

| Layer | Technology |
|---|---|
| Desktop runtime | Electron 29 |
| UI | React 18 + TypeScript |
| Editor | CodeMirror 6 |
| State | Zustand |
| Graph | D3.js |
| Canvas | Konva.js |
| Search | MiniSearch |
| Build | electron-vite + electron-builder |

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/bvsmma/meridian.git
cd meridian

# Install dependencies
npm install

# Run in development
npm run dev

# Build for macOS
npm run build
```

> **macOS only.** Distributed as an unsigned `.dmg` — open via right-click → Open on first launch.

### Dev не стартует?

**Симптом:** `TypeError: Cannot read properties of undefined (reading 'registerSchemesAsPrivileged')`

Некоторые среды (Cursor, VS Code integrated terminal) выставляют `ELECTRON_RUN_AS_NODE=1`, из-за чего Electron запускается как обычный Node-процесс.

`npm run dev` уже содержит `env -u ELECTRON_RUN_AS_NODE`, но если ошибка всё же возникает:

```bash
unset ELECTRON_RUN_AS_NODE && npm run dev
```

Если порт 5173 занят предыдущим dev-процессом:

```bash
npm run dev:kill   # убивает процесс на :5173
npm run dev
```

---

## Roadmap

- [x] Phase 1 — Core: vault manager, CodeMirror editor, file tree, tabs
- [x] Phase 2 — Links: wiki-links, backlinks, graph view, search, command palette
- [x] Phase 3 — Polish: themes, daily notes, templates, outline
- [x] Phase 4 — Plugins: plugin API, manager UI, community plugins
- [x] Phase 5 — Canvas: infinite whiteboard, note cards, connections

---

## Maintenance & Guardrails

To preserve modularity and keep the codebase clean, we enforce component file-size limits. See [meridian/ARCHITECTURE.md](meridian/ARCHITECTURE.md) for full details.

Run the file size checks with:
```bash
cd meridian
npm run check-lines
```

---

## Contributing

Contributions are welcome. Please open an issue first to discuss what you'd like to change.

---

## License

Apache 2.0 — see [LICENSE](LICENSE) for details.
