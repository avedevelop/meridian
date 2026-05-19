import { create } from 'zustand'

interface EditorStoreState {
  cursorPos: { line: number; col: number } | null
  activeHeading: string | null
  setCursorPos: (pos: { line: number; col: number } | null) => void
  setActiveHeading: (heading: string | null) => void
}

export const useEditorStore = create<EditorStoreState>((set) => ({
  cursorPos: null,
  activeHeading: null,
  setCursorPos: (cursorPos) => set({ cursorPos }),
  setActiveHeading: (activeHeading) => set({ activeHeading })
}))
