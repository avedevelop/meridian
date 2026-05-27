import { useState, useEffect, useCallback, useMemo, useRef, Component, type ReactNode } from 'react'
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
import { useVaultBridge, uniqueFileName } from './hooks/useVaultBridge'
import { useVaultFileWatcher } from './hooks/useVaultFileWatcher'
import { SettingsModal } from './components/Settings/SettingsModal'
import { ActivityBar } from './components/ActivityBar/ActivityBar'
import { useSettingsStore } from './store/useSettingsStore'
import { useViewsStore } from './store/useViewsStore'
import { initI18n, i18n } from './i18n/index'
import type { NoteTypeDefinition } from '@shared/types'

import { useAutoSave } from './hooks/useAutoSave'
import { useGitSync } from './hooks/useGitSync'
import { useSessionPersist } from './hooks/useSessionPersist'
import { shouldIgnoreGlobalShortcut } from './utils/keyboardGuards'

import { initCorePlugins } from './plugins/core'
import { pluginRegistry } from './plugins/registry'

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
  const vaultFiles = useVaultStore((s) => s.files)
  const allFiles = useLinkStore((s) => s.allFiles)
  const indexVersion = useLinkStore((s) => s.indexVersion)
  const {
    openFile,
    openVault,
    openDailyNote,
    exportNote,
    exportPdf,
    createFile,
    createTypedNote,
    saveFile,
    listTemplates,
    applyTemplate
  } = useVaultBridge()
  const pluginsEnabled = useSettingsStore((s) => s.pluginsEnabled)

  const [paletteOpen, setPaletteOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [noteTypes, setNoteTypes] = useState<NoteTypeDefinition[]>([])
  const [pluginCommands, setPluginCommands] = useState(() => pluginRegistry.getCommands())

  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([])
  const showToastRef = useRef<(message: string) => void>(() => {})
  showToastRef.current = (message: string) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }

  // Initialize core plugins API
  const pluginAPI = useMemo(
    () => ({
      vault: window.vault,
      settings: {
        get: <T,>(key: string) => useSettingsStore.getState()[key] as T,
        set: (key: string, value: unknown) =>
          useSettingsStore.getState().updateSetting(key as any, value as any)
      },
      ui: {
        toast: (msg: string) => {
          console.log(`[Toast] ${msg}`)
          showToastRef.current(msg)
        },
        openSettings: () => {
          setSettingsOpen(true)
        }
      },
      app: {
        openDailyNote: async () => {
          await openDailyNote()
        }
      },
      registerCommand: (cmd) => {
        pluginRegistry.registerCommand(cmd)
      }
    }),
    [openDailyNote]
  )

  // Initialize Core Plugins list once
  useEffect(() => {
    initCorePlugins(pluginAPI)
  }, [pluginAPI])

  useEffect(() => {
    if (!vault) return
    let cancelled = false
    window.vault
      .getNoteTypes()
      .then((types) => {
        if (!cancelled) setNoteTypes(types)
      })
      .catch((error) => console.error('[App] failed to load note types', error))
    return () => {
      cancelled = true
    }
  }, [vault])

  useEffect(() => {
    setPluginCommands(pluginRegistry.getCommands())
    return pluginRegistry.subscribe(() => {
      setPluginCommands(pluginRegistry.getCommands())
    })
  }, [])

  // Bumping this counter forces the community-plugin sync effect to re-run.
  // pluginReloadIds collects ids that should be force-reloaded (module re-imported)
  // on the next sync — populated by hot-reload watcher and by manual reload buttons.
  const [pluginReloadCounter, setPluginReloadCounter] = useState(0)
  const pluginReloadIdsRef = useRef<Set<string>>(new Set())
  const requestPluginReload = useCallback((id: string) => {
    pluginReloadIdsRef.current.add(id)
    setPluginReloadCounter((c) => c + 1)
  }, [])

  // Subscribe to main-process file change events for community plugins.
  useEffect(() => {
    if (!vault) return
    const unsubscribe = window.vault.onPluginFileChanged?.((event) => {
      requestPluginReload(event.pluginId)
    })
    // Expose a renderer-only entry point so settings UI can trigger
    // a manual reload without prop drilling through the whole app.
    window.__meridianReloadPlugin = requestPluginReload
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe()
      if (window.__meridianReloadPlugin === requestPluginReload) {
        delete window.__meridianReloadPlugin
      }
    }
  }, [vault, requestPluginReload])

  useEffect(() => {
    if (!vault) {
      pluginRegistry.clearCommunityPlugins()
      const coreList = pluginRegistry.getCorePlugins()
      for (const p of coreList) {
        if (pluginRegistry.isPluginLoaded(p.id)) {
          pluginRegistry.disablePlugin(p.id)
        }
      }
      return
    }

    // Core plugins sync
    const coreList = pluginRegistry.getCorePlugins()
    for (const p of coreList) {
      const shouldBeEnabled = pluginsEnabled[p.id]
      const isCurrentlyEnabled = pluginRegistry.isPluginLoaded(p.id)
      if (shouldBeEnabled && !isCurrentlyEnabled) {
        pluginRegistry.enablePlugin(p.id).catch((err) => {
          console.error(`Failed to enable core plugin ${p.id}:`, err)
        })
      } else if (!shouldBeEnabled && isCurrentlyEnabled) {
        pluginRegistry.disablePlugin(p.id)
      }
    }

    // Community plugins sync
    let active = true
    const reloadIds = new Set(pluginReloadIdsRef.current)
    pluginReloadIdsRef.current.clear()
    async function syncCommunityPlugins() {
      try {
        const manifests = await window.vault.listPlugins()
        if (!active) return

        const manifestIds = new Set(manifests.map((m) => m.id))

        // Drop registry entries for plugins missing from the current app/vault plugin set.
        // This keeps app-wide plugins loaded while removing stale legacy vault plugins.
        pluginRegistry.pruneCommunityPlugins(manifestIds)

        // Drop hot-reload-targeted plugins from the registry so the
        // load loop re-imports them with a fresh module URL.
        for (const id of reloadIds) {
          if (!manifestIds.has(id)) continue
          if (pluginRegistry.isPluginLoaded(id)) pluginRegistry.disablePlugin(id)
          pluginRegistry.pruneCommunityPlugins(
            new Set(Array.from(manifestIds).filter((mid) => mid !== id))
          )
        }

        // Disable any loaded plugins that are now disabled in settings.
        const loadedCommunity = pluginRegistry.getCommunityPlugins()
        for (const p of loadedCommunity) {
          const shouldBeEnabled = !!pluginsEnabled[p.id]
          if (!shouldBeEnabled && pluginRegistry.isPluginLoaded(p.id)) {
            pluginRegistry.disablePlugin(p.id)
          }
        }

        // Enable any plugins that should be enabled but are not loaded.
        // Plugins enabled in settings but missing from the manifest list
        // are silently skipped; manifests are the source of truth here.
        for (const manifest of manifests) {
          const shouldBeEnabled = !!pluginsEnabled[manifest.id]
          const isLoaded = pluginRegistry.isPluginLoaded(manifest.id)

          if (shouldBeEnabled && !isLoaded) {
            try {
              const entryUrl = await window.vault.loadPlugin(manifest.id)
              const moduleExports = await import(/* @vite-ignore */ `${entryUrl}?t=${Date.now()}`)
              pluginRegistry.loadCommunityPlugin(manifest, moduleExports)
              await pluginRegistry.enablePlugin(manifest.id)
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err)
              console.error(`Failed to load community plugin ${manifest.id}:`, err)
              pluginAPI.ui.toast(
                i18n.t('settings.plugins.community.loadFailedDetail', {
                  name: manifest.name || manifest.id,
                  error: message
                })
              )
            }
          }
        }
      } catch (err) {
        console.error('Failed to sync community plugins:', err)
        pluginAPI.ui.toast(i18n.t('settings.plugins.community.syncFailed'))
      }
    }

    syncCommunityPlugins()
    return () => {
      active = false
    }
  }, [vault, pluginsEnabled, pluginAPI, pluginReloadCounter])

  const [activeSidebarTab, setActiveSidebarTab] = useState<
    'files' | 'search' | 'graph' | 'calendar' | 'tasks' | 'views' | 'git'
  >('files')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('layout-sidebar-collapsed') === 'true'
  })
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(() => {
    return localStorage.getItem('layout-right-collapsed') === 'true'
  })

  const handleTabChange = useCallback((tab: typeof activeSidebarTab) => {
    setActiveSidebarTab((curr) => {
      if (curr === tab) {
        setSidebarCollapsed((prev) => {
          const next = !prev
          localStorage.setItem('layout-sidebar-collapsed', String(next))
          return next
        })
        return curr
      } else {
        setSidebarCollapsed(false)
        localStorage.setItem('layout-sidebar-collapsed', 'false')
        return tab
      }
    })
  }, [])

  const theme = useSettingsStore((s) => s.theme)
  const accentColor = useSettingsStore((s) => s.accentColor)
  const uiZoom = useSettingsStore((s) => s.uiZoom)
  const compactMode = useSettingsStore((s) => s.compactMode)
  const showStatusBar = useSettingsStore((s) => s.showStatusBar)
  const defaultExportFormat = useSettingsStore((s) => s.defaultExportFormat)
  const language = useSettingsStore((s) => s.language)

  // Load preferences from disk on mount
  useEffect(() => {
    useSettingsStore.getState().loadFromDisk()
  }, [])

  useEffect(() => {
    initI18n(language)
  }, [])

  useEffect(() => {
    if (i18n.isInitialized) i18n.changeLanguage(language)
  }, [language])

  useVaultFileWatcher()
  useAutoSave()
  useGitSync()
  useSessionPersist()

  useEffect(() => {
    document.documentElement.style.zoom = `${uiZoom}%`
  }, [uiZoom])

  useEffect(() => {
    document.documentElement.setAttribute('data-compact', compactMode ? 'true' : 'false')
  }, [compactMode])

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
      if (shouldIgnoreGlobalShortcut(e)) return

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
        if (e.key === 'e' && !e.shiftKey) {
          e.preventDefault()
          if (defaultExportFormat === 'pdf') {
            exportPdf()
          } else {
            exportNote()
          }
        }
        if (e.key === 'b') {
          // Let CodeMirror handle Cmd+B when the editor is focused
          if (!e.altKey && document.activeElement?.closest('.cm-editor')) return
          e.preventDefault()
          if (e.altKey) {
            setRightPanelCollapsed((prev) => {
              const next = !prev
              localStorage.setItem('layout-right-collapsed', String(next))
              return next
            })
          } else {
            setSidebarCollapsed((prev) => {
              const next = !prev
              localStorage.setItem('layout-sidebar-collapsed', String(next))
              return next
            })
          }
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openVault, openDailyNote, exportNote, exportPdf, defaultExportFormat])

  useEffect(() => {
    const handler = () => setSettingsOpen(true)
    window.addEventListener('meridian:open-settings', handler)
    return () => window.removeEventListener('meridian:open-settings', handler)
  }, [])

  useEffect(() => {
    if (!window.menuAPI) return
    const unsub = window.menuAPI.onAction(async (action) => {
      switch (action) {
        case 'new-file':
          if (vault)
            createFile(vault.path, uniqueFileName(vault.path, 'Untitled', 'md', vaultFiles))
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
        case 'export-pdf':
          exportPdf()
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
          setSidebarCollapsed(false)
          localStorage.setItem('layout-sidebar-collapsed', 'false')
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
    exportPdf,
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

  const [recentPaths, setRecentPaths] = useState<string[]>([])

  const paletteCommands = useMemo(() => {
    const staticCmds = [
      ...['inbox', 'projects', 'tasks', 'daily'].map((viewId) => ({
        id: `open-view-${viewId}`,
        label: i18n.t('views.commandOpen', {
          view: i18n.t(`views.defaults.${viewId}`)
        }),
        icon: '☰',
        onSelect: () => {
          useViewsStore.getState().setActiveView(viewId)
          setActiveSidebarTab('views')
          setSidebarCollapsed(false)
          localStorage.setItem('layout-sidebar-collapsed', 'false')
        }
      })),
      ...noteTypes.slice(0, 6).map((type) => ({
        id: `create-as-${type.id}`,
        label: i18n.t('noteTypes.commandCreateAs', {
          type: i18n.t(`noteTypes.${type.id}`, { defaultValue: type.label })
        }),
        icon: '＋',
        onSelect: async () => {
          if (!vault) return
          await createTypedNote(type.id, vault.path)
        }
      })),
      {
        id: 'insert-template',
        label: 'Insert Template…',
        icon: '📋',
        onSelect: async () => {
          const templates = await listTemplates()
          if (templates.length === 0) {
            window.alert(
              'No templates found.\n\nCreate .md files in a _templates/ folder in your vault root.'
            )
            return
          }
          const names = templates.map((t, i) => `${i + 1}. ${t.name}`).join('\n')
          const answer = window.prompt(`Choose a template:\n\n${names}\n\nEnter number:`)
          const idx = parseInt(answer ?? '', 10) - 1
          if (idx >= 0 && idx < templates.length) {
            await applyTemplate(templates[idx].path)
          }
        }
      }
    ]

    const dynamicCmds = pluginCommands.map((c) => ({
      id: c.id,
      label: c.title,
      icon: '⚡',
      onSelect: () => c.run(pluginAPI)
    }))

    return [...staticCmds, ...dynamicCmds]
  }, [pluginAPI, listTemplates, applyTemplate, pluginCommands, noteTypes, createTypedNote, vault])

  const handlePaletteFileSelect = useCallback(
    (path: string, name: string) => {
      openFile(path, name)
      setRecentPaths((prev) => [path, ...prev.filter((p) => p !== path)].slice(0, 8))
    },
    [openFile]
  )

  if (!vault) return <VaultPicker />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Layout
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        rightPanelCollapsed={rightPanelCollapsed}
        setRightPanelCollapsed={setRightPanelCollapsed}
        activeSidebarTab={activeSidebarTab}
        onSidebarTabChange={handleTabChange}
        activityBar={
          <ActivityBar
            activeTab={activeSidebarTab}
            onTabChange={handleTabChange}
            sidebarCollapsed={sidebarCollapsed}
            onSettings={() => setSettingsOpen(true)}
          />
        }
        sidebar={
          <Sidebar key={vault.path} activeTab={activeSidebarTab} onTabChange={handleTabChange} />
        }
        editor={<EditorArea />}
        rightPanel={<RightPanel />}
      />
      {showStatusBar && <StatusBar />}
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        files={paletteFiles}
        recentPaths={recentPaths}
        onFileSelect={handlePaletteFileSelect}
        commands={paletteCommands}
      />
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Glassmorphic Toast Notifications */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          pointerEvents: 'none'
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              background: 'rgba(25, 25, 25, 0.85)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#eee',
              padding: '12px 20px',
              borderRadius: 8,
              fontSize: 13,
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              minWidth: 260,
              maxWidth: 400,
              animation: 'toast-slide-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}
          >
            <span style={{ fontSize: 16 }}>✦</span>
            <div style={{ flex: 1, lineHeight: '1.4' }}>{toast.message}</div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              style={{
                background: 'none',
                border: 'none',
                color: '#666',
                cursor: 'pointer',
                fontSize: 14,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#bbb'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#666'
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toast-slide-in {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  )
}
