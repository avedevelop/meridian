export type ClipboardEntryKind = 'text' | 'html' | 'image' | 'files'

export interface ClipboardEntry {
  id: string
  kind: ClipboardEntryKind
  /** sha256 of the content, used for de-duplication */
  hash: string
  /** Plain text (or file names for `files`); empty for images */
  text: string
  /** Sanitized HTML for `html` entries */
  html?: string
  /** Content-addressed image blob (sha256 of the PNG), stored on disk */
  imageHash?: string
  imageWidth?: number
  imageHeight?: number
  files?: string[]
  createdAt: number
  lastUsedAt: number
  pinned: boolean
  /** Looks like a secret (key, token, card number). Previews are masked. */
  sensitive: boolean
}

/** Entry as sent to the renderer: bounded size, masked when sensitive. */
export interface ClipboardEntrySummary {
  id: string
  kind: ClipboardEntryKind
  preview: string
  length: number
  createdAt: number
  lastUsedAt: number
  pinned: boolean
  sensitive: boolean
  imageWidth?: number
  imageHeight?: number
  fileCount?: number
}

export interface ClipboardListQuery {
  query?: string
  kind?: ClipboardEntryKind | 'link'
  pinnedOnly?: boolean
  limit?: number
  cursor?: string | null
}

export interface ClipboardListResult {
  items: ClipboardEntrySummary[]
  nextCursor: string | null
  total: number
}

export interface ClipboardSettings {
  /** Recording is opt-in: nothing is captured until the user turns it on. */
  enabled: boolean
  paused: boolean
  maxEntries: number
  maxAgeDays: number
  maxImageBytes: number
  /** 'mark' keeps secrets but masks them; 'skip' never stores them. */
  sensitiveMode: 'mark' | 'skip'
}

export const DEFAULT_CLIPBOARD_SETTINGS: ClipboardSettings = {
  enabled: false,
  paused: false,
  maxEntries: 5000,
  maxAgeDays: 30,
  maxImageBytes: 5 * 1024 * 1024,
  sensitiveMode: 'mark'
}

export const CLIPBOARD_IPC = {
  LIST: 'clipboard:list',
  PIN: 'clipboard:pin',
  DELETE: 'clipboard:delete',
  CLEAR: 'clipboard:clear',
  COPY_BACK: 'clipboard:copy-back',
  GET_IMAGE: 'clipboard:get-image',
  GET_SETTINGS: 'clipboard:get-settings',
  SET_SETTINGS: 'clipboard:set-settings',
  CHANGED: 'clipboard:changed'
} as const

/** API exposed to the renderer as `window.clipboardHistory`. */
export interface ClipboardHistoryAPI {
  list(query?: ClipboardListQuery): Promise<ClipboardListResult>
  pin(id: string, pinned: boolean): Promise<boolean>
  remove(id: string): Promise<boolean>
  clear(): Promise<void>
  copyBack(id: string, opts?: { plain?: boolean }): Promise<boolean>
  getImage(id: string): Promise<string | null>
  getSettings(): Promise<ClipboardSettings>
  setSettings(patch: Partial<ClipboardSettings>): Promise<ClipboardSettings>
  onChanged(callback: () => void): () => void
}
