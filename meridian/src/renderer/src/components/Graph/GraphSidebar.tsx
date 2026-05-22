import { useTranslation } from 'react-i18next'
import { SearchIcon, SettingsIcon, LinkIcon } from '../Icons'


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
    isPhysicsRunning: _isPhysicsRunning,
    graphStats,
    focusNode
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
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-primary)', opacity: 0.85 }}>
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
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', flexShrink: 0 }}>
          <button
            onClick={() => setActiveSidebarTab('filters')}
            style={{
              flex: 1,
              padding: '10px 0',
              border: 'none',
              background: activeSidebarTab === 'filters' ? 'rgba(255,255,255,0.03)' : 'transparent',
              color: activeSidebarTab === 'filters' ? 'var(--accent-color)' : 'var(--text-secondary)',
              borderBottom: activeSidebarTab === 'filters' ? '2px solid var(--accent-color)' : '2px solid transparent',
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
              background: activeSidebarTab === 'analytics' ? 'rgba(255,255,255,0.03)' : 'transparent',
              color: activeSidebarTab === 'analytics' ? 'var(--accent-color)' : 'var(--text-secondary)',
              borderBottom: activeSidebarTab === 'analytics' ? '2px solid var(--accent-color)' : '2px solid transparent',
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
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {activeSidebarTab === 'filters' ? (
            <>
              {/* Search Box */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', opacity: 0.6, letterSpacing: '0.04em' }}>{t('graph.search')}</span>
                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 8,
                    padding: '6px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)'
                  }}
                >
                  <SearchIcon size={13} color="var(--text-secondary)" style={{ opacity: 0.6 }} />
                  <input
                    type="text"
                    placeholder={t('graph.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: 'var(--text-primary)',
                      fontSize: 12,
                      width: '100%'
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: 10
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 11,
                    cursor: 'pointer',
                    userSelect: 'none',
                    color: 'var(--text-secondary)',
                    marginTop: 2
                  }}
                >
                  <input
                    type="checkbox"
                    checked={strictFilter}
                    onChange={(e) => setStrictFilter(e.target.checked)}
                    style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                  {t('graph.strictPhysics')}
                </label>
              </div>

              {/* Force Presets */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: 14 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', opacity: 0.6, letterSpacing: '0.04em' }}>{t('graph.physicsPresets')}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => {
                      setLinkDistance(70)
                      setRepulsionStrength(-80)
                    }}
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      borderRadius: 6,
                      fontSize: 11,
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      background: linkDistance === 70 && repulsionStrength === -80 ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {t('graph.presetDefault')}
                  </button>
                  <button
                    onClick={() => {
                      setLinkDistance(45)
                      setRepulsionStrength(-220)
                    }}
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      borderRadius: 6,
                      fontSize: 11,
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      background: linkDistance === 45 && repulsionStrength === -220 ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {t('graph.presetDense')}
                  </button>
                  <button
                    onClick={() => {
                      setLinkDistance(125)
                      setRepulsionStrength(-40)
                    }}
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      borderRadius: 6,
                      fontSize: 11,
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      background: linkDistance === 125 && repulsionStrength === -40 ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {t('graph.presetGalaxy')}
                  </button>
                </div>
              </div>

              {/* Interactive Legend Filters */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: 14 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', opacity: 0.6, letterSpacing: '0.04em' }}>{t('graph.legend')}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { key: 'canvas', label: t('graph.legendCanvases'), color: GROUP_COLORS.canvas },
                    { key: 'project', label: t('graph.legendProjects'), color: GROUP_COLORS.project },
                    { key: 'daily', label: t('graph.legendDaily'), color: GROUP_COLORS.daily },
                    { key: 'connected', label: t('graph.legendConnected'), color: GROUP_COLORS.connected },
                    { key: 'orphan', label: t('graph.legendOrphan'), color: GROUP_COLORS.orphan }
                  ].map((cat) => {
                    const isDisabled = disabledCategories.has(cat.key)
                    return (
                      <button
                        key={cat.key}
                        onClick={() => toggleCategory(cat.key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          borderRadius: 6,
                          background: isDisabled ? 'rgba(255,255,255,0.01)' : 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          cursor: 'pointer',
                          color: isDisabled ? 'var(--text-secondary)' : 'var(--text-primary)',
                          opacity: isDisabled ? 0.45 : 1,
                          textAlign: 'left',
                          fontSize: 12,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color }} />
                          <span>{cat.label}</span>
                        </div>
                        <span style={{ fontSize: 10, color: isDisabled ? 'var(--text-secondary)' : 'var(--accent-color)', fontWeight: 600 }}>
                          {isDisabled ? t('graph.hidden') : t('graph.visible')}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Force Sliders */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: 14 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', opacity: 0.6, letterSpacing: '0.04em' }}>{t('graph.physicsForces')}</span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{t('graph.linkDistance')}</span>
                    <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>{linkDistance}px</span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={200}
                    value={linkDistance}
                    onChange={(e) => setLinkDistance(Number(e.target.value))}
                    style={{ accentColor: 'var(--accent-color)', cursor: 'pointer', height: 3 }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{t('graph.repulsionForce')}</span>
                    <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>{Math.abs(repulsionStrength)}</span>
                  </div>
                  <input
                    type="range"
                    min={-300}
                    max={-20}
                    value={repulsionStrength}
                    onChange={(e) => setRepulsionStrength(Number(e.target.value))}
                    style={{ accentColor: 'var(--accent-color)', cursor: 'pointer', height: 3 }}
                  />
                </div>
              </div>

              {/* Display Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: 14 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', opacity: 0.6, letterSpacing: '0.04em' }}>{t('graph.displaySettings')}</span>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    cursor: 'pointer',
                    userSelect: 'none',
                    color: 'var(--text-primary)'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={showArrows}
                    onChange={(e) => setShowArrows(e.target.checked)}
                    style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                  {t('graph.linkArrows')}
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{t('graph.textSize')}</span>
                    <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>{textSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={20}
                    value={textSize}
                    onChange={(e) => setTextSize(Number(e.target.value))}
                    style={{ accentColor: 'var(--accent-color)', cursor: 'pointer', height: 3 }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{t('graph.linkThickness')}</span>
                    <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>{linkThickness}px</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={linkThickness}
                    onChange={(e) => setLinkThickness(Number(e.target.value))}
                    style={{ accentColor: 'var(--accent-color)', cursor: 'pointer', height: 3 }}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Network Stats Card */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', opacity: 0.6, letterSpacing: '0.04em' }}>{t('graph.metrics')}</span>
                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 10,
                    padding: 14,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.7 }}>{t('graph.totalNodes')}</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{graphStats.totalNodes}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.7 }}>{t('graph.totalLinks')}</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{graphStats.totalLinks}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.7 }}>{t('graph.orphanNodes')}</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{graphStats.orphans}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.7 }}>{t('graph.density')}</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{graphStats.density}</span>
                  </div>
                </div>
              </div>

              {/* Top Hubs List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: 14 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', opacity: 0.6, letterSpacing: '0.04em' }}>{t('graph.topHubs')}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {graphStats.hubs.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', opacity: 0.6, padding: 8 }}>
                      {t('graph.noConnections')}
                    </div>
                  ) : (
                    graphStats.hubs.map((hub, index) => (
                      <button
                        key={hub.id}
                        onClick={() => focusNode(hub.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          borderRadius: 8,
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                          e.currentTarget.style.borderColor = 'var(--accent-color)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: '80%' }}>
                          <span style={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            color: 'var(--text-secondary)'
                          }}>
                            {index + 1}
                          </span>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 500,
                              color: 'var(--text-primary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {hub.name}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <LinkIcon size={11} color="var(--accent-color)" />
                          <span style={{ fontSize: 11, color: 'var(--accent-color)', fontWeight: 600 }}>
                            {hub.degree}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
