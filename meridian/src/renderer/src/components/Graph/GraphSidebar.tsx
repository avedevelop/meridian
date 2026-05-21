import { SearchIcon, SettingsIcon, LinkIcon, TrashIcon } from '../Icons'
import { useSettingsStore, ColorGroupRule } from '../../store/useSettingsStore'

export const PREMIUM_COLORS = [
  '#f38ba8', // Red
  '#fab387', // Orange
  '#f9e2af', // Yellow
  '#a6e3a1', // Green
  '#94e2d5', // Teal
  '#89b4fa', // Blue
  '#b4befe', // Lavender
  '#cba6f7', // Mauve
  '#f5c2e7', // Pink
  '#eba0ac'  // Maroon
]

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
          title="Open Graph Settings & Analytics"
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
            GRAPH ANALYSIS
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
            Filters & Forces
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
            Insights & Hubs
          </button>
        </div>

        {/* Sidebar Scrollable Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {activeSidebarTab === 'filters' ? (
            <>
              {/* Search Box */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', opacity: 0.6, letterSpacing: '0.04em' }}>SEARCH VAULT</span>
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
                    placeholder="Search note nodes..."
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
                  Strict Physics Subgraphing
                </label>
              </div>

              {/* Force Presets */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: 14 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', opacity: 0.6, letterSpacing: '0.04em' }}>PHYSICS PRESETS</span>
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
                    Default
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
                    Dense
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
                    Galaxy
                  </button>
                </div>
              </div>

              {/* Interactive Legend Filters */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: 14 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', opacity: 0.6, letterSpacing: '0.04em' }}>INTERACTIVE LEGEND</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { key: 'canvas', label: 'Canvases', color: GROUP_COLORS.canvas },
                    { key: 'project', label: 'Projects', color: GROUP_COLORS.project },
                    { key: 'daily', label: 'Daily Notes', color: GROUP_COLORS.daily },
                    { key: 'connected', label: 'Connected Notes', color: GROUP_COLORS.connected },
                    { key: 'orphan', label: 'Orphan Notes', color: GROUP_COLORS.orphan }
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
                          {isDisabled ? 'HIDDEN' : 'VISIBLE'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Color Groups Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', opacity: 0.6, letterSpacing: '0.04em' }}>COLOR GROUPS</span>
                  <button
                    onClick={() => {
                      const newRule: ColorGroupRule = {
                        id: Math.random().toString(36).substring(2, 9),
                        type: 'wildcard',
                        value: '',
                        color: PREMIUM_COLORS[Math.floor(Math.random() * PREMIUM_COLORS.length)]
                      }
                      const currentGroups = useSettingsStore.getState().colorGroups || []
                      useSettingsStore.getState().updateSetting('colorGroups', [...currentGroups, newRule])
                    }}
                    style={{
                      background: 'var(--accent-glow)',
                      border: '1px solid var(--accent-color)',
                      color: 'var(--text-primary)',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    + Add Rule
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                  {((useSettingsStore((s) => s.colorGroups) || []) as ColorGroupRule[]).map((rule) => {
                    const updateRule = (updated: Partial<ColorGroupRule>) => {
                      const currentGroups = useSettingsStore.getState().colorGroups || []
                      const nextGroups = currentGroups.map((rg) => rg.id === rule.id ? { ...rg, ...updated } : rg)
                      useSettingsStore.getState().updateSetting('colorGroups', nextGroups)
                    }

                    const removeRule = () => {
                      const currentGroups = useSettingsStore.getState().colorGroups || []
                      const nextGroups = currentGroups.filter((rg) => rg.id !== rule.id)
                      useSettingsStore.getState().updateSetting('colorGroups', nextGroups)
                    }

                    return (
                      <div
                        key={rule.id}
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: 8,
                          padding: 10,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8
                        }}
                      >
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <select
                            value={rule.type}
                            onChange={(e) => updateRule({ type: e.target.value as any })}
                            style={{
                              background: 'var(--bg-surface)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 4,
                              color: 'var(--text-primary)',
                              fontSize: 11,
                              padding: '2px 4px',
                              outline: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="wildcard">Path wildcard</option>
                            <option value="tag">Tag</option>
                            <option value="pattern">Filename pattern</option>
                          </select>

                          <input
                            type="text"
                            placeholder={
                              rule.type === 'wildcard'
                                ? 'e.g. /daily/*'
                                : rule.type === 'tag'
                                ? 'e.g. #todo'
                                : 'e.g. draft'
                            }
                            value={rule.value}
                            onChange={(e) => updateRule({ value: e.target.value })}
                            style={{
                              flex: 1,
                              background: 'rgba(0,0,0,0.2)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 4,
                              color: 'var(--text-primary)',
                              fontSize: 11,
                              padding: '2px 6px',
                              outline: 'none'
                            }}
                          />

                          <button
                            onClick={removeRule}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              padding: 2,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'color 0.15s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#ff6b6b'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                          >
                            <TrashIcon size={12} />
                          </button>
                        </div>

                        {/* Color selection row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {PREMIUM_COLORS.map((c) => (
                            <button
                              key={c}
                              onClick={() => updateRule({ color: c })}
                              style={{
                                width: 14,
                                height: 14,
                                borderRadius: '50%',
                                background: c,
                                border: rule.color === c ? '2px solid #ffffff' : 'none',
                                cursor: 'pointer',
                                padding: 0,
                                boxShadow: rule.color === c ? '0 0 4px rgba(255,255,255,0.5)' : 'none',
                                transform: rule.color === c ? 'scale(1.1)' : 'scale(1)',
                                transition: 'transform 0.15s ease'
                              }}
                            />
                          ))}

                          {/* Custom color picker */}
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
                            <input
                              type="color"
                              value={rule.color}
                              onChange={(e) => updateRule({ color: e.target.value })}
                              style={{
                                width: 18,
                                height: 18,
                                border: 'none',
                                padding: 0,
                                background: 'transparent',
                                cursor: 'pointer'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {(!useSettingsStore((s) => s.colorGroups) || useSettingsStore((s) => s.colorGroups).length === 0) && (
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', opacity: 0.5, textAlign: 'center', padding: '6px 0' }}>
                      No color group rules yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Force Sliders */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: 14 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', opacity: 0.6, letterSpacing: '0.04em' }}>PHYSICS FORCES</span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Link distance</span>
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
                    <span style={{ color: 'var(--text-secondary)' }}>Repulsion force</span>
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
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', opacity: 0.6, letterSpacing: '0.04em' }}>DISPLAY SETTINGS</span>

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
                  Link direction arrows
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Text size</span>
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
                    <span style={{ color: 'var(--text-secondary)' }}>Link thickness</span>
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
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', opacity: 0.6, letterSpacing: '0.04em' }}>VAULT NETWORK METRICS</span>
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
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.7 }}>TOTAL NOTES</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{graphStats.totalNodes}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.7 }}>TOTAL LINKS</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{graphStats.totalLinks}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.7 }}>ORPHAN NOTES</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{graphStats.orphans}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.7 }}>DENSITY</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{graphStats.density}</span>
                  </div>
                </div>
              </div>

              {/* Top Hubs List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: 14 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', opacity: 0.6, letterSpacing: '0.04em' }}>TOP HUBS (MOST CONNECTED)</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {graphStats.hubs.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', opacity: 0.6, padding: 8 }}>
                      No connections in network yet.
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
