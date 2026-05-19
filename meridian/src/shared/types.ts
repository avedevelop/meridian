export interface VaultFile {
  name: string        // filename with extension, e.g. "Notes.md"
  path: string        // absolute path
  relativePath: string // relative to vault root, e.g. "Projects/Notes.md"
  isDirectory: boolean
  children?: VaultFile[]
  mtime: number       // last modified timestamp (ms)
}

export interface VaultConfig {
  path: string
  name: string
}

export interface AppConfig {
  recentVaults: VaultConfig[]
  lastVault: string | null  // path of last opened vault
  windowBounds: { width: number; height: number; x?: number; y?: number }
}

export type VaultFileChangeType = 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir'

export interface VaultFileChangeEvent {
  type: VaultFileChangeType
  path: string
  vaultPath: string
  file: VaultFile | null
}

export const IPC = {
  VAULT_OPEN_DIALOG: 'vault:open-dialog',
  VAULT_OPEN_BY_PATH: 'vault:open-by-path',
  VAULT_LIST_FILES: 'vault:list-files',
  VAULT_READ_FILE: 'vault:read-file',
  VAULT_WRITE_FILE: 'vault:write-file',
  VAULT_CREATE_FILE: 'vault:create-file',
  VAULT_CREATE_DIR: 'vault:create-dir',
  VAULT_WRITE_BINARY: 'vault:write-binary',
  VAULT_DELETE_FILE: 'vault:delete-file',
  VAULT_RENAME_FILE: 'vault:rename-file',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  FILE_CHANGED: 'file:changed',   // main → renderer push event
} as const
