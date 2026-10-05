# Startup benchmark and bundle smoke test

Both scripts work on the built renderer (`npx electron-vite build`, then `out/renderer`) in headless
Chromium, so they run anywhere without Electron. The preload APIs are replaced by stubs.

```bash
cd meridian
# compare two builds (CPU throttled 4x by default, 7 runs each after one warm-up)
node bench/startup/run.mjs before=/path/to/old/out/renderer after=out/renderer
# open a stubbed vault, switch sidebar panels, open Settings; fails loudly on console/network errors
node bench/startup/smoke.mjs out/renderer
```

## Results (Linux container, 4x CPU throttle, vault picker as the first screen)

| build                                 | first screen (median) | script time | JS and assets loaded |
| ------------------------------------- | --------------------: | ----------: | -------------------: |
| before (unminified, everything eager) |                898 ms |      445 ms |              4860 kB |
| after (minified, lazy screens)        |                506 ms |      304 ms |              1754 kB |

What changed: `build.minify: 'esbuild'` for the renderer (electron-vite leaves it off), and `React.lazy`
for Canvas, Sketchpad, Diff, the Calendar/Tasks/Git/Insights/Graph panels, the local graph and the Settings
modal (`src/renderer/src/lib/lazyNamed.ts`).

## Limits

- The first screen here is the vault picker with stubbed APIs. A real vault adds file indexing on top,
  which this does not measure.
- Electron's own process start-up is not included.
- Vim mode (about 119 kB) is still bundled eagerly: it is wired as a synchronous CodeMirror extension.
