import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/types'
import type {
  PluginFileChangeEvent,
  VaultFileChangeEvent,
  VaultFile,
  VaultConfig,
  AppConfig
} from '../shared/types'

import { homedir } from 'os'

const appInfo = {
  version: process.env.npm_package_version ?? '1.0.0',
  homeDir: homedir(),
  platform: process.platform
}

const vaultAPI = {
  openDialog: (): Promise<VaultConfig | null> => ipcRenderer.invoke(IPC.VAULT_OPEN_DIALOG),

  listFiles: (): Promise<VaultFile[]> => ipcRenderer.invoke(IPC.VAULT_LIST_FILES),

  readFile: (filePath: string): Promise<string> =>
    ipcRenderer.invoke(IPC.VAULT_READ_FILE, filePath),

  writeFile: (filePath: string, content: string): Promise<void> =>
    ipcRenderer.invoke(IPC.VAULT_WRITE_FILE, filePath, content),

  createFile: (dir: string, name: string): Promise<string> =>
    ipcRenderer.invoke(IPC.VAULT_CREATE_FILE, dir, name),

  createDir: (parentDir: string, name: string): Promise<string> =>
    ipcRenderer.invoke(IPC.VAULT_CREATE_DIR, parentDir, name),

  writeBinary: (filePath: string, base64: string): Promise<string> =>
    ipcRenderer.invoke(IPC.VAULT_WRITE_BINARY, filePath, base64),

  exportHtml: (name: string, html: string, customCSS?: string): Promise<string | null> =>
    ipcRenderer.invoke(IPC.VAULT_EXPORT_HTML, name, html, customCSS ?? ''),

  exportPdf: (
    name: string,
    html: string,
    pageSize?: string,
    customCSS?: string
  ): Promise<string | null> =>
    ipcRenderer.invoke(IPC.VAULT_EXPORT_PDF, name, html, pageSize ?? 'A4', customCSS ?? ''),

  saveVideo: (data: Uint8Array): Promise<string | null> =>
    ipcRenderer.invoke(IPC.VAULT_SAVE_VIDEO, data),

  deleteFile: (filePath: string): Promise<void> =>
    ipcRenderer.invoke(IPC.VAULT_DELETE_FILE, filePath),

  renameFile: (oldPath: string, newName: string): Promise<string> =>
    ipcRenderer.invoke(IPC.VAULT_RENAME_FILE, oldPath, newName),

  moveFile: (sourcePath: string, targetDir: string): Promise<string> =>
    ipcRenderer.invoke(IPC.VAULT_MOVE_FILE, sourcePath, targetDir),

  revealFile: (filePath: string): Promise<void> =>
    ipcRenderer.invoke(IPC.VAULT_REVEAL_FILE, filePath),

  openByPath: (vaultPath: string): Promise<VaultConfig | null> =>
    ipcRenderer.invoke(IPC.VAULT_OPEN_BY_PATH, vaultPath),

  fetchUrlMetadata: (
    url: string
  ): Promise<{ title: string; description: string; image: string; url: string }> =>
    ipcRenderer.invoke(IPC.VAULT_FETCH_URL_METADATA, url),

  openExternal: (url: string): Promise<void> => ipcRenderer.invoke(IPC.VAULT_OPEN_EXTERNAL, url),

  gitStatus: (): Promise<any> => ipcRenderer.invoke(IPC.GIT_STATUS),

  gitCommit: (message?: string): Promise<{ success: boolean; error?: string; message?: string }> =>
    ipcRenderer.invoke(IPC.GIT_COMMIT, message),

  gitSync: (
    defaultBranch?: string
  ): Promise<{ success: boolean; error?: string; noRemote?: boolean }> =>
    ipcRenderer.invoke(IPC.GIT_SYNC, defaultBranch ?? 'main'),

  gitInit: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke(IPC.GIT_INIT),

  gitLog: (): Promise<{ success: boolean; error?: string; commits?: any[] }> =>
    ipcRenderer.invoke(IPC.GIT_LOG),

  gitShowHead: (relativePath: string): Promise<{ success: boolean; content: string }> =>
    ipcRenderer.invoke(IPC.GIT_SHOW_HEAD, relativePath),

  gitSetRemote: (url: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke(IPC.GIT_SET_REMOTE, url),

  githubDeviceCode: (): Promise<any> => ipcRenderer.invoke(IPC.GIT_GITHUB_DEVICE_CODE),

  githubPollToken: (deviceCode: string): Promise<any> =>
    ipcRenderer.invoke(IPC.GIT_GITHUB_POLL_TOKEN, deviceCode),

  githubLogout: (): Promise<{ success: boolean }> => ipcRenderer.invoke(IPC.GIT_GITHUB_LOGOUT),

  githubStatus: (): Promise<{ connected: boolean; username: string }> =>
    ipcRenderer.invoke(IPC.GIT_GITHUB_STATUS),

  onFileChanged: (callback: (event: VaultFileChangeEvent) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, change: VaultFileChangeEvent) =>
      callback(change)
    ipcRenderer.on(IPC.FILE_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC.FILE_CHANGED, handler)
  },

  setSpellLanguage: (lang: string) => ipcRenderer.invoke(IPC.SPELL_SET_LANGUAGE, lang),
  getConfigPath: () => ipcRenderer.invoke(IPC.GET_CONFIG_PATH),
  openPath: (filePath: string) => ipcRenderer.invoke(IPC.OPEN_PATH, filePath),
  downloadWelcomeVault: (destPath: string) => ipcRenderer.invoke(IPC.WELCOME_DOWNLOAD, destPath),
  listPlugins: (): Promise<any[]> => ipcRenderer.invoke(IPC.PLUGIN_LIST),
  loadPlugin: (id: string): Promise<string> => ipcRenderer.invoke(IPC.PLUGIN_LOAD, id),
  openPluginsFolder: (): Promise<string> => ipcRenderer.invoke(IPC.PLUGIN_OPEN_FOLDER),
  onPluginFileChanged: (callback: (event: PluginFileChangeEvent) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, change: PluginFileChangeEvent) =>
      callback(change)
    ipcRenderer.on(IPC.PLUGIN_FILE_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC.PLUGIN_FILE_CHANGED, handler)
  }
}

const settingsAPI = {
  get: (): Promise<AppConfig> => ipcRenderer.invoke(IPC.SETTINGS_GET),
  set: (key: string, value: unknown): Promise<void> =>
    ipcRenderer.invoke(IPC.SETTINGS_SET, key, value),
  getPreferences: (): Promise<Record<string, unknown>> => ipcRenderer.invoke(IPC.PREFERENCES_GET),
  setPreferences: (prefs: Record<string, unknown>): Promise<void> =>
    ipcRenderer.invoke(IPC.PREFERENCES_SET, prefs)
}

contextBridge.exposeInMainWorld('appInfo', appInfo)
contextBridge.exposeInMainWorld('vault', vaultAPI)
contextBridge.exposeInMainWorld('settings', settingsAPI)
contextBridge.exposeInMainWorld('menuAPI', {
  onAction: (callback: (action: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, action: string) => callback(action)
    ipcRenderer.on('menu:action', listener)
    return () => ipcRenderer.removeListener('menu:action', listener)
  }
})
