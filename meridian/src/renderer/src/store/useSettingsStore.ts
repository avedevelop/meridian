import { create } from 'zustand'

export interface SettingsState {
  // Existing Editor settings
  fontSize: number // editor + preview font size in px, range 13–22
  lineWidth: number // max content width in px, range 600–960
  readableLineLength: boolean
  lineWrapping: boolean
  lineNumbers: boolean
  tabSize: number // 2 | 4 | 8
  bracketMatching: boolean
  closeBrackets: boolean

  // New Editor settings
  fontFamily: 'Georgia' | 'Inter' | 'Fira Code' | 'system-ui' | 'JetBrains Mono'
  fontWeight: '300' | '400' | '500' | '700'
  lineHeight: number // 1.2 to 2.4

  // New Auto-Save Settings
  autoSaveTrigger: 'off' | 'afterDelay' | 'onFocusChange' | 'onWindowBlur'
  autoSaveDelay: number // in seconds: 1, 5, 30
  closeBehavior: 'ask' | 'save' | 'discard'

  // Files & Links
  linkFormat: 'wiki' | 'markdown'
  newNotesFolder: string

  // Canvas
  snapToGrid: boolean
  gridSize: number // 5-30
  connectionLineStyle: 'curved' | 'straight' | 'orthogonal'
  defaultCardColor: string // hex

  // Appearance
  accentColor: 'purple' | 'blue' | 'green' | 'orange' | 'red'
  theme: 'dark' | 'midnight' | 'indigo' | 'cyberpunk' | 'forest' | 'nord' | 'dracula' | 'obsidian'
  sidebarSide: 'left' | 'right'

  // Plugins
  pluginsEnabled: {
    dailyNotes: boolean
    wordCounter: boolean
    slashCommands: boolean
    tagsPanel: boolean
    backlinksPanel: boolean
    tocPanel: boolean
    gitBackup: boolean
    excalidraw: boolean
  }

  // Actions
  setFontSize: (n: number) => void
  setLineWidth: (n: number) => void
  updateSetting: <
    K extends keyof Omit<
      SettingsState,
      'setFontSize' | 'setLineWidth' | 'updateSetting' | 'resetToDefault' | 'togglePlugin' | 'loadFromDisk'
    >
  >(
    key: K,
    value: SettingsState[K]
  ) => void
  togglePlugin: (pluginId: keyof SettingsState['pluginsEnabled']) => void
  resetToDefault: () => void
  loadFromDisk: () => Promise<void>
}

const DEFAULTS: Omit<
  SettingsState,
  'setFontSize' | 'setLineWidth' | 'updateSetting' | 'resetToDefault' | 'togglePlugin' | 'loadFromDisk'
> = {
  fontSize: 15,
  lineWidth: 720,
  readableLineLength: true,
  lineWrapping: true,
  lineNumbers: true,
  tabSize: 4,
  bracketMatching: true,
  closeBrackets: true,
  fontFamily: 'Georgia',
  fontWeight: '400',
  lineHeight: 1.8,
  autoSaveTrigger: 'afterDelay',
  autoSaveDelay: 5,
  closeBehavior: 'ask',
  linkFormat: 'wiki',
  newNotesFolder: '',
  snapToGrid: true,
  gridSize: 10,
  connectionLineStyle: 'curved',
  defaultCardColor: '#7c6af7',
  accentColor: 'purple',
  theme: 'dark',
  sidebarSide: 'left',
  pluginsEnabled: {
    dailyNotes: true,
    wordCounter: true,
    slashCommands: true,
    tagsPanel: true,
    backlinksPanel: true,
    tocPanel: true,
    gitBackup: false,
    excalidraw: false
  }
}

function loadSettings(): typeof DEFAULTS {
  try {
    const raw = localStorage.getItem('meridian-settings')
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        ...DEFAULTS,
        ...parsed,
        pluginsEnabled: {
          ...DEFAULTS.pluginsEnabled,
          ...(parsed.pluginsEnabled || {})
        }
      }
    }
  } catch {
    // Ignore malformed localStorage
  }
  return DEFAULTS
}

function saveSettings(state: any): void {
  const toSave = { ...state }
  // Dynamically strip out functions before saving
  Object.keys(toSave).forEach((key) => {
    if (typeof toSave[key] === 'function') {
      delete toSave[key]
    }
  })
  localStorage.setItem('meridian-settings', JSON.stringify(toSave))
  if (window.settings && typeof window.settings.setPreferences === 'function') {
    window.settings.setPreferences(toSave).catch((e) => {
      console.error('Failed to save preferences to disk:', e)
    })
  }
}

const initial = loadSettings()

export const useSettingsStore = create<SettingsState>((set) => ({
  ...initial,

  setFontSize: (n) => {
    const fontSize = Math.max(13, Math.min(22, n))
    set((s) => {
      const next = { ...s, fontSize }
      const toSave = { ...next }
      delete (toSave as any).setFontSize
      delete (toSave as any).setLineWidth
      delete (toSave as any).updateSetting
      delete (toSave as any).resetToDefault
      delete (toSave as any).togglePlugin
      saveSettings(toSave)
      return next
    })
  },

  setLineWidth: (n) => {
    const lineWidth = Math.max(600, Math.min(960, n))
    set((s) => {
      const next = { ...s, lineWidth }
      const toSave = { ...next }
      delete (toSave as any).setFontSize
      delete (toSave as any).setLineWidth
      delete (toSave as any).updateSetting
      delete (toSave as any).resetToDefault
      delete (toSave as any).togglePlugin
      saveSettings(toSave)
      return next
    })
  },

  updateSetting: (key, value) => {
    set((s) => {
      const next = { ...s, [key]: value }
      const toSave = { ...next }
      delete (toSave as any).setFontSize
      delete (toSave as any).setLineWidth
      delete (toSave as any).updateSetting
      delete (toSave as any).resetToDefault
      delete (toSave as any).togglePlugin
      saveSettings(toSave)
      return next
    })
  },

  togglePlugin: (pluginId) => {
    set((s) => {
      const next = {
        ...s,
        pluginsEnabled: {
          ...s.pluginsEnabled,
          [pluginId]: !s.pluginsEnabled[pluginId]
        }
      }
      const toSave = { ...next }
      delete (toSave as any).setFontSize
      delete (toSave as any).setLineWidth
      delete (toSave as any).updateSetting
      delete (toSave as any).resetToDefault
      delete (toSave as any).togglePlugin
      saveSettings(toSave)
      return next
    })
  },

  resetToDefault: () => {
    set((s) => {
      const next = { ...s, ...DEFAULTS }
      saveSettings(DEFAULTS)
      return next
    })
  },

  loadFromDisk: async () => {
    try {
      if (window.settings && typeof window.settings.getPreferences === 'function') {
        const prefs = await window.settings.getPreferences()
        if (prefs && Object.keys(prefs).length > 0) {
          set((s) => ({
            ...s,
            ...prefs,
            pluginsEnabled: {
              ...s.pluginsEnabled,
              ...((prefs.pluginsEnabled as any) || {})
            }
          }))
        }
      }
    } catch (e) {
      console.error('Failed to load preferences from disk:', e)
    }
  }
}))
