import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/types'
import type { VaultFile, VaultConfig, AppConfig } from '../shared/types'

const vaultAPI = {
  openDialog: (): Promise<VaultConfig | null> =>
    ipcRenderer.invoke(IPC.VAULT_OPEN_DIALOG),

  listFiles: (): Promise<VaultFile[]> =>
    ipcRenderer.invoke(IPC.VAULT_LIST_FILES),

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

  deleteFile: (filePath: string): Promise<void> =>
    ipcRenderer.invoke(IPC.VAULT_DELETE_FILE, filePath),

  renameFile: (oldPath: string, newName: string): Promise<string> =>
    ipcRenderer.invoke(IPC.VAULT_RENAME_FILE, oldPath, newName),

  openByPath: (vaultPath: string): Promise<VaultConfig | null> =>
    ipcRenderer.invoke(IPC.VAULT_OPEN_BY_PATH, vaultPath),

  onFileChanged: (callback: (file: VaultFile) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, file: VaultFile) => callback(file)
    ipcRenderer.on(IPC.FILE_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC.FILE_CHANGED, handler)
  },
}

const settingsAPI = {
  get: (): Promise<AppConfig> =>
    ipcRenderer.invoke(IPC.SETTINGS_GET),
  set: (key: string, value: unknown): Promise<void> =>
    ipcRenderer.invoke(IPC.SETTINGS_SET, key, value),
}

contextBridge.exposeInMainWorld('vault', vaultAPI)
contextBridge.exposeInMainWorld('settings', settingsAPI)
