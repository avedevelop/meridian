import { create } from 'zustand'

interface FavoritesState {
  vaultPath: string | null
  favorites: string[]
  loadForVault: (vaultPath: string) => void
  toggleFavorite: (vaultPath: string, filePath: string) => void
  isFavorite: (filePath: string) => boolean
  reset: () => void
}

function storageKey(vaultPath: string): string {
  return `meridian-favorites:${vaultPath}`
}

function readFavorites(vaultPath: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey(vaultPath))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === 'string')
  } catch {
    return []
  }
}

function writeFavorites(vaultPath: string, favorites: string[]): void {
  localStorage.setItem(storageKey(vaultPath), JSON.stringify(favorites))
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  vaultPath: null,
  favorites: [],

  loadForVault: (vaultPath) => {
    set({ vaultPath, favorites: readFavorites(vaultPath) })
  },

  toggleFavorite: (vaultPath, filePath) => {
    const { favorites } = get()
    const next = favorites.includes(filePath)
      ? favorites.filter((f) => f !== filePath)
      : [...favorites, filePath]
    writeFavorites(vaultPath, next)
    set({ favorites: next })
  },

  isFavorite: (filePath) => {
    return get().favorites.includes(filePath)
  },

  reset: () => set({ vaultPath: null, favorites: [] })
}))
