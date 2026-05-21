import { useVaultStore } from '../../store/useVaultStore'
import { useEditorStore } from '../../store/useEditorStore'
import { useSettingsStore } from '../../store/useSettingsStore'

export interface BreadcrumbSegment {
  name: string
  isLast: boolean
}

export function getSegments(relativePath: string): BreadcrumbSegment[] {
  if (!relativePath) return []
  const parts = relativePath.split('/').filter(Boolean)
  return parts.map((name, i) => ({ name, isLast: i === parts.length - 1 }))
}

interface BreadcrumbProps {
  paneId?: string
}

export function Breadcrumb({ paneId }: BreadcrumbProps) {
  const { panes, activePaneId } = useVaultStore()
  const vault = useVaultStore((s) => s.vault)
  const activeHeading = useEditorStore((s) => s.activeHeading)
  const { defaultViewMode, showPreviewPane, updateSetting } = useSettingsStore()

  const targetPaneId = paneId || activePaneId
  const pane = panes.find((p) => p.id === targetPaneId)
  const activeTab = pane ? pane.openTabs.find((t) => t.path === pane.activeTabPath) : null

  if (!activeTab || !vault) return null

  const relativePath = activeTab.path.startsWith(vault.path + '/')
    ? activeTab.path.slice(vault.path.length + 1)
    : activeTab.name

  const segments = getSegments(relativePath)
  if (segments.length === 0) return null

  return (
    <div
      style={{
        height: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        flexShrink: 0,
        background: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-color)',
        fontSize: 12,
        color: 'var(--text-secondary)',
        userSelect: 'none'
      }}
    >
      {/* Left: Path Breadcrumbs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          marginRight: 16
        }}
      >
        <span style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>{vault.name}</span>
        {segments.map((seg, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: 'var(--text-secondary)', opacity: 0.4 }}>/</span>
            <span style={{ color: seg.isLast ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
              {seg.name}
            </span>
          </span>
        ))}
        {activeHeading && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: 'var(--text-secondary)', opacity: 0.4 }}>›</span>
            <span style={{ color: 'var(--accent-color)', fontWeight: 500 }}>{activeHeading}</span>
          </span>
        )}
      </div>

      {/* Right: Mode & Layout Toggles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {/* Segmented Control for Editor View Mode: Source vs Live Preview */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-secondary)',
            padding: '2px',
            borderRadius: 6,
            border: '1px solid var(--border-color)',
            gap: 2
          }}
        >
          <button
            onClick={() => updateSetting('defaultViewMode', 'source')}
            title="Switch to Source Mode (Raw Markdown)"
            style={{
              background: defaultViewMode === 'source' ? 'var(--bg-surface)' : 'transparent',
              border: 'none',
              color: defaultViewMode === 'source' ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '2px 8px',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 10,
              fontWeight: defaultViewMode === 'source' ? 600 : 400,
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              if (defaultViewMode !== 'source') {
                e.currentTarget.style.color = 'var(--text-primary)'
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'
              }
            }}
            onMouseLeave={(e) => {
              if (defaultViewMode !== 'source') {
                e.currentTarget.style.color = 'var(--text-secondary)'
                e.currentTarget.style.background = 'transparent'
              }
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            <span>Source</span>
          </button>

          <button
            onClick={() => updateSetting('defaultViewMode', 'live-preview')}
            title="Switch to Live Preview (Rendered Inline)"
            style={{
              background: defaultViewMode === 'live-preview' ? 'var(--bg-surface)' : 'transparent',
              border: 'none',
              color: defaultViewMode === 'live-preview' ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '2px 8px',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 10,
              fontWeight: defaultViewMode === 'live-preview' ? 600 : 400,
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              if (defaultViewMode !== 'live-preview') {
                e.currentTarget.style.color = 'var(--text-primary)'
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'
              }
            }}
            onMouseLeave={(e) => {
              if (defaultViewMode !== 'live-preview') {
                e.currentTarget.style.color = 'var(--text-secondary)'
                e.currentTarget.style.background = 'transparent'
              }
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            </svg>
            <span>Live Preview</span>
          </button>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 12, background: 'var(--border-color)' }} />

        {/* Toggle split preview panel */}
        <button
          onClick={() => {
            updateSetting('showPreviewPane', !showPreviewPane)
          }}
          title={showPreviewPane ? 'Hide Split Preview' : 'Show Split Preview'}
          style={{
            background: 'transparent',
            border: 'none',
            color: showPreviewPane ? 'var(--accent-color)' : 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '2px 6px',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            fontWeight: 500,
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-surface)'
            e.currentTarget.style.color = 'var(--text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = showPreviewPane ? 'var(--accent-color)' : 'var(--text-secondary)'
          }}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="2" width="12" height="12" rx="1.5" />
            <line x1="8" y1="2" x2="8" y2="14" />
          </svg>
          <span>Split Preview</span>
        </button>
      </div>
    </div>
  )
}
