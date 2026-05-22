import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '../../store/useSettingsStore'
import { SettingCategory, SettingsModalProps } from './settingsTypes'
import { SettingsNav } from './SettingsNav'
import { SettingsContent } from './SettingsContent'

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { t } = useTranslation()
  const store = useSettingsStore()
  const [activeCategory, setActiveCategory] = useState<SettingCategory>('editor')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!isOpen) return

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      setActiveCategory('editor')
      setSearchQuery('')
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 900,
          height: 600,
          background: 'var(--bg-primary)',
          borderRadius: 14,
          border: '1px solid var(--border-color)',
          boxShadow: '0 24px 72px rgba(0,0,0,0.9)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        }}
      >
        {/* TOP BAR */}
        <div
          style={{
            height: 48,
            padding: '0 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-secondary)'
          }}
        >
          <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, letterSpacing: '0.02em' }}>
            {t('settings.title')}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 22,
              lineHeight: 1,
              transition: 'color 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            ×
          </button>
        </div>

        {/* CONTAINER */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <SettingsNav
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onResetDefaults={() => store.resetToDefault()}
          />
          <SettingsContent
            activeCategory={activeCategory}
            searchQuery={searchQuery}
            isOpen={isOpen}
          />
        </div>
      </div>
    </div>
  )
}
