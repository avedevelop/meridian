// Startup benchmark for the renderer bundle in headless Chromium (no Electron needed).
// Usage: node bench/startup/run.mjs <label>=<path-to-out/renderer> [...]   (env: RUNS=7 THROTTLE=4)
// Metric: time from navigation start until the app has rendered its first screen, plus script CPU time.
import { createRequire } from 'node:module'
import http from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { extname, join } from 'node:path'

const require = createRequire(import.meta.url)
let chromium
try {
  ;({ chromium } = require('playwright'))
} catch {
  ;({ chromium } = require('/opt/node-tools/node_modules/playwright'))
}

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
}
const targets = process.argv.slice(2).map((a) => {
  const [label, dir] = a.split('=')
  return { label, dir }
})
const RUNS = Number(process.env.RUNS ?? 7)
const THROTTLE = Number(process.env.THROTTLE ?? 4)

const stub = `
  const noop = () => () => {};
  const api = (extra) => new Proxy(extra, { get: (t, k) => k in t ? t[k] : (String(k).startsWith('on') ? noop : async () => null) });
  window.appInfo = { platform: 'linux', homeDir: '/home/u', version: '1.0.14' };
  window.vault = api({});
  window.settings = api({ get: async () => ({ recentVaults: [], lastVault: null, windowBounds: {} }), getPreferences: async () => ({}) });
  window.menuAPI = { onAction: noop };
  window.clipboardHistory = api({});
`

function serve(dir) {
  return new Promise((resolve) => {
    const server = http
      .createServer((req, res) => {
        const path = join(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname))
        const file = existsSync(path) && !path.endsWith('/') ? path : join(dir, 'index.html')
        res.setHeader('Content-Type', MIME[extname(file)] ?? 'application/octet-stream')
        res.end(readFileSync(file))
      })
      .listen(0, () => resolve(server))
  })
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
const browser = await chromium.launch()
for (const t of targets) {
  const server = await serve(t.dir)
  const url = `http://localhost:${server.address().port}/index.html`
  const times = [],
    scripts = [],
    bytes = []
  for (let i = 0; i < RUNS + 1; i++) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const page = await ctx.newPage()
    await page.addInitScript(stub)
    const cdp = await ctx.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE })
    await cdp.send('Performance.enable')
    let transferred = 0
    page.on('response', async (r) => {
      try {
        transferred += (await r.body()).length
      } catch {
        // redirects and aborted requests have no body
      }
    })
    const t0 = Date.now()
    await page.goto(url, { waitUntil: 'commit' })
    await page.waitForFunction(
      () => (document.getElementById('root')?.innerText ?? '').trim().length > 20,
      null,
      { timeout: 60000 }
    )
    const wall = Date.now() - t0
    const m = Object.fromEntries(
      (await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value])
    )
    if (i > 0) {
      times.push(wall)
      scripts.push(m.ScriptDuration * 1000)
      bytes.push(transferred)
    } // run 0 warms the disk cache
    await ctx.close()
  }
  console.log(
    `${t.label.padEnd(8)} first screen median ${median(times)} ms (runs ${times.join(', ')}) | script ${Math.round(median(scripts))} ms | JS+assets loaded ${(median(bytes) / 1024).toFixed(0)} kB`
  )
  server.close()
}
await browser.close()
