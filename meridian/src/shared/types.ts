export interface VaultFile {
  name: string // filename with extension, e.g. "Notes.md"
  path: string // absolute path
  relativePath: string // relative to vault root, e.g. "Projects/Notes.md"
  isDirectory: boolean
  children?: VaultFile[]
  mtime: number // last modified timestamp (ms)
  birthtime: number // file creation timestamp (ms)
}

export interface VaultConfig {
  path: string
  name: string
}

export interface AppConfig {
  recentVaults: VaultConfig[]
  lastVault: string | null // path of last opened vault
  windowBounds: { width: number; height: number; x?: number; y?: number }
  githubToken?: string
  githubUsername?: string
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
  VAULT_MOVE_FILE: 'vault:move-file',
  VAULT_REVEAL_FILE: 'vault:reveal-file',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  FILE_CHANGED: 'file:changed', // main → renderer push event
  VAULT_EXPORT_HTML: 'vault:export-html',
  VAULT_EXPORT_PDF: 'vault:export-pdf',
  VAULT_SAVE_VIDEO: 'vault:save-video',
  MENU_ACTION: 'menu:action',
  VAULT_FETCH_URL_METADATA: 'vault:fetch-url-metadata',
  VAULT_OPEN_EXTERNAL: 'vault:open-external',
  GIT_STATUS: 'git:status',
  GIT_COMMIT: 'git:commit',
  GIT_SYNC: 'git:sync',
  GIT_INIT: 'git:init',
  GIT_LOG: 'git:log',
  GIT_SHOW_HEAD: 'git:show-head',
  GIT_SET_REMOTE: 'git:set-remote',
  GIT_GITHUB_DEVICE_CODE: 'git:github-device-code',
  GIT_GITHUB_POLL_TOKEN: 'git:github-poll-token',
  GIT_GITHUB_LOGOUT: 'git:github-logout',
  GIT_GITHUB_STATUS: 'git:github-status',
  PREFERENCES_GET: 'preferences:get',
  PREFERENCES_SET: 'preferences:set',
  SPELL_SET_LANGUAGE: 'spell:set-language',
  GET_CONFIG_PATH: 'config:get-path',
  OPEN_PATH: 'shell:open-path',
  WELCOME_DOWNLOAD: 'welcome:download',
  PLUGIN_LIST: 'plugin:list',
  PLUGIN_LOAD: 'plugin:load'
} as const
