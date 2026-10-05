# Graph render benchmark

Compares the current SVG graph (`createD3Simulation`) with a naive Canvas 2D prototype using the same
data and the same d3-force layout, in headless Chromium with software rendering (`--disable-gpu`),
with optional CPU throttling and device scale factor.

```bash
cd meridian
SIZES=400,1000 SCALES=1.5 THROTTLES=1 node bench/graph/run.mjs
```

Needs `playwright` and a Chromium (`PLAYWRIGHT_BROWSERS_PATH`). Results land in `bench/graph/.out/`.
`window.runGraph` measures frames while the simulation runs (drag/settle) and during pan+zoom.

## First results (Linux container, software rendering, scale 1.5, no CPU throttle)

| nodes | renderer | simulation fps | pan/zoom fps | DOM nodes |
| ----: | -------- | -------------: | -----------: | --------: |
|   400 | SVG      |             51 |           60 |      2305 |
|   400 | Canvas   |             20 |           26 |         6 |
|  1000 | SVG      |             27 |           49 |      5625 |
|  1000 | Canvas   |              6 |            9 |         6 |
|  2000 | SVG      |             11 |           30 |     11117 |
|  2000 | Canvas   |              3 |            5 |         6 |

An earlier SVG-only run with 4x CPU throttling (a weak laptop) at 400 nodes gave about 18-24 fps while
the simulation runs and 34 fps for pan/zoom; at 1000 nodes 4-7 fps / 5-13 fps.

## Takeaways

- Without a GPU, a full-redraw Canvas is **slower** than SVG: every frame rasterizes the whole
  1920x1200 surface on the CPU. A Canvas rewrite is not justified by these numbers alone.
- SVG cost scales with DOM size (about 5.6 elements per node). The default cap is 400 nodes.
- This does not reproduce a Windows-specific problem, so the renderer choice is not the obvious cause.
  Real Windows behavior (GPU, fonts, DPI scaling, input handling) has to be measured on Windows.
