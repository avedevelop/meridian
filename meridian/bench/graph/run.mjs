// Usage: node bench/graph/run.mjs   (needs playwright + a Chromium, see PLAYWRIGHT_BROWSERS_PATH)
import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const require = createRequire(import.meta.url)
let chromium
try { ({ chromium } = require('playwright')) } catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')) }

const out = resolve('bench/graph/.out')
mkdirSync(out, { recursive: true })
await build({
  entryPoints: ['bench/graph/entry.ts'], bundle: true, outfile: `${out}/bundle.js`, format: 'iife',
  loader: { '.svg': 'dataurl', '.png': 'dataurl', '.css': 'empty' }, jsx: 'automatic',
  alias: { '@shared': resolve('src/shared'), '@renderer': resolve('src/renderer/src') },
  define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'error'
})
writeFileSync(`${out}/index.html`, `<!doctype html><html><body style="margin:0;background:#1a1a1a"><div id="graph" style="width:1280px;height:800px"></div><script src="bundle.js"></script></body></html>`)

const sizes = (process.env.SIZES ?? '400,1000,2000').split(',').map(Number)
const scales = (process.env.SCALES ?? '1,1.5').split(',').map(Number)
const throttles = (process.env.THROTTLES ?? '1,4').split(',').map(Number)
const rows = []
const browser = await chromium.launch({ args: ['--disable-gpu', '--disable-gpu-compositing', '--use-gl=disabled'] })
const renderers = (process.env.RENDERERS ?? 'svg,canvas').split(',')
for (const dsf of scales) for (const thr of throttles) for (const n of sizes) for (const renderer of renderers) {
  const glow = false
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: dsf })
  const page = await ctx.newPage()
  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: thr })
  await page.goto(`file://${out}/index.html`)
  const r = await page.evaluate(([n, g, rd]) => (rd === 'canvas' ? window.runCanvas(n) : window.runGraph(n, g)), [n, glow, renderer])
  rows.push({ renderer, dsf, cpuThrottle: thr, ...r })
  console.log(JSON.stringify(rows.at(-1)))
  await ctx.close()
}
await browser.close()
writeFileSync(`${out}/results.json`, JSON.stringify(rows, null, 2))
