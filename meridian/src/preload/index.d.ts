import type { ClipboardHistoryAPI } from '../shared/clipboard'
import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    clipboardHistory: ClipboardHistoryAPI
  }
}
