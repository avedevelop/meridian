# Vault scale benchmark

Measures what happens when a vault is opened and when a note is saved, on synthetic vaults of any size
(deterministic: folders, frontmatter, tags, hub notes, bare and folder-qualified wiki-links).
Runs in plain Node, no Electron.

```bash
cd meridian
node bench/vault/run.mjs                      # SIZES=1000,2000,5000,10000 by default
SIZES=300,1000 node bench/vault/run.mjs
node bench/vault/run.mjs --write ./big-vault  # write a 10,000-note vault to disk to open in the app (COUNT=n)
```

Each line reports: `indexMs` (link index + search index for every note, including resolving all links),
`searchP50/P95` (ms per query), `saveOneNoteMs` (re-index one note and read its links, which is what
every save costs), and `heapMB`.

## Results (Linux container, same machine for both runs)

Before: every `LinkIndex.update` re-resolved the links of the whole vault by scanning every file per
link (roughly cubic overall), and `initVault` also updated the store once per file.

| notes |                     indexing before | indexing after |  save one note before |  after |
| ----: | ----------------------------------: | -------------: | --------------------: | -----: |
|    50 |                               76 ms |          28 ms |                  2 ms | 0.3 ms |
|   100 |                              323 ms |          23 ms |                  7 ms | 0.3 ms |
|   200 |                             2007 ms |          39 ms |                 22 ms | 0.3 ms |
|   300 |                             6887 ms |          75 ms |                 51 ms | 1.2 ms |
|  1000 | (not measured; ~4 min extrapolated) |         145 ms | (~0.5 s extrapolated) | 2.5 ms |
| 10000 |   (not measured; days extrapolated) |        1190 ms |                   n/a |  36 ms |

After, at 10,000 notes: search p50 25 ms, p95 43 ms.

What changed: link resolution uses hash lookups (name and last-two-path-segments) instead of scanning all
files, resolution is lazy and happens once after any number of updates, backlinks come from a reverse map,
and `indexVaultFiles` reads notes in parallel chunks and updates the store once per chunk.
`tests/renderer/linkIndexEquivalence.test.ts` checks the new index against a frozen copy of the old one on
120 random operation sequences.

## Limits

- Not measured here: the IPC cost of reading each file through Electron, rendering, and real note sizes
  (the synthetic notes are about 0.8 kB each).
- Indexing still happens on the renderer's main thread, in chunks of 100 notes.
- Saving a note still re-resolves every link (linear in vault size, 36 ms at 10,000 notes).
