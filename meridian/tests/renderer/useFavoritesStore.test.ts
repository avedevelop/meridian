import { beforeEach, describe, expect, it } from 'vitest'
import { useFavoritesStore } from '../../src/renderer/src/store/useFavoritesStore'

const memoryStorage = new Map<string, string>()

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => memoryStorage.get(key) ?? null,
      setItem: (key: string, value: string) => memoryStorage.set(key, value),
      removeItem: (key: string) => memoryStorage.delete(key),
      clear: () => memoryStorage.clear()
    },
    configurable: true
  })
  localStorage.clear()
  useFavoritesStore.getState().reset()
})

describe('useFavoritesStore', () => {
  it('starts with an empty favorites list', () => {
    useFavoritesStore.getState().loadForVault('/vault')
    expect(useFavoritesStore.getState().favorites).toEqual([])
  })

  it('toggleFavorite adds a file path', () => {
    useFavoritesStore.getState().loadForVault('/vault')
    useFavoritesStore.getState().toggleFavorite('/vault', '/vault/note.md')
    expect(useFavoritesStore.getState().favorites).toContain('/vault/note.md')
  })

  it('toggleFavorite removes a file path that is already a favorite', () => {
    useFavoritesStore.getState().loadForVault('/vault')
    useFavoritesStore.getState().toggleFavorite('/vault', '/vault/note.md')
    useFavoritesStore.getState().toggleFavorite('/vault', '/vault/note.md')
    expect(useFavoritesStore.getState().favorites).not.toContain('/vault/note.md')
  })

  it('isFavorite returns true for favorited paths and false otherwise', () => {
    useFavoritesStore.getState().loadForVault('/vault')
    useFavoritesStore.getState().toggleFavorite('/vault', '/vault/note.md')
    expect(useFavoritesStore.getState().isFavorite('/vault/note.md')).toBe(true)
    expect(useFavoritesStore.getState().isFavorite('/vault/other.md')).toBe(false)
  })

  it('persists favorites to localStorage under the vault-specific key', () => {
    useFavoritesStore.getState().loadForVault('/vault')
    useFavoritesStore.getState().toggleFavorite('/vault', '/vault/note.md')

    const raw = localStorage.getItem('meridian-favorites:/vault')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed).toContain('/vault/note.md')
  })

  it('switching vault loads that vault\'s list', () => {
    useFavoritesStore.getState().loadForVault('/vault-a')
    useFavoritesStore.getState().toggleFavorite('/vault-a', '/vault-a/a.md')

    useFavoritesStore.getState().loadForVault('/vault-b')
    useFavoritesStore.getState().toggleFavorite('/vault-b', '/vault-b/b.md')

    // switch back to vault-a
    useFavoritesStore.getState().loadForVault('/vault-a')
    expect(useFavoritesStore.getState().favorites).toContain('/vault-a/a.md')
    expect(useFavoritesStore.getState().favorites).not.toContain('/vault-b/b.md')
  })

  it('removing a non-existent favorite is safe (no throw, no mutation)', () => {
    useFavoritesStore.getState().loadForVault('/vault')
    expect(() => {
      useFavoritesStore.getState().toggleFavorite('/vault', '/vault/missing.md')
      useFavoritesStore.getState().toggleFavorite('/vault', '/vault/missing.md')
    }).not.toThrow()
    expect(useFavoritesStore.getState().favorites).toEqual([])
  })
})
