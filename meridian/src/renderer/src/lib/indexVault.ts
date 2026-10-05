import type { VaultFile } from '@shared/types'
import { flattenVaultFiles } from '../components/Editor/markdownUtils'
import { getIndexEpoch, useLinkStore } from '../store/useLinkStore'

const CHUNK_SIZE = 100

let generation = 0

/**
 * Read and index every note of a vault. Files are read a chunk at a time (in parallel) and each
 * chunk is indexed in one pass, so the UI updates progressively and the cost grows linearly with
 * the vault. A run is abandoned when another run starts or when the stores are reset (which
 * happens first when a vault is opened), so a slow vault that was closed cannot leak notes into
 * the vault opened after it.
 */
export async function indexVaultFiles(
  files: VaultFile[],
  vaultPath: string,
  readFile: (path: string) => Promise<string>
): Promise<void> {
  const run = ++generation
  const epoch = getIndexEpoch() // the stores are reset before a vault is opened; a later reset invalidates this run
  const notes = flattenVaultFiles(files).filter((f) => !f.isDirectory && f.name.endsWith('.md'))

  for (let i = 0; i < notes.length; i += CHUNK_SIZE) {
    const loaded = await Promise.all(
      notes.slice(i, i + CHUNK_SIZE).map(async (f) => {
        try {
          return { path: f.path, name: f.name, content: await readFile(f.path) }
        } catch {
          return null // disappeared or became unreadable during initial indexing
        }
      })
    )
    if (run !== generation || epoch !== getIndexEpoch()) return
    useLinkStore.getState().indexFiles(
      loaded.filter((n): n is { path: string; name: string; content: string } => n !== null),
      vaultPath
    )
  }
}
