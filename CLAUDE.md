# Meridian — agent guide

Local-first markdown notes app (Electron 39, React 19, TypeScript, CodeMirror 6, zustand, d3, Konva).
macOS and Windows are both first-class targets. Read `ARCHITECTURE.md` (where code goes) and
`SCOPE.md` (what is in/out of scope) before changing anything.

## Commands (run in `meridian/`)

```bash
npm run lint
npm run typecheck
npm run test          # vitest
npm run check-lines   # component size gate (node script, cross-platform)
npm run dev
```

All four checks must pass before a commit.

## Rules

- Components `<=500` lines, hooks `<=250`, utils `<=200`. Do not grow `App.tsx`, `ipc.ts` or
  `useVaultBridge.ts`; add new modules and register them.
- User-visible strings go through i18n (`en`, `ru`, `nb` locale files).
- Platform-specific behavior lives in `src/main/platform.ts` and is unit-tested with a mocked platform.
- No new native (node-gyp) dependency without discussing it first.
- Windows is not testable in the cloud/Linux environment. Say what was verified (unit test,
  headless Chromium, reasoning) and what still needs a human on Windows.

## Security

- Windows use `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`. The preload must
  stay a single bundle that only requires `electron` (no Node modules).
- Never interpolate note, file or plugin data into HTML. Use `textContent`/DOM APIs, or
  `escapeAttr` from `markdownUtils.ts`, and add a hostile-input test (`tests/renderer/markdownSecurity.test.ts`).
- Note reads and writes go through `VaultManager.resolveAndAssert` (paths must stay inside the **current** vault).
- The renderer is untrusted: a community plugin runs in the app window with the full preload API. Any IPC handler
  that takes a path, URL or setting from the renderer must validate it in the main process with the helpers in
  `main/security.ts` (and `main/safeFetch.ts` for network access), and have a hostile-input test like
  `tests/main/ipcHardening.test.ts`. Never delete, open, launch or fetch something just because the renderer
  asked. What is still open is listed in `docs/plugin-security-audit.md`.
