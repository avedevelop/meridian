import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useVaultStore } from '../../store/useVaultStore'
import { useLinkStore } from '../../store/useLinkStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'
import { FileIcon } from '../Icons'

export function CalendarPanel() {
  const { t } = useTranslation()
  const { vault, files } = useVaultStore()
  const { openFile, refreshFiles } = useVaultBridge()
  const indexVersion = useLinkStore((s) => s.indexVersion)
  const allFiles = useMemo(() => {
    return useLinkStore.getState().allFiles()
  }, [indexVersion])

  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // 1-indexed days of week starting from Monday (0: Monday, ..., 6: Sunday)
  const weekdays = useMemo(() => {
    return t('calendar.weekdays').split(',')
  }, [t])

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const selectToday = () => {
    setCurrentDate(new Date())
  }

  // Get start day of month (adjusted to Monday-based index)
  const firstDayIndex = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    // JS getDay() is 0 (Sunday) to 6 (Saturday). We map to 0 (Monday) to 6 (Sunday).
    return firstDay === 0 ? 6 : firstDay - 1
  }, [year, month])

  // Get total days in month
  const totalDays = useMemo(() => {
    return new Date(year, month + 1, 0).getDate()
  }, [year, month])

  // Generate date string helper YYYY-MM-DD
  const formatDateStr = (dayNum: number) => {
    const mm = String(month + 1).padStart(2, '0')
    const dd = String(dayNum).padStart(2, '0')
    return `${year}-${mm}-${dd}`
  }

  // Check if a date has a daily note
  const getDailyNotePath = (dateStr: string) => {
    if (!vault) return null
    // Daily notes are expected at [vault.path]/Daily/YYYY-MM-DD.md
    const target = `/Daily/${dateStr}.md`
    return allFiles.find((f) => f.replace(/\\/g, '/').endsWith(target)) || null
  }

  const handleDayClick = (dayNum: number) => {
    const dateStr = formatDateStr(dayNum)
    setSelectedDates((prev) => {
      const next = new Set(prev)
      next.has(dateStr) ? next.delete(dateStr) : next.add(dateStr)
      return next
    })
  }

  // Handle opening or creating a daily note for a date
  const handleDayDoubleClick = async (dayNum: number) => {
    if (!vault) return
    const dateStr = formatDateStr(dayNum)
    const existingPath = getDailyNotePath(dateStr)

    if (existingPath) {
      openFile(existingPath, `${dateStr}.md`)
    } else {
      // Create new daily note for this date
      const fileName = `${dateStr}.md`
      const dailyDir = `${vault.path}/Daily`

      try {
        await window.vault.createDir(vault.path, 'Daily')
      } catch {
        // Ignored, folder likely exists
      }

      try {
        const filePath = await window.vault.createFile(dailyDir, fileName)
        useLinkStore.getState().indexFile(filePath, fileName, '', vault.path)
        await refreshFiles()
        await openFile(filePath, fileName)
      } catch (e) {
        console.error('[CalendarPanel] Error creating daily note:', e)
      }
    }
  }

  // Collect and sort recent files recursively
  const recentEdits = useMemo(() => {
    interface FlatFile {
      path: string
      name: string
      mtime: number
    }
    const flat: FlatFile[] = []

    const recurse = (nodes: import('@shared/types').VaultFile[]) => {
      for (const n of nodes) {
        if (!n.isDirectory) {
          flat.push({
            path: n.path,
            name: n.name,
            mtime: n.mtime || 0
          })
        } else if (n.children) {
          recurse(n.children)
        }
      }
    }
    recurse(files)

    const selected = Array.from(selectedDates)
    const filtered =
      selected.length === 0
        ? flat
        : flat.filter((item) => {
            const normalized = `${item.path}/${item.name}`.replace(/\\/g, '/')
            return selected.some((date) => normalized.includes(date))
          })

    // Sort descending by modified time
    return filtered.sort((a, b) => b.mtime - a.mtime).slice(0, 10)
  }, [files, indexVersion, selectedDates])

  const todayStr = useMemo(() => {
    const d = new Date()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${mm}-${dd}`
  }, [])

  const monthNames = useMemo(() => {
    return t('calendar.months').split(',')
  }, [t])

  // Render cells list
  const cells = useMemo(() => {
    const list: (number | null)[] = []
    for (let i = 0; i < firstDayIndex; i++) {
      list.push(null)
    }
    for (let d = 1; d <= totalDays; d++) {
      list.push(d)
    }
    return list
  }, [firstDayIndex, totalDays])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      {/* Calendar section */}
      <div style={{ padding: '16px 12px', borderBottom: '1px solid var(--border-color)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            {monthNames[month]} {year}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={selectToday}
              style={{
                background: 'var(--bg-surface)',
                border: 'none',
                borderRadius: 4,
                padding: '2px 8px',
                fontSize: 11,
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              {t('calendar.today')}
            </button>
            <button
              onClick={prevMonth}
              style={{
                background: 'var(--bg-surface)',
                border: 'none',
                borderRadius: 4,
                width: 22,
                height: 22,
                fontSize: 11,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ←
            </button>
            <button
              onClick={nextMonth}
              style={{
                background: 'var(--bg-surface)',
                border: 'none',
                borderRadius: 4,
                width: 22,
                height: 22,
                fontSize: 11,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              →
            </button>
          </div>
        </div>

        {/* Days grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 4,
            textAlign: 'center',
            fontSize: 11
          }}
        >
          {weekdays.map((wd) => (
            <div
              key={wd}
              style={{ color: 'var(--text-secondary)', fontWeight: 600, paddingBottom: 6 }}
            >
              {wd}
            </div>
          ))}
          {cells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} />
            }

            const dateStr = formatDateStr(day)
            const isToday = dateStr === todayStr
            const existingPath = getDailyNotePath(dateStr)
            const isSelected = selectedDates.has(dateStr)

            return (
              <div
                key={`day-${day}`}
                onClick={() => handleDayClick(day)}
                onDoubleClick={() => handleDayDoubleClick(day)}
                title={existingPath ? t('calendar.openDailyNote') : t('calendar.filterByDate')}
                style={{
                  position: 'relative',
                  aspectRatio: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  borderRadius: 6,
                  color: existingPath ? 'var(--accent-color)' : 'var(--text-primary)',
                  fontWeight: existingPath ? '700' : 'normal',
                  background: isSelected
                    ? 'rgba(var(--accent-rgb, 100, 108, 255), 0.24)'
                    : existingPath
                    ? 'rgba(var(--accent-rgb, 100, 108, 255), 0.12)'
                    : 'transparent',
                  border: isSelected
                    ? '1px solid var(--accent-color)'
                    : isToday
                      ? '1px solid var(--accent-color)'
                      : '1px solid transparent',
                  boxShadow: isSelected
                    ? '0 0 0 1px rgba(var(--accent-rgb, 100, 108, 255), 0.35)'
                    : existingPath
                    ? '0 0 8px rgba(var(--accent-rgb, 100, 108, 255), 0.2)'
                    : 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isSelected
                    ? 'rgba(var(--accent-rgb, 100, 108, 255), 0.32)'
                    : existingPath
                    ? 'rgba(var(--accent-rgb, 100, 108, 255), 0.22)'
                    : 'var(--bg-surface)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isSelected
                    ? 'rgba(var(--accent-rgb, 100, 108, 255), 0.24)'
                    : existingPath
                    ? 'rgba(var(--accent-rgb, 100, 108, 255), 0.12)'
                    : 'transparent'
                }}
              >
                {day}
                {existingPath && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 3,
                      width: 3,
                      height: 3,
                      borderRadius: '50%',
                      background: 'var(--accent-color)'
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
        {selectedDates.size > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 10,
              color: 'var(--text-secondary)',
              fontSize: 11
            }}
          >
            <span style={{ flex: 1 }}>
              {t('calendar.selectedDates', { count: selectedDates.size })}
            </span>
            <button
              onClick={() => setSelectedDates(new Set())}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                borderRadius: 5,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 11,
                padding: '3px 7px'
              }}
            >
              {t('calendar.clearDates')}
            </button>
          </div>
        )}
      </div>

      {/* Recent edits list */}
      <div style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column' }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 8
          }}
        >
          {t('calendar.recentEdits')}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {recentEdits.map((item) => (
            <div
              key={item.path}
              onClick={() => openFile(item.path, item.name)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 8px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 12,
                color: 'var(--text-primary)'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <FileIcon size={12} color="var(--accent-color)" />
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                <span
                  style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
                >
                  {item.name
                    .replace(/\.md$/, '')
                    .replace(/\.canvas$/, ' ⊞')
                    .replace(/\.excalidraw$/, ' ✎')}
                </span>
              </div>
            </div>
          ))}
          {recentEdits.length === 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '4px 8px' }}>
              {selectedDates.size > 0 ? t('calendar.noFilesForDates') : t('calendar.noFiles')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
