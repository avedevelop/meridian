import { create } from 'zustand'

interface SettingsState {
  fontSize: number      // editor + preview font size in px, range 13–22
  lineWidth: number     // max content width in px, range 600–960
  setFontSize: (n: number) => void
  setLineWidth: (n: number) => void
}

function loadSettings(): { fontSize: number; lineWidth: number } {
  try {
    const raw = localStorage.getItem('meridian-settings')
    if (raw) return { fontSize: 15, lineWidth: 720, ...JSON.parse(raw) }
  } catch {}
  return { fontSize: 15, lineWidth: 720 }
}

function saveSettings(state: Pick<SettingsState, 'fontSize' | 'lineWidth'>): void {
  localStorage.setItem('meridian-settings', JSON.stringify({ fontSize: state.fontSize, lineWidth: state.lineWidth }))
}

const initial = loadSettings()

export const useSettingsStore = create<SettingsState>((set) => ({
  fontSize: initial.fontSize,
  lineWidth: initial.lineWidth,

  setFontSize: (fontSize) => {
    set(s => { const next = { ...s, fontSize }; saveSettings(next); return next })
  },
  setLineWidth: (lineWidth) => {
    set(s => { const next = { ...s, lineWidth }; saveSettings(next); return next })
  },
}))
