import { useEffect, useRef } from 'react'
import { useVaultStore } from '../store/useVaultStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { useVaultBridge } from './useVaultBridge'

export type CloseBehavior = 'ask' | 'save' | 'discard'

export function shouldBlockWindowClose(closeBehavior: CloseBehavior, dirtyCount: number): boolean {
  return closeBehavior === 'ask' && dirtyCount > 0
}

export function useAutoSave() {
  const { openTabs, activeTabPath } = useVaultStore()
  const { autoSaveTrigger, autoSaveDelay, closeBehavior } = useSettingsStore()
  const { saveFile } = useVaultBridge()

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

  const activeTab = openTabs.find((t) => t.path === activeTabPath)
  const activeContent = activeTab?.content
  const activePath = activeTab?.path
  const activeDirty = activeTab?.isDirty

  // 1. afterDelay auto-save
  useEffect(() => {
    if (autoSaveTrigger !== 'afterDelay' || !activePath || !activeDirty) {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
      return
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = setTimeout(async () => {
      await saveFile(activePath, activeContent || '')
    }, autoSaveDelay * 1000)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [activeContent, activePath, activeDirty, autoSaveTrigger, autoSaveDelay, saveFile])

  // 2. onWindowBlur (Window loses focus / Alt-Tab)
  useEffect(() => {
    const handleWindowBlur = async () => {
      if (autoSaveTrigger === 'onWindowBlur') {
        const dirtyTabs = useVaultStore.getState().openTabs.filter((t) => t.isDirty)
        for (const tab of dirtyTabs) {
          await saveFile(tab.path, tab.content)
        }
      }
    }

    window.addEventListener('blur', handleWindowBlur)
    return () => window.removeEventListener('blur', handleWindowBlur)
  }, [autoSaveTrigger, saveFile])

  // 3. onFocusChange (Editor loses focus)
  useEffect(() => {
    const handleFocusOut = () => {
      if (autoSaveTrigger !== 'onFocusChange') return

      // Use a brief timeout to check document.activeElement after focus shifts
      setTimeout(async () => {
        const activeEl = document.activeElement
        const isInsideEditor = activeEl?.closest('.cm-editor')
        if (!isInsideEditor) {
          const currentActiveTab = useVaultStore
            .getState()
            .openTabs.find((t) => t.path === useVaultStore.getState().activeTabPath)
          if (currentActiveTab && currentActiveTab.isDirty) {
            await saveFile(currentActiveTab.path, currentActiveTab.content)
          }
        }
      }, 100)
    }

    document.addEventListener('focusout', handleFocusOut)
    return () => document.removeEventListener('focusout', handleFocusOut)
  }, [autoSaveTrigger, saveFile])

  // 4. closeBehavior handling (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const dirtyTabs = useVaultStore.getState().openTabs.filter((t) => t.isDirty)
      if (dirtyTabs.length === 0) return

      if (closeBehavior === 'save') {
        // Save all dirty tabs synchronously to guarantee write on exit
        dirtyTabs.forEach((tab) => {
          window.vault.writeFile(tab.path, tab.content)
        })
      }

      if (shouldBlockWindowClose(closeBehavior, dirtyTabs.length)) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }

      return undefined
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [closeBehavior])
}
