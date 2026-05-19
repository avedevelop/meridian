import React from 'react'
import { useVaultStore } from './store/useVaultStore'
import { VaultPicker } from './components/VaultPicker'
import { Layout } from './components/Layout'
import { Sidebar } from './components/Sidebar/Sidebar'
import { EditorArea } from './components/Editor/EditorPane'
import { StatusBar } from './components/StatusBar'
import { BacklinksPanel } from './components/RightPanel/BacklinksPanel'

export default function App() {
  const vault = useVaultStore(s => s.vault)

  if (!vault) return <VaultPicker />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Layout
        sidebar={<Sidebar />}
        editor={<EditorArea />}
        rightPanel={<BacklinksPanel />}
      />
      <StatusBar />
    </div>
  )
}
