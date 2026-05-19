import { useEffect, useState } from 'react'
import { useVaultBridge } from '../hooks/useVaultBridge'
import type { VaultConfig } from '@shared/types'

export function VaultPicker() {
  const { openVault, openVaultByPath, createNewVault } = useVaultBridge()
  const [recents, setRecents] = useState<VaultConfig[]>([])

  useEffect(() => {
    window.settings.get()
      .then(config => setRecents(config.recentVaults ?? []))
      .catch(() => setRecents([]))
  }, [])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', gap: 24,
      background: '#1a1a1a', color: '#ccc',
    }}>
      <div style={{ fontSize: 48 }}>📓</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: 0 }}>Meridian</h1>
      <p style={{ color: '#666', margin: 0 }}>A knowledge base that works the way you do.</p>

      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <button
          onClick={createNewVault}
          style={{
            padding: '12px 24px', borderRadius: 8,
            background: 'transparent', color: '#7c6af7',
            border: '2px solid #7c6af7',
            fontSize: 15, cursor: 'pointer', fontWeight: 600,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,106,247,0.1)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          New Vault
        </button>
        <button
          onClick={openVault}
          style={{
            padding: '12px 24px', borderRadius: 8,
            background: '#7c6af7', color: '#fff', border: 'none',
            fontSize: 15, cursor: 'pointer', fontWeight: 600,
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.9' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
        >
          Open Vault
        </button>
      </div>

      {recents.length > 0 && (
        <div style={{ width: 360 }}>
          <div style={{
            color: '#444', fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: 10, textAlign: 'center',
          }}>
            Recent
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {recents.map(vault => (
              <button
                key={vault.path}
                onClick={() => openVaultByPath(vault.path)}
                style={{
                  background: '#222', border: '1px solid #2a2a2a', borderRadius: 8,
                  padding: '10px 16px', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', flexDirection: 'column', gap: 2,
                  width: '100%',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#7c6af7')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
              >
                <span style={{ color: '#ccc', fontSize: 14, fontWeight: 600 }}>{vault.name}</span>
                <span style={{ color: '#555', fontSize: 11 }}>{vault.path}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <p style={{ color: '#444', fontSize: 13, marginTop: 8 }}>
        A vault is a folder of Markdown files on your computer.
      </p>
    </div>
  )
}
