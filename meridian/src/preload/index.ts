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

  deleteFile: (filePath: string): Promise<void> =>
    ipcRenderer.invoke(IPC.VAULT_DELETE_FILE, filePath),

  onFileChanged: (callback: (file: VaultFile) => void) => {
    ipcRenderer.on(IPC.FILE_CHANGED, (_event, file) => callback(file))
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
