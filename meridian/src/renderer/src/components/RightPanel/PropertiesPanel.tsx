import { useMemo, useCallback } from 'react'
import { useVaultStore } from '../../store/useVaultStore'

type FrontmatterValue = string | string[]
type Frontmatter = Record<string, FrontmatterValue>

function parseFrontmatter(content: string): Frontmatter | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return null
  const lines = match[1].split(/\r?\n/)
  const result: Frontmatter = {}
  for (const line of lines) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    if (!key) continue
    const rawVal = line.slice(colonIdx + 1).trim()
    if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
      result[key] = rawVal
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    } else {
      result[key] = rawVal
    }
  }
  return Object.keys(result).length > 0 ? result : null
}

function serializeFrontmatter(fm: Frontmatter): string {
  const lines = Object.entries(fm).map(([k, v]) => {
    if (Array.isArray(v)) return `${k}: [${v.join(', ')}]`
    return `${k}: ${v}`
  })
  return `---\n${lines.join('\n')}\n---`
}

function updateContent(content: string, key: string, value: string): string {
  const fm = parseFrontmatter(content) ?? {}
  fm[key] = value
  const newHeader = serializeFrontmatter(fm)
  if (/^---[\s\S]*?---/.test(content)) {
    return content.replace(/^---[\s\S]*?---/, newHeader)
  }
  return newHeader + '\n\n' + content
}

export function PropertiesPanel() {
  const { panes, activePaneId, setTabContent, markTabDirty } = useVaultStore()
  const activePane = panes.find((p) => p.id === activePaneId) ?? panes[0]
  const activeTab = activePane?.openTabs.find((t) => t.path === activePane?.activeTabPath)

  const frontmatter = useMemo(() => {
    if (!activeTab) return null
    return parseFrontmatter(activeTab.content)
  }, [activeTab?.content])

  const handleChange = useCallback(
    (key: string, value: string) => {
      if (!activeTab) return
      const newContent = updateContent(activeTab.content, key, value)
      setTabContent(activeTab.path, newContent)
      markTabDirty(activeTab.path, true)
    },
    [activeTab, setTabContent, markTabDirty]
  )

  const handleAddProperty = useCallback(() => {
    if (!activeTab) return
    const key = window.prompt('Property name:')
    if (!key?.trim()) return
    handleChange(key.trim(), '')
  }, [activeTab, handleChange])

  if (!activeTab) {
    return (
      <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 12 }}>
        No file open
      </div>
    )
  }

  return (
    <div key={activeTab.path} style={{ padding: '16px 16px 20px' }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--text-secondary)',
          marginBottom: 12
        }}
      >
        Properties
      </div>

      {frontmatter === null && (
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
          No frontmatter found.
        </div>
      )}

      {frontmatter !== null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Object.entries(frontmatter).map(([key, val]) => (
            <div key={key}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                {key}
              </div>
              <input
                defaultValue={Array.isArray(val) ? val.join(', ') : val}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)'
                  handleChange(key, e.target.value)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-color)')}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s ease'
                }}
              />
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleAddProperty}
        style={{
          marginTop: 16,
          width: '100%',
          padding: '8px 0',
          background: 'var(--accent-glow)',
          border: '1px solid var(--border-color)',
          borderRadius: 6,
          color: 'var(--text-secondary)',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--text-primary)'
          e.currentTarget.style.background = 'var(--bg-surface)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-secondary)'
          e.currentTarget.style.background = 'var(--accent-glow)'
        }}
      >
        + Add property
      </button>
    </div>
  )
}
