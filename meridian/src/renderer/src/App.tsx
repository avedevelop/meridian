import React, { useState, useEffect, useCallback, Component, ReactNode } from 'react'

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e.message } }
  render() {
    if (this.state.error) return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a', color: '#ccc', gap: 16 }}>
        <div style={{ fontSize: 32 }}>⚠️</div>
        <div style={{ fontSize: 14, color: '#f66' }}>Something went wrong</div>
        <div style={{ fontSize: 12, color: '#555', maxWidth: 400, textAlign: 'center' }}>{this.state.error}</div>
        <button onClick={() => window.location.reload()} style={{ marginTop: 8, padding: '8px 20px', background: '#7c6af7', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
          Reload
        </button>
      </div>
    )
    return this.props.children
  }
}
import { useVaultStore } from './store/useVaultStore'
import { useLinkStore } from './store/useLinkStore'
import { VaultPicker } from './components/VaultPicker'
import { Layout } from './components/Layout'
import { Sidebar } from './components/Sidebar/Sidebar'
import { EditorArea } from './components/Editor/EditorPane'
import { StatusBar } from './components/StatusBar'
import { RightPanel } from './components/RightPanel/RightPanel'
import { CommandPalette } from './components/CommandPalette/CommandPalette'
import { useVaultBridge } from './hooks/useVaultBridge'
import { SettingsModal } from './components/Settings/SettingsModal'

export { AppErrorBoundary }
export default function App() {
  const vault = useVaultStore(s => s.vault)
  const allFiles = useLinkStore(s => s.allFiles)
  const { openFile, openVault, openDailyNote } = useVaultBridge()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'k') { e.preventDefault(); setPaletteOpen(open => !open) }
        if (e.key === 'o') { e.preventDefault(); openVault() }
        if (e.key === ',') { e.preventDefault(); setSettingsOpen(open => !open) }
        if (e.key === 'd') { e.preventDefault(); openDailyNote() }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openVault, openDailyNote])

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
        sidebar={<Sidebar key={vault.path} />}
        editor={<EditorArea />}
        rightPanel={<RightPanel />}
      />
      <StatusBar />
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        files={paletteFiles}
        onFileSelect={handleFileSelect}
      />
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}
