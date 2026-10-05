// Vault scale benchmark: indexing, search and edit cost on synthetic vaults (Node, no Electron).
//   node bench/vault/run.mjs                 # SIZES=1000,2000,5000,10000 by default
//   node bench/vault/run.mjs --write ./demo  # also write a 10,000-note vault to disk to open in the app
import { build } from 'esbuild'
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const out = resolve('bench/vault/.out')
mkdirSync(out, { recursive: true })
const common = {
  bundle: true,
  platform: 'node',
  format: 'esm',
  logLevel: 'error',
  alias: { '@shared': resolve('src/shared') }
}

const writeIdx = process.argv.indexOf('--write')
if (writeIdx !== -1) {
  const dir = resolve(process.argv[writeIdx + 1] ?? 'bench-vault')
  const count = Number(process.env.COUNT ?? 10000)
  await build({
    ...common,
    entryPoints: ['bench/vault/generateVault.ts'],
    outfile: `${out}/generate.mjs`
  })
  const { generateNotes } = await import(`${out}/generate.mjs`)
  const notes = generateNotes(count)
  for (const n of notes) {
    const file = join(dir, n.relativePath)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, n.content)
  }
  console.log(`wrote ${notes.length} notes to ${dir}`)
  process.exit(0)
}

// CommonJS: some dependencies (yaml) use require() and do not bundle as ESM
await build({
  ...common,
  format: 'cjs',
  entryPoints: ['bench/vault/entry.ts'],
  outfile: `${out}/entry.cjs`
})
const r = spawnSync(process.execPath, ['--expose-gc', `${out}/entry.cjs`], {
  stdio: 'inherit',
  env: process.env
})
process.exit(r.status ?? 1)
