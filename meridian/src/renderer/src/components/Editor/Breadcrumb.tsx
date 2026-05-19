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

export function Breadcrumb() {
  const { openTabs, activeTabPath } = useVaultStore()
  const vault = useVaultStore((s) => s.vault)
  const activeTab = openTabs.find((t) => t.path === activeTabPath)
  const activeHeading = useEditorStore((s) => s.activeHeading)

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
        background: '#1a1a1a',
        borderBottom: '1px solid #2a2a2a',
        fontSize: 12,
        color: '#555',
        overflowX: 'auto',
        whiteSpace: 'nowrap'
      }}
    >
      <span style={{ color: '#444' }}>{vault.name}</span>
      {segments.map((seg, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: '#333' }}>/</span>
          <span style={{ color: seg.isLast ? '#aaa' : '#555' }}>{seg.name}</span>
        </span>
      ))}
      {activeHeading && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: '#333' }}>›</span>
          <span style={{ color: '#7c6af7' }}>{activeHeading}</span>
        </span>
      )}
    </div>
  )
}
