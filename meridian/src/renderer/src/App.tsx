import { useState, useEffect, useCallback, useMemo, Component, type ReactNode } from 'react'
import { WarningIcon } from './components/Icons'

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) {
    return { error: e.message }
  }
  render() {
    if (this.state.error)
      return (
        <div
          style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1a1a1a',
            color: '#ccc',
            gap: 16
          }}
        >
          <WarningIcon size={32} />
          <div style={{ fontSize: 14, color: '#f66' }}>Something went wrong</div>
          <div style={{ fontSize: 12, color: '#555', maxWidth: 400, textAlign: 'center' }}>
            {this.state.error}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8,
              padding: '8px 20px',
              background: '#7c6af7',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13
            }}
          >
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
import { useVaultFileWatcher } from './hooks/useVaultFileWatcher'
import { SettingsModal } from './components/Settings/SettingsModal'
import { ActivityBar } from './components/ActivityBar/ActivityBar'
import { useSettingsStore } from './store/useSettingsStore'

import { useAutoSave } from './hooks/useAutoSave'

declare global {
  interface Window {
    menuAPI: {
      onAction: (callback: (action: string) => void) => () => void
    }
  }
}

export { AppErrorBoundary }
export default function App() {
  const vault = useVaultStore((s) => s.vault)
  const closeTab = useVaultStore((s) => s.closeTab)
  const activeTabPath = useVaultStore((s) => s.activeTabPath)
  const openTabs = useVaultStore((s) => s.openTabs)
  const allFiles = useLinkStore((s) => s.allFiles)
  const indexVersion = useLinkStore((s) => s.indexVersion)
  const { openFile, openVault, openDailyNote, exportNote, createFile, saveFile } = useVaultBridge()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activeSidebarTab, setActiveSidebarTab] = useState<'files' | 'search' | 'graph'>('files')

  const theme = useSettingsStore((s) => s.theme)
  const accentColor = useSettingsStore((s) => s.accentColor)

  useVaultFileWatcher()
  useAutoSave()

  useEffect(() => {
    const root = document.documentElement
    const themes = {
      dark: {
        '--bg-primary': '#1a1a1a',
        '--bg-secondary': '#161616',
        '--bg-tertiary': '#131313',
        '--bg-surface': '#222222',
        '--border-color': '#2a2a2a',
        '--text-primary': '#dddddd',
        '--text-secondary': '#888888'
      },
      midnight: {
        '--bg-primary': '#0b0b0b',
        '--bg-secondary': '#070707',
        '--bg-tertiary': '#000000',
        '--bg-surface': '#141414',
        '--border-color': '#1c1c1c',
        '--text-primary': '#f0f0f0',
        '--text-secondary': '#666666'
      },
      indigo: {
        '--bg-primary': '#141424',
        '--bg-secondary': '#0f0f1b',
        '--bg-tertiary': '#0b0b14',
        '--bg-surface': '#1d1d33',
        '--border-color': '#24243f',
        '--text-primary': '#e0e2fc',
        '--text-secondary': '#7b7ea3'
      },
      cyberpunk: {
        '--bg-primary': '#100720',
        '--bg-secondary': '#0b0416',
        '--bg-tertiary': '#05020c',
        '--bg-surface': '#1f0f3d',
        '--border-color': '#331444',
        '--text-primary': '#00ffff',
        '--text-secondary': '#ff00ff'
      },
      forest: {
        '--bg-primary': '#121b16',
        '--bg-secondary': '#0d1410',
        '--bg-tertiary': '#090e0b',
        '--bg-surface': '#1a2620',
        '--border-color': '#22332a',
        '--text-primary': '#e2f0e9',
        '--text-secondary': '#6d8c7d'
      },
      nord: {
        '--bg-primary': '#2e3440',
        '--bg-secondary': '#242933',
        '--bg-tertiary': '#1b1e23',
        '--bg-surface': '#3b4252',
        '--border-color': '#434c5e',
        '--text-primary': '#eceff4',
        '--text-secondary': '#d8dee9'
      },
      dracula: {
        '--bg-primary': '#282a36',
        '--bg-secondary': '#1f2026',
        '--bg-tertiary': '#191a21',
        '--bg-surface': '#44475a',
        '--border-color': '#3c3e4f',
        '--text-primary': '#f8f8f2',
        '--text-secondary': '#6272a4'
      },
      obsidian: {
        '--bg-primary': '#111115',
        '--bg-secondary': '#181822',
        '--bg-tertiary': '#070709',
        '--bg-surface': '#222230',
        '--border-color': '#282835',
        '--text-primary': '#f3f4f6',
        '--text-secondary': '#9ca3af'
      }
    }

    const accents = {
      purple: {
        '--accent-color': '#7c6af7',
        '--accent-hover': '#9081f8',
        '--accent-glow': 'rgba(124, 106, 247, 0.25)'
      },
      blue: {
        '--accent-color': '#3b82f6',
        '--accent-hover': '#60a5fa',
        '--accent-glow': 'rgba(59, 130, 246, 0.25)'
      },
      green: {
        '--accent-color': '#10b981',
        '--accent-hover': '#34d399',
        '--accent-glow': 'rgba(16, 185, 129, 0.25)'
      },
      orange: {
        '--accent-color': '#f97316',
        '--accent-hover': '#fb923c',
        '--accent-glow': 'rgba(249, 115, 22, 0.25)'
      },
      red: {
        '--accent-color': '#ef4444',
        '--accent-hover': '#f87171',
        '--accent-glow': 'rgba(239, 68, 68, 0.25)'
      }
    }

    const currentTheme = themes[theme] || themes.dark
    const currentAccent = accents[accentColor] || accents.purple

    Object.entries(currentTheme).forEach(([prop, val]) => {
      root.style.setProperty(prop, val)
    })
    Object.entries(currentAccent).forEach(([prop, val]) => {
      root.style.setProperty(prop, val)
    })
  }, [theme, accentColor])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'k') {
          e.preventDefault()
          setPaletteOpen((open) => !open)
        }
        if (e.key === 'o') {
          e.preventDefault()
          openVault()
        }
        if (e.key === ',') {
          e.preventDefault()
          setSettingsOpen((open) => !open)
        }
        if (e.key === 'd') {
          e.preventDefault()
          openDailyNote()
        }
        if (e.key === 'e') {
          e.preventDefault()
          exportNote()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openVault, openDailyNote, exportNote])

  useEffect(() => {
    if (!window.menuAPI) return
    const unsub = window.menuAPI.onAction(async (action) => {
      switch (action) {
        case 'new-file':
          if (vault) createFile(vault.path, `Untitled ${Date.now()}.md`)
          break
        case 'daily-note':
          openDailyNote()
          break
        case 'open-vault':
          openVault()
          break
        case 'save': {
          const tab = openTabs.find((t) => t.path === activeTabPath)
          if (tab) await saveFile(tab.path, tab.content)
          break
        }
        case 'export-html':
          exportNote()
          break
        case 'close-tab':
          if (activeTabPath) closeTab(activeTabPath)
          break
        case 'command-palette':
          setPaletteOpen((open) => !open)
          break
        case 'settings':
          setSettingsOpen((open) => !open)
          break
        case 'graph-view':
          setActiveSidebarTab('graph')
          break
        case 'reset-layout':
          window.dispatchEvent(new Event('layout:reset'))
          break
      }
    })
    return unsub
  }, [
    vault,
    createFile,
    openDailyNote,
    openVault,
    saveFile,
    exportNote,
    closeTab,
    activeTabPath,
    openTabs
  ])

  const paletteFiles = useMemo(
    () =>
      allFiles()
        .map((path) => ({
          path,
          name: path.split('/').pop() ?? ''
        }))
        .filter((f) => f.name.endsWith('.md')),
    [allFiles, indexVersion]
  )

  const handleFileSelect = useCallback(
    (path: string, name: string) => {
      openFile(path, name)
    },
    [openFile]
  )

  if (!vault) return <VaultPicker />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Layout
        activityBar={
          <ActivityBar
            activeTab={activeSidebarTab}
            onTabChange={setActiveSidebarTab}
            onSettings={() => setSettingsOpen(true)}
          />
        }
        sidebar={
          <Sidebar
            key={vault.path}
            activeTab={activeSidebarTab}
            onTabChange={setActiveSidebarTab}
          />
        }
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
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
