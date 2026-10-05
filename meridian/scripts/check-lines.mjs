// Fails when a component .tsx exceeds the strict line limit (see ARCHITECTURE.md).
// Pure Node so it behaves the same on macOS, Linux and Windows.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'src/renderer/src/components'
const LIMIT = 500

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

let failed = false
for (const file of walk(ROOT).filter((f) => f.endsWith('.tsx'))) {
  const lines = readFileSync(file, 'utf8').split('\n').length - 1
  if (lines > LIMIT) {
    console.error(`Error: File ${file} has ${lines} lines, exceeding the ${LIMIT}-line strict limit.`)
    failed = true
  }
}
process.exit(failed ? 1 : 0)
