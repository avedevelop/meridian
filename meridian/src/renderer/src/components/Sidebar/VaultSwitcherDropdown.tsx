import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { VaultConfig } from '@shared/types'

interface VaultSwitcherDropdownProps {
  activeVaultPath: string
  activeVaultName: string
  onClose: () => void
  onOpenVault: () => void
  onOpenVaultByPath: (path: string) => void
  onCreateNewVault: () => void
}

export function VaultSwitcherDropdown({
  activeVaultPath,
  activeVaultName,
  onClose,
  onOpenVault,
  onOpenVaultByPath,
  onCreateNewVault
}: VaultSwitcherDropdownProps) {
  const { t } = useTranslation()
  const menuRef = useRef<HTMLDivElement>(null)
  const [recentVaults, setRecentVaults] = useState<VaultConfig[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    window.settings
      .get()
      .then((config) => {
        setRecentVaults(config.recentVaults ?? [])
      })
      .catch((e) => console.error('Failed to get recents:', e))
  }, [])

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('mousedown', handleOutsideClick)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const handleCopyPath = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(activeVaultPath)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy path:', err)
    }
  }

  const otherVaults = recentVaults.filter((v) => v.path !== activeVaultPath)

  return (
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        top: 28,
        left: 8,
        right: 8,
        zIndex: 1000,
        background: 'rgba(22, 22, 22, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--border-color)',
        borderRadius: 8,
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
        padding: '8px 0',
        display: 'flex',
        flexDirection: 'column',
        animation: 'menuFadeIn 0.12s ease-out'
      }}
    >
      <style>{`
        @keyframes menuFadeIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .vs-menu-section {
          padding: 4px 12px;
          font-size: 10px;
          color: var(--text-secondary);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .vs-menu-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          color: var(--text-primary);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.12s ease;
          background: transparent;
          border: none;
          text-align: left;
          width: 100%;
          text-decoration: none;
        }
        .vs-menu-item:hover {
          background: var(--accent-color);
          color: #ffffff;
        }
        .vs-menu-item:hover .vs-subtext {
          color: rgba(255, 255, 255, 0.7);
        }
        .vs-subtext {
          color: var(--text-secondary);
          font-size: 10px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .vs-divider {
          height: 1px;
          background: var(--border-color);
          margin: 6px 0;
        }
      `}</style>

      <div style={{ padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '75%' }}>
            {activeVaultName}
          </span>
          <span
            style={{
              fontSize: 9,
              background: 'var(--accent-glow)',
              color: 'var(--accent-color)',
              padding: '1px 5px',
              borderRadius: 3,
              fontWeight: 600
            }}
          >
            {t('sidebar.active')}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
          <span
            style={{
              fontSize: 9,
              color: 'var(--text-secondary)',
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1
            }}
            title={activeVaultPath}
          >
            {activeVaultPath}
          </span>
          <button
            onClick={handleCopyPath}
            title="Copy path"
            style={{
              background: 'transparent',
              border: 'none',
              color: copied ? 'var(--accent-color)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 10,
              padding: 0,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {copied ? '✓' : '📋'}
          </button>
        </div>
      </div>

      <div className="vs-divider" />

      <div className="vs-menu-section">{t('sidebar.recentProjects')}</div>
      {otherVaults.length === 0 ? (
        <div style={{ padding: '6px 12px', fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          {t('sidebar.noOtherVaults')}
        </div>
      ) : (
        <div style={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {otherVaults.map((v) => (
            <button
              key={v.path}
              className="vs-menu-item"
              onClick={() => {
                onClose()
                onOpenVaultByPath(v.path)
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
                <span>{v.name}</span>
                <span className="vs-subtext" title={v.path}>{v.path}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="vs-divider" />

      <div className="vs-menu-section">{t('sidebar.actions')}</div>
      <button
        className="vs-menu-item"
        onClick={() => {
          onClose()
          onOpenVault()
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><path d="M12 11v6"></path><path d="M9 14h6"></path></svg>
        <span>{t('sidebar.openFolder')}</span>
      </button>
      <button
        className="vs-menu-item"
        onClick={() => {
          onClose()
          onCreateNewVault()
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
        <span>{t('sidebar.createNewVault')}</span>
      </button>
    </div>
  )
}
