import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/types'
import type { VaultFileChangeEvent, VaultFile, VaultConfig, AppConfig } from '../shared/types'

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

  exportHtml: (suggestedName: string, html: string): Promise<string | null> =>
    ipcRenderer.invoke(IPC.VAULT_EXPORT_HTML, suggestedName, html),

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

  gitStatus: (): Promise<{ isRepo: boolean; clean?: boolean; changesCount?: number }> =>
    ipcRenderer.invoke(IPC.GIT_STATUS),

  gitCommit: (message?: string): Promise<{ success: boolean; error?: string; message?: string }> =>
    ipcRenderer.invoke(IPC.GIT_COMMIT, message),

  gitSync: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke(IPC.GIT_SYNC),

  onFileChanged: (callback: (event: VaultFileChangeEvent) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, change: VaultFileChangeEvent) =>
      callback(change)
    ipcRenderer.on(IPC.FILE_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC.FILE_CHANGED, handler)
  }
}

const settingsAPI = {
  get: (): Promise<AppConfig> => ipcRenderer.invoke(IPC.SETTINGS_GET),
  set: (key: string, value: unknown): Promise<void> =>
    ipcRenderer.invoke(IPC.SETTINGS_SET, key, value)
}

contextBridge.exposeInMainWorld('vault', vaultAPI)
contextBridge.exposeInMainWorld('settings', settingsAPI)
contextBridge.exposeInMainWorld('menuAPI', {
  onAction: (callback: (action: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, action: string) => callback(action)
    ipcRenderer.on('menu:action', listener)
    return () => ipcRenderer.removeListener('menu:action', listener)
  }
})
