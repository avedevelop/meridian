import { LinkIndex } from '../../src/renderer/src/lib/linkIndex'
import { SearchIndex } from '../../src/renderer/src/lib/searchIndex'
import { generateNotes } from './generateVault'

const sizes = (process.env.SIZES ?? '1000,2000,5000,10000').split(',').map(Number)
const mb = (n: number): string => (n / 1048576).toFixed(0)

function percentile(xs: number[], p: number): number {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.floor(s.length * p))]
}

for (const n of sizes) {
  const notes = generateNotes(n)
  const bytes = notes.reduce((a, x) => a + x.content.length, 0)
  global.gc?.()
  const heap0 = process.memoryUsage().heapUsed

  // 1. What initVault does: for every note, update the link index and the search index.
  const links = new LinkIndex()
  const search = new SearchIndex()
  const t0 = performance.now()
  for (const note of notes) {
    links.update(note.path, note.content, '/vault')
    search.addOrUpdate(note.path, note.name, note.content)
  }
  links.getOutlinks(notes[0].path) // resolution is lazy: force it so the cost is counted
  const indexMs = performance.now() - t0
  global.gc?.()
  const heapMb = (process.memoryUsage().heapUsed - heap0) / 1048576

  // 2. Query latency
  const queries = [
    'project',
    'meeting budget',
    'roadm',
    'customer feedback',
    'sprint retro',
    'zzzz'
  ]
  const times: number[] = []
  for (let r = 0; r < 5; r++) {
    for (const q of queries) {
      const t = performance.now()
      search.search(q)
      times.push(performance.now() - t)
    }
  }

  // 3. Editing one note afterwards (what happens on every save)
  const edit: number[] = []
  for (let i = 0; i < 5; i++) {
    const note = notes[(i * 997) % n]
    const t = performance.now()
    links.update(note.path, note.content + '\nmore [[x]]', '/vault')
    search.addOrUpdate(note.path, note.name, note.content + '\nmore')
    links.getBacklinks(note.path) // the UI reads links right after a save
    edit.push(performance.now() - t)
  }

  let edges = 0
  for (const note of notes) edges += links.getOutlinks(note.path).length
  console.log(
    JSON.stringify({
      notes: n,
      sizeMB: +mb(bytes),
      edges,
      indexMs: Math.round(indexMs),
      perNoteMs: +(indexMs / n).toFixed(2),
      heapMB: Math.round(heapMb),
      searchP50: +percentile(times, 0.5).toFixed(1),
      searchP95: +percentile(times, 0.95).toFixed(1),
      saveOneNoteMs: +(edit.reduce((a, b) => a + b, 0) / edit.length).toFixed(1)
    })
  )
}
