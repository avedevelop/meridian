import { useEffect, useRef } from 'react'
import type { VaultFileChangeEvent } from '@shared/types'
import { useLinkStore } from '../store/useLinkStore'
import { useVaultStore } from '../store/useVaultStore'

export function isMarkdownPath(path: string): boolean {
  return /\.md$/i.test(path)
}

export function isSameOrChildPath(parentPath: string, candidatePath: string): boolean {
  const parent = parentPath.replace(/\\/g, '/').replace(/\/+$/, '')
  const candidate = candidatePath.replace(/\\/g, '/')
  return candidate === parent || candidate.startsWith(`${parent}/`)
}

function fileNameFromPath(path: string): string {
  return path.replace(/\\/g, '/').split('/').pop() ?? ''
}

async function refreshFileTree(): Promise<void> {
  try {
    const files = await window.vault.listFiles()
    useVaultStore.getState().setFiles(files)
  } catch (error) {
    console.error('[Watcher] refresh file tree failed', error)
  }
}

async function syncChangedMarkdownFile(
  event: VaultFileChangeEvent,
  vaultPath: string
): Promise<void> {
  if (!isMarkdownPath(event.path)) return

  try {
    const content = await window.vault.readFile(event.path)
    const name = event.file?.name ?? fileNameFromPath(event.path)
    useLinkStore.getState().indexFile(event.path, name, content, vaultPath)

    const tab = useVaultStore.getState().openTabs.find((t) => t.path === event.path)
    if (tab && !tab.isDirty) {
      useVaultStore.getState().setTabContent(event.path, content)
      useVaultStore.getState().markTabDirty(event.path, false)
    }
  } catch (error) {
    console.error('[Watcher] sync markdown file failed', error)
  }
}

function removeDeletedPaths(event: VaultFileChangeEvent, vaultPath: string): void {
  const linkStore = useLinkStore.getState()
  const paths = linkStore.allFiles().filter((path) => isSameOrChildPath(event.path, path))
  for (const path of paths) {
    linkStore.removeFile(path, vaultPath)
  }

  const { openTabs } = useVaultStore.getState()
  for (const tab of openTabs) {
    if (isSameOrChildPath(event.path, tab.path) && !tab.isDirty) {
      useVaultStore.getState().closeTab(tab.path)
    }
  }
}

export function useVaultFileWatcher(): void {
  const vaultPath = useVaultStore((s) => s.vault?.path)
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!vaultPath) return

    const scheduleRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      refreshTimer.current = setTimeout(() => {
        refreshTimer.current = null
        void refreshFileTree()
      }, 80)
    }

    const handleChange = (event: VaultFileChangeEvent) => {
      const currentVaultPath = useVaultStore.getState().vault?.path
      if (!currentVaultPath || event.vaultPath !== currentVaultPath) return

      scheduleRefresh()

      if (event.type === 'unlink' || event.type === 'unlinkDir') {
        removeDeletedPaths(event, currentVaultPath)
        return
      }

      if (event.type === 'add' || event.type === 'change') {
        void syncChangedMarkdownFile(event, currentVaultPath)
      }
    }

    const unsubscribe = window.vault.onFileChanged(handleChange)

    return () => {
      unsubscribe()
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current)
        refreshTimer.current = null
      }
    }
  }, [vaultPath])
}
