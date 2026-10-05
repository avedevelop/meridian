import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SaveTarget } from '@shared/clipboard'
import type { ClipboardRowData } from './clipboardRows'

const MESSAGE_MS = 1500

/** Actions on the selected row: copy back, pin, delete, save to a note. Shows a short status message. */
export function useClipboardActions(reload: () => void) {
  const { t } = useTranslation()
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    []
  )

  const flash = useCallback((text: string) => {
    setMessage(text)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setMessage(null), MESSAGE_MS)
  }, [])

  const activate = useCallback(
    async (row: ClipboardRowData, plain: boolean) => {
      const api = window.clipboardHistory
      const ok =
        row.type === 'snippet'
          ? await api.useSnippet(row.snippet.name)
          : await api.copyBack(row.entry.id, { plain })
      if (ok) await api.hide()
      else flash(t('clipboard.copyFailed'))
    },
    [flash, t]
  )

  const togglePin = useCallback(
    async (row: ClipboardRowData) => {
      if (row.type !== 'entry') return
      await window.clipboardHistory.pin(row.entry.id, !row.entry.pinned)
      reload()
    },
    [reload]
  )

  const remove = useCallback(
    async (row: ClipboardRowData) => {
      if (row.type !== 'entry') return
      await window.clipboardHistory.remove(row.entry.id)
      reload()
    },
    [reload]
  )

  const save = useCallback(
    async (row: ClipboardRowData, target: SaveTarget) => {
      if (row.type !== 'entry') return
      const result = await window.clipboardHistory.saveToNote(row.entry.id, target)
      if (result.ok) flash(t(`clipboard.saved.${target}`))
      else flash(result.error === 'no-vault' ? t('clipboard.noVault') : t('clipboard.saveFailed'))
    },
    [flash, t]
  )

  return { message, flash, activate, togglePin, remove, save }
}
