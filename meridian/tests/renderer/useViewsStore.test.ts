import { beforeEach, describe, expect, it } from 'vitest'
import { useViewsStore } from '../../src/renderer/src/store/useViewsStore'

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
  useViewsStore.getState().reset()
})

describe('useViewsStore', () => {
  it('loads default views for a vault', () => {
    useViewsStore.getState().load('/vault')

    expect(useViewsStore.getState().views.map((view) => view.id)).toEqual([
      'inbox',
      'projects',
      'tasks',
      'daily'
    ])
  })

  it('saves custom views scoped to a vault path', () => {
    useViewsStore.getState().load('/vault')
    useViewsStore.getState().saveView({
      id: 'work',
      name: 'Work',
      layout: 'list',
      filters: { tag: 'work' }
    })

    useViewsStore.getState().reset()
    useViewsStore.getState().load('/vault')

    expect(useViewsStore.getState().views.find((view) => view.id === 'work')?.filters).toEqual({
      tag: 'work'
    })
  })

  it('deletes custom views but preserves defaults', () => {
    useViewsStore.getState().load('/vault')
    useViewsStore.getState().saveView({
      id: 'work',
      name: 'Work',
      layout: 'list',
      filters: { tag: 'work' }
    })

    useViewsStore.getState().deleteView('work')
    useViewsStore.getState().deleteView('inbox')

    expect(useViewsStore.getState().views.find((view) => view.id === 'work')).toBeUndefined()
    expect(useViewsStore.getState().views.find((view) => view.id === 'inbox')).toBeDefined()
  })
})
