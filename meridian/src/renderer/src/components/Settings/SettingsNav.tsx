import { useTranslation } from 'react-i18next'
import { SettingCategory } from './settingsTypes'
import { getCategoryIcon } from './settingsCategoryIcons'

interface SettingsNavProps {
  activeCategory: SettingCategory
  setActiveCategory: (cat: SettingCategory) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  onResetDefaults: () => void
}

export function SettingsNav({
  activeCategory,
  setActiveCategory,
  searchQuery,
  setSearchQuery,
  onResetDefaults
}: SettingsNavProps) {
  const { t } = useTranslation()

  const categoriesList: { id: SettingCategory; label: string }[] = [
    { id: 'editor', label: t('settings.nav.editor') },
    { id: 'files', label: t('settings.nav.files') },
    { id: 'appearance', label: t('settings.nav.appearance') },
    { id: 'canvas', label: t('settings.nav.canvas') },
    { id: 'ai', label: t('settings.nav.ai') },
    { id: 'plugins', label: t('settings.nav.plugins') },
    { id: 'export', label: t('settings.nav.export') },
    { id: 'sync', label: t('settings.nav.sync') },
    { id: 'hotkeys', label: t('settings.nav.hotkeys') },
    { id: 'about', label: t('settings.nav.about') }
  ]

  return (
    <div
      style={{
        width: 240,
        background: 'var(--bg-tertiary)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 8px'
      }}
    >
      {/* Search Input */}
      <div style={{ padding: '0 8px 12px 8px' }}>
        <input
          type="text"
          placeholder={t('settings.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 6,
            color: 'var(--text-primary)',
            fontSize: 12,
            padding: '6px 10px',
            outline: 'none'
          }}
        />
      </div>

      {/* Category Navigation */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          flex: 1,
          overflowY: 'auto'
        }}
      >
        {categoriesList.map((cat) => {
          const isSelected = !searchQuery && activeCategory === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => {
                setSearchQuery('')
                setActiveCategory(cat.id)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                borderRadius: 6,
                background: isSelected ? 'var(--accent-glow)' : 'transparent',
                border: 'none',
                color: isSelected ? 'var(--accent-color)' : 'var(--text-secondary)',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 12,
                fontWeight: isSelected ? 600 : 500,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {getCategoryIcon(
                  cat.id,
                  isSelected ? 'var(--accent-color)' : 'var(--text-secondary)'
                )}
              </span>
              <span>{cat.label}</span>
            </button>
          )
        })}
      </div>

      {/* Reset Defaults button */}
      <div style={{ padding: '8px 8px 0 8px', borderTop: '1px solid var(--border-color)' }}>
        <button
          onClick={() => {
            if (confirm(t('settings.resetConfirm'))) {
              onResetDefaults()
            }
          }}
          style={{
            width: '100%',
            background: 'transparent',
            border: '1px dashed var(--border-color)',
            borderRadius: 6,
            color: 'var(--text-secondary)',
            fontSize: 11,
            padding: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#c06868'
            e.currentTarget.style.color = '#c06868'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color)'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }}
        >
          {t('settings.resetDefaults')}
        </button>
      </div>
    </div>
  )
}
