import { useVaultStore } from '../../store/useVaultStore'
import { useEditorStore } from '../../store/useEditorStore'

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
        padding: '0 16px',
        gap: 4,
        flexShrink: 0,
        background: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-color)',
        fontSize: 12,
        color: 'var(--text-secondary)',
        overflowX: 'auto',
        whiteSpace: 'nowrap'
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
  )
}
