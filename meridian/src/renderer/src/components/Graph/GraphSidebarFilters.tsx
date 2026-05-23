import { useTranslation } from 'react-i18next'
import { SearchIcon } from '../Icons'
import { GROUP_COLORS } from './GraphSidebar'

interface GraphSidebarFiltersProps {
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
  labelMode: 'auto' | 'hover' | 'all'
  setLabelMode: (v: 'auto' | 'hover' | 'all') => void
  showGlow: boolean
  setShowGlow: (v: boolean) => void
}

export function GraphSidebarFilters({
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
  labelMode,
  setLabelMode,
  showGlow,
  setShowGlow
}: GraphSidebarFiltersProps) {
  const { t } = useTranslation()

  return (
    <>
      {/* Search Box */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--text-secondary)',
            opacity: 0.6,
            letterSpacing: '0.04em'
          }}
        >
          {t('graph.search')}
        </span>
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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          paddingTop: 14
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--text-secondary)',
            opacity: 0.6,
            letterSpacing: '0.04em'
          }}
        >
          {t('graph.physicsPresets')}
        </span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setLinkDistance(100)
              setRepulsionStrength(-160)
            }}
            style={{
              flex: '1 1 calc(50% - 3px)',
              padding: '6px 0',
              borderRadius: 6,
              fontSize: 11,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background:
                linkDistance === 100 && repulsionStrength === -160
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'transparent',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {t('graph.presetDefault')}
          </button>
          <button
            onClick={() => {
              setLinkDistance(110)
              setRepulsionStrength(-200)
              setTextSize(10)
            }}
            style={{
              flex: '1 1 calc(50% - 3px)',
              padding: '6px 0',
              borderRadius: 6,
              fontSize: 11,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background:
                linkDistance === 110 && repulsionStrength === -200 && textSize === 10
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'transparent',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {t('graph.presetReadable')}
          </button>
          <button
            onClick={() => {
              setLinkDistance(45)
              setRepulsionStrength(-220)
            }}
            style={{
              flex: '1 1 calc(50% - 3px)',
              padding: '6px 0',
              borderRadius: 6,
              fontSize: 11,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background:
                linkDistance === 45 && repulsionStrength === -220
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'transparent',
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
              flex: '1 1 calc(50% - 3px)',
              padding: '6px 0',
              borderRadius: 6,
              fontSize: 11,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background:
                linkDistance === 125 && repulsionStrength === -40
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'transparent',
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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          paddingTop: 14
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--text-secondary)',
            opacity: 0.6,
            letterSpacing: '0.04em'
          }}
        >
          {t('graph.legend')}
        </span>
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
                  <span
                    style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color }}
                  />
                  <span>{cat.label}</span>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    color: isDisabled ? 'var(--text-secondary)' : 'var(--accent-color)',
                    fontWeight: 600
                  }}
                >
                  {isDisabled ? t('graph.hidden') : t('graph.visible')}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Force Sliders */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          paddingTop: 14
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--text-secondary)',
            opacity: 0.6,
            letterSpacing: '0.04em'
          }}
        >
          {t('graph.physicsForces')}
        </span>

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
            <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>
              {Math.abs(repulsionStrength)}
            </span>
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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          paddingTop: 14
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--text-secondary)',
            opacity: 0.6,
            letterSpacing: '0.04em'
          }}
        >
          {t('graph.displaySettings')}
        </span>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            {t('graph.labelMode.title')}
          </span>
          <select
            value={labelMode}
            onChange={(e) => setLabelMode(e.target.value as any)}
            style={{
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 6,
              color: 'var(--text-primary)',
              fontSize: 12,
              padding: '6px 8px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="auto" style={{ background: '#1e1e1e' }}>{t('graph.labelMode.auto')}</option>
            <option value="hover" style={{ background: '#1e1e1e' }}>{t('graph.labelMode.hover')}</option>
            <option value="all" style={{ background: '#1e1e1e' }}>{t('graph.labelMode.all')}</option>
          </select>
        </div>

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
            checked={showGlow}
            onChange={(e) => setShowGlow(e.target.checked)}
            style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
          />
          {t('graph.showGlow')}
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
  )
}
