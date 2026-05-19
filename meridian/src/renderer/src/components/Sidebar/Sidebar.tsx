import React from 'react'
import { useVaultStore } from '../../store/useVaultStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'
import { FileTree } from './FileTree'

export function Sidebar() {
  const { vault, files } = useVaultStore()
  const { openFile, createFile } = useVaultBridge()

  if (!vault) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #2a2a2a', color: '#888', fontSize: 12 }}>
        📁 {vault.name}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        <FileTree files={files} onFileClick={openFile} vaultPath={vault.path} />
      </div>
      <div style={{ padding: 8, borderTop: '1px solid #2a2a2a' }}>
        <button
          onClick={() => createFile(vault.path, `Untitled ${Date.now()}.md`)}
          style={{
            width: '100%', padding: '6px 0', borderRadius: 6,
            background: '#2a2050', color: '#aaa', border: 'none',
            fontSize: 12, cursor: 'pointer',
          }}
        >
          + New note
        </button>
      </div>
    </div>
  )
}
