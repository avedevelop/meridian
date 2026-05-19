import { ipcMain, dialog } from 'electron'
import { basename } from 'path'
import { IPC } from '../shared/types'
import { VaultManager } from './vault'
import { AppSettings } from './settings'

let vaultManager: VaultManager | null = null

export function registerIpcHandlers(settings: AppSettings): void {
  ipcMain.handle(IPC.VAULT_OPEN_DIALOG, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Open Vault',
      buttonLabel: 'Open Vault',
    })
    if (result.canceled || result.filePaths.length === 0) return null

    const vaultPath = result.filePaths[0]
    const name = basename(vaultPath) || 'Vault'
    vaultManager = new VaultManager(vaultPath)
    settings.addRecentVault(vaultPath, name)
    settings.setLastVault(vaultPath)
    return { path: vaultPath, name }
  })

  ipcMain.handle(IPC.VAULT_OPEN_BY_PATH, async (_event, vaultPath: string) => {
    const { stat } = await import('fs/promises')
    try {
      const info = await stat(vaultPath)
      if (!info.isDirectory()) throw new Error('Not a directory')
    } catch {
      return null
    }
    const name = basename(vaultPath) || 'Vault'
    vaultManager = new VaultManager(vaultPath)
    settings.addRecentVault(vaultPath, name)
    settings.setLastVault(vaultPath)
    return { path: vaultPath, name }
  })

  ipcMain.handle(IPC.VAULT_LIST_FILES, async () => {
    if (!vaultManager) throw new Error('No vault open')
    return vaultManager.listFiles()
  })

  ipcMain.handle(IPC.VAULT_READ_FILE, async (_event, filePath: string) => {
    if (!vaultManager) throw new Error('No vault open')
    // Reject binary file extensions before trying to read
    const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
    const binaryExts = ['png','jpg','jpeg','gif','webp','svg','ico','bmp','tiff',
      'pdf','zip','gz','tar','exe','dmg','app','bin','dll','so','dylib',
      'mp3','mp4','mov','avi','wav','flac','ogg','woff','woff2','ttf','eot']
    if (binaryExts.includes(ext)) throw new Error(`Cannot read binary file: ${ext}`)
    return vaultManager.readFile(filePath)
  })

  ipcMain.handle(IPC.VAULT_WRITE_FILE, async (_event, filePath: string, content: string) => {
    if (!vaultManager) throw new Error('No vault open')
    return vaultManager.writeFile(filePath, content)
  })

  ipcMain.handle(IPC.VAULT_CREATE_FILE, async (_event, dir: string, name: string) => {
    if (!vaultManager) throw new Error('No vault open')
    return vaultManager.createFile(dir, name)
  })

  ipcMain.handle(IPC.VAULT_DELETE_FILE, async (_event, filePath: string) => {
    if (!vaultManager) throw new Error('No vault open')
    return vaultManager.deleteFile(filePath)
  })

  ipcMain.handle(IPC.VAULT_RENAME_FILE, async (_event, oldPath: string, newName: string) => {
    console.log('[IPC] rename:', oldPath, '->', newName)
    if (!vaultManager) throw new Error('No vault open')
    try {
      const result = await vaultManager.renameFile(oldPath, newName)
      console.log('[IPC] rename success:', result)
      return result
    } catch (e) {
      console.error('[IPC] rename error:', e)
      throw e
    }
  })

  ipcMain.handle(IPC.SETTINGS_GET, async () => {
    return settings.get()
  })

  ipcMain.handle(IPC.SETTINGS_SET, async (_event, key: string, value: unknown) => {
    if (key === 'lastVault') settings.setLastVault(value as string)
  })
}

export function getVaultManager(): VaultManager | null {
  return vaultManager
}

export function setVaultManager(vm: VaultManager): void {
  vaultManager = vm
}
