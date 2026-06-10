import { useTranslation } from 'react-i18next'
import { StarIcon } from '../Icons'
import { FileIcon } from './FileIcon'
import type { VaultFile } from '@shared/types'

interface FavoritesSectionProps {
  favorites: VaultFile[]
  activeTabPath: string | undefined
  onOpen: (path: string, name: string) => void
}

export function FavoritesSection({ favorites, activeTabPath, onOpen }: FavoritesSectionProps) {
  const { t } = useTranslation()

  if (favorites.length === 0) return null

  return (
    <div style={{ marginBottom: 4 }}>
      <div
        style={{
          padding: '4px 12px 2px',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          userSelect: 'none'
        }}
      >
        <StarIcon size={11} color="var(--accent-color)" filled />
        {t('favorites.title')}
      </div>
      {favorites.map((f) => (
        <div
          key={f.path}
          onClick={() => onOpen(f.path, f.name)}
          style={{
            padding: '3px 12px',
            cursor: 'pointer',
            color: activeTabPath === f.path ? 'var(--text-primary)' : 'var(--text-secondary)',
            background: activeTabPath === f.path ? 'var(--accent-glow)' : 'transparent',
            fontWeight: activeTabPath === f.path ? '500' : 'normal',
            borderLeft: activeTabPath === f.path ? '3px solid var(--accent-color)' : 'none',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
          onMouseEnter={(e) => {
            if (activeTabPath !== f.path) {
              e.currentTarget.style.background = 'var(--bg-surface)'
            }
          }}
          onMouseLeave={(e) => {
            if (activeTabPath !== f.path) {
              e.currentTarget.style.background = 'transparent'
            }
          }}
        >
          <FileIcon name={f.name} isDirectory={false} />
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1
            }}
          >
            {f.name.replace(/\.md$/i, '')}
          </span>
        </div>
      ))}
      <div
        style={{
          margin: '4px 12px',
          height: 1,
          background: 'var(--border-color)',
          opacity: 0.6
        }}
      />
    </div>
  )
}
