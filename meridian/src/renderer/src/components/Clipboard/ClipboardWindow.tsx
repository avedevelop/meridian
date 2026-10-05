import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { i18n } from '../../i18n/index'
import { ClipboardOnboarding } from './ClipboardOnboarding'
import { ClipboardRow } from './ClipboardRow'
import { FILTERS, moveSelection, nextFilter, type FilterId } from './clipboardRows'
import { useClipboardActions } from './useClipboardActions'
import { useClipboardHistory } from './useClipboardHistory'

const drag = { WebkitAppRegion: 'drag' } as CSSProperties
const noDrag = { WebkitAppRegion: 'no-drag' } as CSSProperties
const CONFIRM_MS = 3000

export default function ClipboardWindow(): React.ReactElement {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterId>('all')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [hotkeyWarning, setHotkeyWarning] = useState<string | null>(null)

  const history = useClipboardHistory(query, filter)
  const { rows, settings, hasMore, loadMore, updateSettings } = history
  const actions = useClipboardActions(history.reload)

  const selected = useMemo(
    () => rows.find((r) => r.key === selectedKey) ?? rows[0] ?? null,
    [rows, selectedKey]
  )

  useEffect(() => {
    const focusSearch = (): void => inputRef.current?.focus()
    focusSearch()
    void window.clipboardHistory.state().then((s) => {
      if (s.language && s.language !== i18n.language) void i18n.changeLanguage(s.language)
      if (!s.hotkeyRegistered) setHotkeyWarning(s.hotkey)
    })
    return window.clipboardHistory.onShown(() => {
      setQuery('')
      setFilter('all')
      setSelectedKey(null)
      setConfirmClear(false)
      focusSearch()
    })
  }, [])

  useEffect(() => {
    if (!confirmClear) return
    const timer = setTimeout(() => setConfirmClear(false), CONFIRM_MS)
    return () => clearTimeout(timer)
  }, [confirmClear])

  const selectFilter = useCallback((next: FilterId) => {
    setFilter(next)
    setSelectedKey(null)
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()

      if (e.key === 'Escape') {
        e.preventDefault()
        if (query) setQuery('')
        else void window.clipboardHistory.hide()
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedKey(moveSelection(rows, selected?.key ?? null, e.key === 'ArrowDown' ? 1 : -1))
      } else if (e.key === 'PageDown' || e.key === 'PageUp') {
        e.preventDefault()
        setSelectedKey(moveSelection(rows, selected?.key ?? null, e.key === 'PageDown' ? 6 : -6))
      } else if (e.key === 'Tab') {
        e.preventDefault()
        selectFilter(nextFilter(filter, e.shiftKey ? -1 : 1))
      } else if (mod && /^[1-6]$/.test(e.key)) {
        e.preventDefault()
        selectFilter(FILTERS[Number(e.key) - 1])
      } else if (!selected) {
        return
      } else if (e.key === 'Enter' && mod) {
        e.preventDefault()
        void actions.save(selected, e.shiftKey ? 'new' : 'inbox')
      } else if (e.key === 'Enter') {
        e.preventDefault()
        void actions.activate(selected, e.shiftKey)
      } else if (mod && key === 'd') {
        e.preventDefault()
        void actions.save(selected, 'daily')
      } else if (mod && key === 'p') {
        e.preventDefault()
        void actions.togglePin(selected)
      } else if (e.key === 'Delete' || (e.key === 'Backspace' && mod)) {
        e.preventDefault()
        void actions.remove(selected)
      }
    },
    [rows, selected, query, filter, actions, selectFilter]
  )

  const recording = settings?.enabled === true
  const showOnboarding = settings !== null && !recording && filter !== 'snippets'

  const emptyText =
    filter === 'snippets'
      ? t('clipboard.emptySnippets')
      : query
        ? t('clipboard.emptySearch')
        : t('clipboard.empty')

  return (
    <div
      onKeyDown={handleKeyDown}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg-secondary, #1e1e1e)',
        borderRadius: 'var(--utility-radius, 7px)',
        border: '1px solid var(--border-color, #333)',
        overflow: 'hidden',
        ...drag
      }}
    >
      <div style={{ padding: '10px 12px 6px', ...noDrag }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelectedKey(null)
          }}
          placeholder={t('clipboard.search')}
          aria-label={t('clipboard.search')}
          autoFocus
          style={{
            width: '100%',
            background: 'var(--bg-primary, #141414)',
            color: 'var(--text-primary, #ccc)',
            border: '1px solid var(--border-color, #333)',
            borderRadius: 'var(--utility-radius-small, 5px)',
            padding: '8px 10px',
            fontSize: 14,
            outline: 'none',
            caretColor: 'var(--accent-color, #7c6af7)'
          }}
        />
        <div role="tablist" style={{ display: 'flex', gap: 4, marginTop: 8 }}>
          {FILTERS.map((id) => (
            <button
              key={id}
              role="tab"
              aria-selected={filter === id}
              tabIndex={-1}
              onClick={() => selectFilter(id)}
              style={{
                padding: '3px 9px',
                fontSize: 11.5,
                borderRadius: 999,
                cursor: 'pointer',
                border: '1px solid var(--border-color, #333)',
                background:
                  filter === id ? 'var(--accent-glow, rgba(124,106,247,0.18))' : 'transparent',
                color: filter === id ? 'var(--text-primary, #ccc)' : 'var(--text-secondary, #888)'
              }}
            >
              {t(`clipboard.filter.${id}`)}
            </button>
          ))}
        </div>
      </div>

      <div
        role="listbox"
        aria-label={t('clipboard.title')}
        onScroll={(e) => {
          const el = e.currentTarget
          if (hasMore && el.scrollTop + el.clientHeight > el.scrollHeight - 80) loadMore()
        }}
        style={{ flex: 1, overflowY: 'auto', ...noDrag }}
      >
        {showOnboarding ? (
          <ClipboardOnboarding onEnable={() => void updateSettings({ enabled: true })} />
        ) : rows.length === 0 ? (
          <div
            style={{
              padding: 28,
              textAlign: 'center',
              fontSize: 12.5,
              color: 'var(--text-secondary, #888)'
            }}
          >
            {emptyText}
          </div>
        ) : (
          rows.map((row) => (
            <ClipboardRow
              key={row.key}
              row={row}
              selected={row.key === selected?.key}
              onSelect={setSelectedKey}
              onActivate={(key) => {
                const r = rows.find((x) => x.key === key)
                if (r) void actions.activate(r, false)
              }}
            />
          ))
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          borderTop: '1px solid var(--border-color, #333)',
          fontSize: 11,
          color: 'var(--text-secondary, #888)',
          ...noDrag
        }}
      >
        <span
          style={{
            flex: 1,
            minWidth: 0,
            lineHeight: 1.4
          }}
        >
          {actions.message ??
            (hotkeyWarning
              ? t('clipboard.hotkeyTaken', { hotkey: hotkeyWarning })
              : t('clipboard.hints'))}
        </span>
        {recording && settings?.paused && <span>{t('clipboard.paused')}</span>}
        {recording && (
          <button
            style={linkButton}
            onClick={() => void updateSettings({ paused: !settings?.paused })}
          >
            {settings?.paused ? t('clipboard.resume') : t('clipboard.pause')}
          </button>
        )}
        <button
          style={linkButton}
          onClick={() => {
            if (!confirmClear) {
              setConfirmClear(true)
              return
            }
            setConfirmClear(false)
            void window.clipboardHistory.clear().then(history.reload)
          }}
        >
          {confirmClear ? t('clipboard.clearConfirm') : t('clipboard.clear')}
        </button>
      </div>
    </div>
  )
}

const linkButton: CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  color: 'var(--text-secondary, #888)',
  textDecoration: 'underline',
  cursor: 'pointer',
  fontSize: 11
}
