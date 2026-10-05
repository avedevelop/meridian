// Smoke test of the production renderer bundle: open a (stubbed) vault, switch sidebar panels and
// open Settings, and make sure every lazy chunk loads without console or network errors.
// Usage: node bench/startup/smoke.mjs <path-to-out/renderer>
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

const dir = process.argv[2]
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
}
const server = http
  .createServer((req, res) => {
    const path = join(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname))
    const ok = existsSync(path) && !path.endsWith('/')
    res.statusCode = ok ? 200 : 404
    res.setHeader('Content-Type', MIME[extname(path)] ?? 'text/html')
    res.end(ok ? readFileSync(path) : readFileSync(join(dir, 'index.html')))
  })
  .listen(0)
await new Promise((r) => server.once('listening', r))

const stub = `
  const noop = () => () => {};
  const api = (extra) => new Proxy(extra, { get: (t, k) => k in t ? t[k] : (String(k).startsWith('on') ? noop : async () => (/^(list|getAll|search|getNoteTypes)/.test(String(k)) ? [] : /^read/.test(String(k)) ? '' : null)) });
  window.appInfo = { platform: 'linux', homeDir: '/home/u', version: '1.0.14' };
  window.vault = api({ openByPath: async (p) => ({ path: p, name: 'demo' }), openDialog: async () => ({ path: '/v', name: 'demo' }), listFiles: async () => [], getConfig: async () => null, listNoteTypes: async () => [] });
  window.settings = api({ get: async () => ({ recentVaults: ['/v'], lastVault: '/v', windowBounds: {} }), getPreferences: async () => ({}) });
  window.menuAPI = { onAction: noop };
  window.clipboardHistory = api({ getSettings: async () => ({ enabled: false, paused: false, maxEntries: 5000, maxAgeDays: 30, maxImageBytes: 5242880, sensitiveMode: 'mark', hotkey: 'CommandOrControl+Shift+H' }) });
`
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.addInitScript(stub)
const problems = []
const chunks = new Set()
page.on('pageerror', (e) => problems.push('pageerror: ' + e.message))
page.on('console', (m) => {
  if (m.type() === 'error') problems.push('console: ' + m.text())
})
page.on('response', (r) => {
  const u = new URL(r.url())
  if (u.pathname.startsWith('/assets/') && u.pathname.endsWith('.js'))
    chunks.add(
      u.pathname
        .split('/')
        .pop()
        .replace(/-[\w-]+\.js$/, '')
    )
  if (r.status() >= 400) problems.push(`http ${r.status()}: ${u.pathname}`)
})
await page.goto(`http://localhost:${server.address().port}/index.html`)
await page.waitForTimeout(1500)
console.log('after boot, chunks:', [...chunks].sort().join(', '))
await page.getByText('Open Vault', { exact: false }).first().click()
await page.waitForTimeout(1500)
console.log('chunks after opening the vault:', [...chunks].sort().join(', '))

const buttons = await page.$$eval('button', (bs) =>
  bs
    .map((b) => b.getAttribute('title') || b.getAttribute('aria-label') || b.textContent?.trim())
    .filter(Boolean)
)
console.log('buttons:', buttons.slice(0, 25).join(' | '))
for (const label of ['Calendar', 'Tasks', 'Git', 'Insights', 'Graph']) {
  const b = page.locator(`button[title*="${label}" i], button[aria-label*="${label}" i]`).first()
  if (await b.count()) {
    await b.click()
    await page.waitForTimeout(500)
  }
}
const gear = page.locator('button[title*="Settings" i], button[aria-label*="Settings" i]').first()
if (await gear.count()) {
  await gear.click()
  await page.waitForTimeout(800)
}
const sys = page.getByText('System', { exact: true }).first()
const hasSystem = (await sys.count()) > 0
if (hasSystem) {
  await sys.click()
  await page.waitForTimeout(300)
}
console.log(
  'settings "System" category present:',
  hasSystem,
  '| toggle present:',
  (await page.getByText('Run in the background').count()) > 0
)
console.log('chunks loaded after clicks:', [...chunks].sort().join(', '))
console.log(
  problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'no console errors, no failed requests'
)
await page.screenshot({ path: process.env.SHOT ?? '/tmp/smoke.png' })
await browser.close()
server.close()
