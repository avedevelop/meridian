import React, { useState, useEffect, useMemo } from 'react'
import { useVaultStore } from '../../store/useVaultStore'
import { useLinkStore } from '../../store/useLinkStore'
import { useVaultBridge } from '../../hooks/useVaultBridge'
import { FileIcon } from '../Icons'

interface TaskItem {
  id: string
  filePath: string
  fileName: string
  text: string
  completed: boolean
  lineIndex: number
}

export function TasksPanel() {
  const { openFile, saveFile } = useVaultBridge()
  const { openTabs, setTabContent } = useVaultStore()
  const indexVersion = useLinkStore((s) => s.indexVersion)
  const allFiles = useMemo(() => {
    return useLinkStore.getState().allFiles()
  }, [indexVersion])

  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'all'>('pending')
  const [searchQuery, setSearchQuery] = useState('')

  // Scan all markdown files for checklists
  useEffect(() => {
    let active = true
    const scanFiles = async () => {
      setLoading(true)
      try {
        const mdFiles = allFiles.filter((f) => f.endsWith('.md'))
        const foundTasks: TaskItem[] = []

        // Read all files in parallel
        const fileContents = await Promise.all(
          mdFiles.map(async (f) => {
            try {
              const content = await window.vault.readFile(f)
              return { path: f, content }
            } catch {
              return { path: f, content: '' }
            }
          })
        )

        if (!active) return

        fileContents.forEach(({ path, content }) => {
          const fileName = path.split('/').pop() ?? ''
          const lines = content.split('\n')
          lines.forEach((line, idx) => {
            const match = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.+)$/)
            if (match) {
              const completed = match[1].toLowerCase() === 'x'
              const text = match[2].trim()
              foundTasks.push({
                id: `${path}:${idx}`,
                filePath: path,
                fileName: fileName.replace(/\.md$/, ''),
                text,
                completed,
                lineIndex: idx
              })
            }
          })
        })

        setTasks(foundTasks)
      } catch (err) {
        console.error('[TasksPanel] Scanning error:', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    scanFiles()
    return () => {
      active = false
    }
  }, [allFiles, indexVersion])

  // Toggle checklist checkbox state on disk
  const handleToggleTask = async (task: TaskItem, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      // 1. Read file content
      const content = await window.vault.readFile(task.filePath)
      const lines = content.split('\n')

      // 2. Modify target line using regex
      const targetLine = lines[task.lineIndex]
      const match = targetLine.match(/^(\s*[-*]\s+\[)([ xX])(\]\s+.+)$/)
      if (match) {
        const currentMark = match[2].toLowerCase()
        const newMark = currentMark === 'x' ? ' ' : 'x'
        lines[task.lineIndex] = `${match[1]}${newMark}${match[3]}`

        const newContent = lines.join('\n')

        // 3. Save to disk
        await saveFile(task.filePath, newContent)

        // 4. Update tab content if it's currently open in the editor
        const isOpen = openTabs.some((t) => t.path === task.filePath)
        if (isOpen) {
          setTabContent(task.filePath, newContent)
        }
      }
    } catch (err) {
      console.error('[TasksPanel] Error toggling task:', err)
    }
  }

  // Filter tasks based on active category tab & search keyword
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesTab =
        activeTab === 'all' ||
        (activeTab === 'pending' && !t.completed) ||
        (activeTab === 'completed' && t.completed)

      const matchesSearch =
        !searchQuery.trim() ||
        t.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.fileName.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesTab && matchesSearch
    })
  }, [tasks, activeTab, searchQuery])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search Filter Header */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)' }}>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter tasks..."
          style={{
            width: '100%',
            padding: '6px 10px',
            borderRadius: 6,
            background: 'var(--bg-surface)',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: 12,
            marginBottom: 8
          }}
        />

        {/* Categories Tab Selector */}
        <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.2)', padding: 2, borderRadius: 6 }}>
          {(['pending', 'completed', 'all'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                border: 'none',
                background: activeTab === tab ? 'var(--bg-surface)' : 'transparent',
                color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: 11,
                fontWeight: activeTab === tab ? 600 : 500,
                padding: '4px 0',
                borderRadius: 4,
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.12s ease-out'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Task List Panel */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 4px' }}>
        {loading && tasks.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Scanning vault...</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 8px' }}>
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '8px',
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={(e) => handleToggleTask(task, e as any)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    marginTop: 2,
                    cursor: 'pointer',
                    accentColor: 'var(--accent-color)'
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
                  <span
                    onClick={() => openFile(task.filePath, `${task.fileName}.md`)}
                    style={{
                      fontSize: 12.5,
                      color: task.completed ? 'var(--text-secondary)' : 'var(--text-primary)',
                      textDecoration: task.completed ? 'line-through' : 'none',
                      cursor: 'pointer',
                      wordBreak: 'break-word',
                      lineHeight: '1.4'
                    }}
                  >
                    {task.text}
                  </span>
                  <div
                    onClick={() => openFile(task.filePath, `${task.fileName}.md`)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 10,
                      color: 'var(--accent-color)',
                      cursor: 'pointer',
                      marginTop: 2,
                      width: 'fit-content'
                    }}
                  >
                    <FileIcon size={9} color="var(--accent-color)" />
                    <span style={{ opacity: 0.8 }}>{task.fileName}</span>
                  </div>
                </div>
              </div>
            ))}
            {filteredTasks.length === 0 && (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>
                No tasks found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
