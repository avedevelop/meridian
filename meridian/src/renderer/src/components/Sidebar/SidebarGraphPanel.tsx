import { Component, useState, useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { GraphView } from '../Graph/GraphView'

class GraphErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) {
    return { error: e.message }
  }
  render() {
    if (this.state.error)
      return (
        <div style={{ padding: 16, color: '#555', fontSize: 12 }}>
          <div style={{ marginBottom: 8, color: '#f44' }}>Graph error</div>
          <div>{this.state.error}</div>
        </div>
      )
    return this.props.children
  }
}

interface SidebarGraphPanelProps {
  onTabChange: (tab: 'files' | 'search' | 'graph' | 'calendar' | 'tasks' | 'git') => void
}

export function SidebarGraphPanel({ onTabChange }: SidebarGraphPanelProps) {
  const { t } = useTranslation()
  const [graphMode, setGraphMode] = useState<'live' | 'history'>('live')

  // Sync graph mode from GraphView
  useEffect(() => {
    const handler = (e: Event) => {
      setGraphMode((e as CustomEvent).detail as 'live' | 'history')
      // Also update button styles
      document.querySelectorAll('[data-graph-mode]').forEach((btn) => {
        const el = btn as HTMLButtonElement
        const isActive = el.dataset.graphMode === (e as CustomEvent).detail
        el.style.background = isActive ? 'var(--accent-color)' : 'transparent'
        el.style.color = isActive ? '#fff' : 'var(--text-secondary)'
      })
    }
    window.addEventListener('graph:mode-changed', handler)
    return () => window.removeEventListener('graph:mode-changed', handler)
  }, [])

  return (
    <GraphErrorBoundary>
      {/* Graph view — fills parent via absolute positioning */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 900,
          background: 'var(--bg-secondary)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* ═══ Graph Header Toolbar ═══ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 16px',
            borderBottom: '1px solid var(--border-color)',
            flexShrink: 0,
            // @ts-ignore -- Electron drag region style is not part of React CSSProperties.
            WebkitAppRegion: 'no-drag'
          }}
        >
          {/* Back button */}
          <button
            onClick={() => onTabChange('files')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 13,
              padding: '4px 8px',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            {t('sidebar.graph.back')}
          </button>

          {/* Graph Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="6" cy="6" r="2.5" stroke="var(--accent-color)" strokeWidth="1.5" />
              <circle cx="18" cy="6" r="2.5" stroke="#f5c2e7" strokeWidth="1.5" />
              <circle cx="12" cy="18" r="2.5" stroke="#a6e3a1" strokeWidth="1.5" />
              <line x1="8" y1="7" x2="16" y2="7" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              <line x1="7" y1="8" x2="11" y2="16" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              <line x1="17" y1="8" x2="13" y2="16" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            </svg>
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
              {t('sidebar.graph.title')}
            </span>
          </div>

          <div
            style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }}
          />

          {/* Compact Search */}
          <div style={{ position: 'relative', width: 180, flexShrink: 0 }}>
            <input
              type="text"
              placeholder={t('sidebar.graph.filter')}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 6,
                padding: '4px 8px 4px 24px',
                color: 'var(--text-primary)',
                fontSize: 11,
                outline: 'none',
                fontFamily: 'Inter, -apple-system, sans-serif',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-color)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
              }}
            />
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              style={{
                position: 'absolute',
                left: 7,
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none'
              }}
            >
              <circle cx="11" cy="11" r="7" stroke="var(--text-secondary)" strokeWidth="2" />
              <line
                x1="16"
                y1="16"
                x2="21"
                y2="21"
                stroke="var(--text-secondary)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Mode Switcher */}
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 8,
              padding: 2,
              display: 'flex',
              gap: 2,
              flexShrink: 0
            }}
          >
            {(
              [
                { key: 'network', label: t('sidebar.graph.network') },
                { key: 'history', label: t('sidebar.graph.history') }
              ] as const
            ).map(({ key, label }) => {
              const mode = key === 'network' ? 'live' : 'history'
              const isActive = graphMode === mode
              return (
                <button
                  key={key}
                  data-graph-mode={mode}
                  onClick={() => {
                    setGraphMode(mode)
                    window.dispatchEvent(new CustomEvent('graph:set-mode', { detail: mode }))
                  }}
                  style={{
                    background: isActive ? 'var(--accent-color)' : 'transparent',
                    border: 'none',
                    borderRadius: 6,
                    color: isActive ? '#fff' : 'var(--text-secondary)',
                    padding: '4px 12px',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 600,
                    transition: 'all 0.2s'
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Graph Content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <GraphView onFileOpen={() => onTabChange('files')} />
        </div>
      </div>
    </GraphErrorBoundary>
  )
}
