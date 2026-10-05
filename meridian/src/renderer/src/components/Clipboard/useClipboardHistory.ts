import { useCallback, useEffect, useRef, useState } from 'react'
import type { ClipboardSettings } from '@shared/clipboard'
import {
  entryRows,
  filterToQuery,
  snippetRows,
  type ClipboardRowData,
  type FilterId
} from './clipboardRows'

const PAGE = 50
const DEBOUNCE_MS = 100

export interface ClipboardHistory {
  rows: ClipboardRowData[]
  settings: ClipboardSettings | null
  total: number
  hasMore: boolean
  loadMore: () => void
  reload: () => void
  updateSettings: (patch: Partial<ClipboardSettings>) => Promise<void>
}

/** History list for the clipboard window: search, filters, paging, live refresh. */
export function useClipboardHistory(query: string, filter: FilterId): ClipboardHistory {
  const api = window.clipboardHistory
  const [rows, setRows] = useState<ClipboardRowData[]>([])
  const [total, setTotal] = useState(0)
  const [cursor, setCursor] = useState<string | null>(null)
  const [settings, setSettings] = useState<ClipboardSettings | null>(null)
  const requestId = useRef(0)
  const cursorRef = useRef<string | null>(null)

  const load = useCallback(
    async (append: boolean) => {
      const id = ++requestId.current
      if (filter === 'snippets') {
        const snippets = snippetRows(await api.listSnippets(), query)
        if (id !== requestId.current) return
        setRows(snippets)
        setTotal(snippets.length)
        cursorRef.current = null
        setCursor(null)
        return
      }
      const result = await api.list({
        query,
        ...filterToQuery(filter),
        limit: PAGE,
        cursor: append ? cursorRef.current : null
      })
      if (id !== requestId.current) return
      const next = entryRows(result.items)
      setRows((prev) => (append ? [...prev, ...next] : next))
      setTotal(result.total)
      cursorRef.current = result.nextCursor
      setCursor(result.nextCursor)
    },
    [api, query, filter]
  )

  useEffect(() => {
    const timer = setTimeout(() => void load(false), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [load])

  const reload = useCallback(() => void load(false), [load])

  useEffect(() => {
    void api.getSettings().then(setSettings)
    const offChanged = api.onChanged(reload)
    const offShown = api.onShown(() => {
      reload()
      void api.getSettings().then(setSettings)
    })
    return () => {
      offChanged()
      offShown()
    }
  }, [api, reload])

  const loadMore = useCallback(() => {
    if (cursorRef.current) void load(true)
  }, [load])

  const updateSettings = useCallback(
    async (patch: Partial<ClipboardSettings>) => {
      setSettings(await api.setSettings(patch))
      reload()
    },
    [api, reload]
  )

  return { rows, settings, total, hasMore: cursor !== null, loadMore, reload, updateSettings }
}
