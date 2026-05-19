import React from 'react'
import { useVaultBridge } from '../hooks/useVaultBridge'

export function VaultPicker() {
  const { openVault } = useVaultBridge()

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', gap: 24,
      background: '#1a1a1a', color: '#ccc',
    }}>
      <div style={{ fontSize: 48 }}>📓</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: 0 }}>Meridian</h1>
      <p style={{ color: '#666', margin: 0 }}>A knowledge base that works the way you do.</p>
      <button
        onClick={openVault}
        style={{
          marginTop: 16, padding: '12px 32px', borderRadius: 8,
          background: '#7c6af7', color: '#fff', border: 'none',
          fontSize: 15, cursor: 'pointer', fontWeight: 600,
        }}
      >
        Open Vault
      </button>
      <p style={{ color: '#444', fontSize: 13 }}>
        A vault is a folder of Markdown files on your computer.
      </p>
    </div>
  )
}
