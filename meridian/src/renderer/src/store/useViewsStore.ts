import { create } from 'zustand'
import { getDefaultSavedViews, type SavedView } from '@shared/views'

interface ViewsState {
  vaultPath: string | null
  views: SavedView[]
  load: (vaultPath: string) => void
  saveView: (view: SavedView) => void
  deleteView: (id: string) => void
  reset: () => void
}

function storageKey(vaultPath: string): string {
  return `meridian-views:${vaultPath}`
}

function readCustomViews(vaultPath: string): SavedView[] {
  try {
    const raw = localStorage.getItem(storageKey(vaultPath))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((view): view is SavedView => Boolean(view?.id && view?.name))
  } catch {
    return []
  }
}

function writeCustomViews(vaultPath: string, views: SavedView[]): void {
  localStorage.setItem(
    storageKey(vaultPath),
    JSON.stringify(views.filter((view) => !view.builtIn))
  )
}

function mergedViews(custom: SavedView[]): SavedView[] {
  const defaults = getDefaultSavedViews()
  const byId = new Map(defaults.map((view) => [view.id, view]))
  for (const view of custom) byId.set(view.id, { ...view, builtIn: false })
  return [...byId.values()]
}

export const useViewsStore = create<ViewsState>((set, get) => ({
  vaultPath: null,
  views: getDefaultSavedViews(),

  load: (vaultPath) => {
    set({ vaultPath, views: mergedViews(readCustomViews(vaultPath)) })
  },

  saveView: (view) => {
    const { vaultPath, views } = get()
    if (!vaultPath || view.builtIn) return
    const next = mergedViews([...views.filter((item) => item.id !== view.id), view])
    writeCustomViews(vaultPath, next)
    set({ views: next })
  },

  deleteView: (id) => {
    const { vaultPath, views } = get()
    if (!vaultPath) return
    const target = views.find((view) => view.id === id)
    if (target?.builtIn) return
    const next = mergedViews(views.filter((view) => view.id !== id))
    writeCustomViews(vaultPath, next)
    set({ views: next })
  },

  reset: () => set({ vaultPath: null, views: getDefaultSavedViews() })
}))
