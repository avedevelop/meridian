/**
 * Synthetic vault for scale benchmarks. Deterministic (seeded), shaped like a real vault:
 * folders, frontmatter, tags, a few hub notes that many notes link to, and a mix of bare and
 * folder-qualified wiki-links.
 */
export interface SyntheticNote {
  path: string
  name: string
  relativePath: string
  content: string
}

function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

const WORDS = (
  'project meeting budget roadmap review invoice draft notes plan report idea research summary ' +
  'design customer feedback launch backlog sprint retro agenda decision risk metric goal task ' +
  'client contract proposal timeline milestone weekly daily personal reading recipe travel'
).split(' ')

export function generateNotes(
  count: number,
  opts: { seed?: number; avgLinks?: number } = {}
): SyntheticNote[] {
  const rand = rng(opts.seed ?? 1)
  const avgLinks = opts.avgLinks ?? 4
  const folders = Math.max(1, Math.round(count / 40))
  const notes: SyntheticNote[] = []
  const word = (): string => WORDS[Math.floor(rand() * WORDS.length)]
  const title = (i: number): string => `${word()} ${word()} ${i}`

  const names: string[] = []
  const rels: string[] = []
  for (let i = 0; i < count; i++) {
    names.push(title(i))
    rels.push(`Folder ${i % folders}/${names[i]}`)
  }
  const hubs = Math.max(3, Math.round(count / 200))

  for (let i = 0; i < count; i++) {
    const links = Math.floor(rand() * avgLinks * 2)
    const body: string[] = [`# ${names[i]}`, '']
    for (let p = 0; p < 4; p++) {
      const sentence = Array.from({ length: 12 + Math.floor(rand() * 20) }, word).join(' ')
      body.push(sentence + '.', '')
    }
    for (let l = 0; l < links; l++) {
      // Skewed: many links go to a few hub notes, like real vaults
      const target = rand() < 0.3 ? Math.floor(rand() * hubs) : Math.floor(rand() * count)
      body.push(rand() < 0.2 ? `See [[${rels[target]}]].` : `See [[${names[target]}]].`)
    }
    body.push('', `#${word()} #${word()}`)
    const content = `---\ntitle: ${names[i]}\ntags: [${word()}, ${word()}]\n---\n\n${body.join('\n')}\n`
    notes.push({
      path: `/vault/${rels[i]}.md`,
      name: `${names[i]}.md`,
      relativePath: `${rels[i]}.md`,
      content
    })
  }
  return notes
}
