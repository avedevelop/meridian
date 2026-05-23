import { useTranslation } from 'react-i18next'
import { SettingsIcon } from '../Icons'
import { GraphSidebarFilters } from './GraphSidebarFilters'
import { GraphSidebarAnalytics } from './GraphSidebarAnalytics'

export const GROUP_COLORS = {
  canvas: '#b4befe', // Lavender
  project: '#f5c2e7', // Pink
  daily: '#a6e3a1', // Green
  connected: '#89b4fa', // Blue
  orphan: '#5c5f77' // Gray
}

interface GraphSidebarProps {
  isSettingsOpen: boolean
  setIsSettingsOpen: (v: boolean) => void
  activeSidebarTab: 'filters' | 'analytics'
  setActiveSidebarTab: (t: 'filters' | 'analytics') => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  strictFilter: boolean
  setStrictFilter: (v: boolean) => void
  disabledCategories: Set<string>
  toggleCategory: (cat: string) => void
  linkDistance: number
  setLinkDistance: (v: number) => void
  repulsionStrength: number
  setRepulsionStrength: (v: number) => void
  showArrows: boolean
  setShowArrows: (v: boolean) => void
  textSize: number
  setTextSize: (v: number) => void
  linkThickness: number
  setLinkThickness: (v: number) => void
  isPhysicsRunning: boolean
  graphStats: {
    totalNodes: number
    totalLinks: number
    orphans: number
    density: string
    hubs: Array<{ id: string; name: string; degree: number }>
  }
  focusNode: (id: string) => void
  labelMode: 'auto' | 'hover' | 'all'
  setLabelMode: (v: 'auto' | 'hover' | 'all') => void
  showGlow: boolean
  setShowGlow: (v: boolean) => void
  handleResetView: () => void
}

export function GraphSidebar(props: GraphSidebarProps) {
  const { t } = useTranslation()
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    activeSidebarTab,
    setActiveSidebarTab,
    searchQuery,
    setSearchQuery,
    strictFilter,
    setStrictFilter,
    disabledCategories,
    toggleCategory,
    linkDistance,
    setLinkDistance,
    repulsionStrength,
    setRepulsionStrength,
    showArrows,
    setShowArrows,
    textSize,
    setTextSize,
    linkThickness,
    setLinkThickness,
    graphStats,
    focusNode,
    labelMode,
    setLabelMode,
    showGlow,
    setShowGlow,
    handleResetView
  } = props

  return (
    <>
      {/* Sidebar Toggle Button (if sidebar is closed) */}
      {!isSettingsOpen && (
        <button
          onClick={() => setIsSettingsOpen(true)}
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 100,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-primary)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(8px)'
          }}
          title={t('graph.openSettings')}
        >
          <SettingsIcon size={16} />
        </button>
      )}

      {/* Slide-out Glassmorphic Sidebar */}
      <div
        className="graph-sidebar"
        style={{
          position: 'absolute',
          top: 12,
          bottom: 12,
          left: 12,
          width: 320,
          zIndex: 100,
          background: 'rgba(20, 20, 26, 0.78)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 12,
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: isSettingsOpen ? 'translateX(0)' : 'translateX(-340px)',
          opacity: isSettingsOpen ? 1 : 0,
          pointerEvents: isSettingsOpen ? 'auto' : 'none'
        }}
      >
        {/* Sidebar Header */}
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.15)'
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: 'var(--text-primary)',
              opacity: 0.85
            }}
          >
            {t('graph.title')}
          </span>
          <button
            onClick={() => setIsSettingsOpen(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 14,
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s ease'
            }}
          >
            ✕
          </button>
        </div>

        {/* Sidebar Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            flexShrink: 0
          }}
        >
          <button
            onClick={() => setActiveSidebarTab('filters')}
            style={{
              flex: 1,
              padding: '10px 0',
              border: 'none',
              background: activeSidebarTab === 'filters' ? 'rgba(255,255,255,0.03)' : 'transparent',
              color:
                activeSidebarTab === 'filters' ? 'var(--accent-color)' : 'var(--text-secondary)',
              borderBottom:
                activeSidebarTab === 'filters'
                  ? '2px solid var(--accent-color)'
                  : '2px solid transparent',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {t('graph.filters')}
          </button>
          <button
            onClick={() => setActiveSidebarTab('analytics')}
            style={{
              flex: 1,
              padding: '10px 0',
              border: 'none',
              background:
                activeSidebarTab === 'analytics' ? 'rgba(255,255,255,0.03)' : 'transparent',
              color:
                activeSidebarTab === 'analytics' ? 'var(--accent-color)' : 'var(--text-secondary)',
              borderBottom:
                activeSidebarTab === 'analytics'
                  ? '2px solid var(--accent-color)'
                  : '2px solid transparent',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {t('graph.insights')}
          </button>
        </div>

        {/* Sidebar Scrollable Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 18
          }}
        >
          {activeSidebarTab === 'filters' ? (
            <GraphSidebarFilters
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              strictFilter={strictFilter}
              setStrictFilter={setStrictFilter}
              disabledCategories={disabledCategories}
              toggleCategory={toggleCategory}
              linkDistance={linkDistance}
              setLinkDistance={setLinkDistance}
              repulsionStrength={repulsionStrength}
              setRepulsionStrength={setRepulsionStrength}
              showArrows={showArrows}
              setShowArrows={setShowArrows}
              textSize={textSize}
              setTextSize={setTextSize}
              linkThickness={linkThickness}
              setLinkThickness={setLinkThickness}
              labelMode={labelMode}
              setLabelMode={setLabelMode}
              showGlow={showGlow}
              setShowGlow={setShowGlow}
              handleResetView={handleResetView}
            />
          ) : (
            <GraphSidebarAnalytics graphStats={graphStats} focusNode={focusNode} />
          )}
        </div>
      </div>
    </>
  )
}
