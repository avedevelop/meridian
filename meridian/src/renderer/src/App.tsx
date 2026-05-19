import React, { useState, useEffect, useCallback } from 'react'
import { useVaultStore } from './store/useVaultStore'
import { useLinkStore } from './store/useLinkStore'
import { VaultPicker } from './components/VaultPicker'
import { Layout } from './components/Layout'
import { Sidebar } from './components/Sidebar/Sidebar'
import { EditorArea } from './components/Editor/EditorPane'
import { StatusBar } from './components/StatusBar'
import { BacklinksPanel } from './components/RightPanel/BacklinksPanel'
import { CommandPalette } from './components/CommandPalette/CommandPalette'
import { useVaultBridge } from './hooks/useVaultBridge'

export default function App() {
  const vault = useVaultStore(s => s.vault)
  const allFiles = useLinkStore(s => s.allFiles)
  const { openFile } = useVaultBridge()
  const [paletteOpen, setPaletteOpen] = useState(false)

  const { openVault } = useVaultBridge()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'k') { e.preventDefault(); setPaletteOpen(open => !open) }
        if (e.key === 'o') { e.preventDefault(); openVault() }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openVault])

  const paletteFiles = allFiles().map(path => ({
    path,
    name: path.split('/').pop() ?? '',
  })).filter(f => f.name.endsWith('.md'))

  const handleFileSelect = useCallback((path: string, name: string) => {
    openFile(path, name)
  }, [openFile])

  if (!vault) return <VaultPicker />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Layout
        sidebar={<Sidebar />}
        editor={<EditorArea />}
        rightPanel={<BacklinksPanel />}
      />
      <StatusBar />
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        files={paletteFiles}
        onFileSelect={handleFileSelect}
      />
    </div>
  )
}
