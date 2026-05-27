import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { applySavedView, createSavedView, extractViewNote, type ViewNote } from '@shared/views'
import { useLinkStore } from '../../store/useLinkStore'
import { useVaultStore } from '../../store/useVaultStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'
import { useViewsStore } from '../../store/useViewsStore'
import { FileIcon } from './FileIcon'

function noteLabel(note: ViewNote): string {
  return note.name.replace(/\.md$/i, '')
}

function viewLabel(id: string, fallback: string, t: (key: string, options?: any) => string): string {
  const localized = t(`views.defaults.${id}`, { defaultValue: fallback })
  return localized.startsWith('views.defaults.') ? fallback : localized
}

export function ViewsPanel() {
  const { t } = useTranslation()
  const { vault } = useVaultStore()
  const { openFile } = useVaultBridge()
  const indexVersion = useLinkStore((state) => state.indexVersion)
  const allFiles = useMemo(() => useLinkStore.getState().allFiles(), [indexVersion])
  const { views, activeViewId, load, saveView, deleteView, setActiveView } = useViewsStore()
  const [notes, setNotes] = useState<ViewNote[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState('')

  useEffect(() => {
    if (vault) load(vault.path)
  }, [vault, load])

  useEffect(() => {
    if (!vault) return
    let active = true
    setLoading(true)

    Promise.all(
      allFiles
        .filter((path) => path.toLowerCase().endsWith('.md'))
        .map(async (path) => {
          const name = path.split(/[\\/]/).pop() ?? ''
          try {
            const content = await window.vault.readFile(path)
            return extractViewNote(path, name, content)
          } catch {
            return null
          }
        })
    )
      .then((items) => {
        if (active) setNotes(items.filter((item): item is ViewNote => item !== null))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [allFiles, vault])

  const activeView = views.find((view) => view.id === activeViewId) ?? views[0]
  const result = useMemo(() => {
    if (!activeView) return []
    return applySavedView(notes, {
      ...activeView,
      filters: {
        ...activeView.filters,
        ...(tag.trim() ? { tag: tag.trim() } : {})
      }
    }).filter((note) => {
      const needle = query.trim().toLowerCase()
      if (!needle) return true
      return (
        noteLabel(note).toLowerCase().includes(needle) ||
        note.tags.some((item) => item.toLowerCase().includes(needle))
      )
    })
  }, [activeView, notes, query, tag])

  const handleSaveCurrent = () => {
    const name = window.prompt(t('views.savePrompt'))
    if (!name?.trim()) return
    const id = `custom-${Date.now()}`
    saveView(
      createSavedView(id, name.trim(), {
        ...activeView?.filters,
        ...(tag.trim() ? { tag: tag.trim() } : {})
      })
    )
    setActiveView(id)
  }

  if (!vault) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '10px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {views.map((view) => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              style={{
                minHeight: 28,
                padding: '5px 8px',
                borderRadius: 6,
                border: '1px solid var(--border-color)',
                background: activeViewId === view.id ? 'var(--accent-glow)' : 'var(--bg-surface)',
                color: activeViewId === view.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              {viewLabel(view.id, view.name, t)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('views.search')}
            style={{
              flex: 1,
              minWidth: 0,
              padding: '6px 9px',
              borderRadius: 6,
              border: 'none',
              outline: 'none',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: 12
            }}
          />
          <button
            onClick={handleSaveCurrent}
            title={t('views.saveCurrent')}
            style={{
              minWidth: 32,
              borderRadius: 6,
              border: '1px solid var(--border-color)',
              background: 'var(--accent-glow)',
              color: 'var(--accent-color)',
              cursor: 'pointer'
            }}
          >
            +
          </button>
        </div>
        <input
          value={tag}
          onChange={(event) => setTag(event.target.value)}
          placeholder={t('views.tagFilter')}
          style={{
            width: '100%',
            padding: '6px 9px',
            borderRadius: 6,
            border: 'none',
            outline: 'none',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontSize: 12
          }}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
        {loading && result.length === 0 ? (
          <div style={{ padding: 18, color: 'var(--text-secondary)', fontSize: 12 }}>
            {t('common.loading')}
          </div>
        ) : result.length === 0 ? (
          <div style={{ padding: 18, color: 'var(--text-secondary)', fontSize: 12 }}>
            {activeViewId === 'inbox' ? t('views.emptyInbox') : t('views.empty')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {result.map((note) => (
              <button
                key={note.path}
                onClick={() => openFile(note.path, note.name)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: 9,
                  borderRadius: 7,
                  border: '1px solid var(--border-color)',
                  background: 'rgba(255,255,255,0.02)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <FileIcon name={note.name} isDirectory={false} />
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 13 }}>{noteLabel(note)}</span>
                  <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 11 }}>
                    {[
                      note.type,
                      note.date,
                      note.taskCounts.pending > 0
                        ? t('views.pendingTasks', { count: note.taskCounts.pending })
                        : null
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {activeView && !activeView.builtIn && (
        <button
          onClick={() => deleteView(activeView.id)}
          style={{
            margin: 10,
            padding: '7px 0',
            borderRadius: 6,
            border: '1px solid var(--border-color)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: 12
          }}
        >
          {t('views.deleteCurrent')}
        </button>
      )}
    </div>
  )
}
