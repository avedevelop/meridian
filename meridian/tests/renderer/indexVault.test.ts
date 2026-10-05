import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VaultFile } from '../../src/shared/types'
import { indexVaultFiles } from '../../src/renderer/src/lib/indexVault'
import { useLinkStore } from '../../src/renderer/src/store/useLinkStore'

const file = (path: string, name: string, children?: VaultFile[]): VaultFile => ({
  path,
  name,
  relativePath: name,
  isDirectory: !!children,
  children,
  mtime: 0,
  birthtime: 0
})

beforeEach(() => useLinkStore.getState().reset())

describe('indexVaultFiles', () => {
  it('indexes markdown notes in nested folders and resolves links between them', async () => {
    const files = [
      file('/v/A.md', 'A.md'),
      file('/v/Sub', 'Sub', [file('/v/Sub/B.md', 'B.md')]),
      file('/v/image.png', 'image.png')
    ]
    const contents: Record<string, string> = {
      '/v/A.md': 'See [[B]] #x',
      '/v/Sub/B.md': 'back to [[A]]'
    }
    const read = vi.fn(async (p: string) => contents[p])

    await indexVaultFiles(files, '/v', read)

    const s = useLinkStore.getState()
    expect(read).toHaveBeenCalledTimes(2) // only .md notes are read
    expect(s.outlinks('/v/A.md')).toEqual(['/v/Sub/B.md'])
    expect(s.backlinks('/v/A.md')).toEqual(['/v/Sub/B.md'])
    expect(s.tagsForFile('/v/A.md')).toEqual(['x'])
    s.search('back')
    expect(useLinkStore.getState().searchResults.map((r) => r.path)).toEqual(['/v/Sub/B.md'])
  })

  it('skips unreadable files and keeps going', async () => {
    const files = [file('/v/A.md', 'A.md'), file('/v/Gone.md', 'Gone.md'), file('/v/C.md', 'C.md')]
    const read = vi.fn(async (p: string) => {
      if (p === '/v/Gone.md') throw new Error('ENOENT')
      return 'text'
    })
    await indexVaultFiles(files, '/v', read)
    expect(useLinkStore.getState().allFiles().sort()).toEqual(['/v/A.md', '/v/C.md'])
  })

  it('updates the store once per chunk, not once per file', async () => {
    const files = Array.from({ length: 250 }, (_, i) => file(`/v/n${i}.md`, `n${i}.md`))
    const before = useLinkStore.getState().indexVersion
    await indexVaultFiles(files, '/v', async () => 'x')
    expect(useLinkStore.getState().indexVersion - before).toBe(3) // 100 + 100 + 50
  })

  it('abandons a previous run when a new vault starts, so notes cannot leak across vaults', async () => {
    let release!: () => void
    const gate = new Promise<void>((r) => (release = r))
    const slow = indexVaultFiles([file('/old/A.md', 'A.md')], '/old', async () => {
      await gate
      return 'old note'
    })
    useLinkStore.getState().reset() // the user opened another vault
    await indexVaultFiles([file('/new/B.md', 'B.md')], '/new', async () => 'new note')
    release()
    await slow
    expect(useLinkStore.getState().allFiles()).toEqual(['/new/B.md'])
  })

  it('does nothing for an empty vault', async () => {
    const before = useLinkStore.getState().indexVersion
    await indexVaultFiles([], '/v', async () => '')
    expect(useLinkStore.getState().indexVersion).toBe(before)
  })
})
