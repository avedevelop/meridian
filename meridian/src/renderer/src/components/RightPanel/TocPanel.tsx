import { useMemo } from 'react'
import { useVaultStore } from '../../store/useVaultStore'
import { FileIcon, EditNoteIcon } from '../Icons'

export interface TocHeading {
  level: number
  text: string
  index: number
}

export function parseHeadings(content: string): TocHeading[] {
  const headings: TocHeading[] = []
  let inCodeBlock = false
  let index = 0

  for (const line of content.split('\n')) {
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) continue

    const match = line.match(/^(#{1,6})\s+(.+)/)
    if (match) {
      headings.push({ level: match[1].length, text: match[2].trim(), index: index++ })
    }
  }

  return headings
}

function scrollToHeading(index: number) {
  const el = document.querySelector(`.markdown-preview #toc-${index}`)
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function TocPanel() {
  const { openTabs, activeTabPath } = useVaultStore()
  const activeTab = openTabs.find((t) => t.path === activeTabPath)

  const isCanvas = activeTab?.path.endsWith('.canvas')

  const headings = useMemo(() => {
    if (isCanvas) return []
    return parseHeadings(activeTab?.content ?? '')
  }, [activeTab?.content, isCanvas])

  const canvasNodes = useMemo(() => {
    if (!isCanvas || !activeTab?.content) return []
    try {
      const data = JSON.parse(activeTab.content)
      return (data.nodes || []) as { id: string; text?: string; file?: string; type: string }[]
    } catch {
      return []
    }
  }, [activeTab?.content, isCanvas])

  if (!activeTab) {
    return (
      <div style={{ padding: 16, color: 'var(--text-secondary)', opacity: 0.5, fontSize: 13 }}>
        No note open.
      </div>
    )
  }

  if (isCanvas) {
    if (canvasNodes.length === 0) {
      return (
        <div style={{ padding: 16, color: 'var(--text-secondary)', opacity: 0.5, fontSize: 13 }}>
          Canvas is empty.
        </div>
      )
    }
    return (
      <div style={{ padding: '12px 0', fontSize: 13 }}>
        {canvasNodes.map((node) => {
          const displayText =
            node.type === 'file' && node.file ? node.file.split('/').pop() : node.text || 'Untitled'
          return (
            <div
              key={node.id}
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent('canvas:center-node', { detail: { nodeId: node.id } })
                )
              }}
              title={displayText}
              style={{
                padding: '6px 16px',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                fontSize: 12,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                borderLeft: '3px solid transparent',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)'
                e.currentTarget.style.borderLeft = '3px solid var(--accent-color)'
                e.currentTarget.style.background = 'var(--bg-surface)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)'
                e.currentTarget.style.borderLeft = '3px solid transparent'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <span
                style={{
                  color: 'var(--text-secondary)',
                  opacity: 0.6,
                  marginRight: 8,
                  display: 'inline-flex',
                  alignItems: 'center'
                }}
              >
                {node.type === 'file' ? (
                  <FileIcon size={12} color="var(--accent-color)" />
                ) : (
                  <EditNoteIcon size={12} color="var(--accent-color)" />
                )}
              </span>
              {displayText}
            </div>
          )
        })}
      </div>
    )
  }

  if (headings.length === 0) {
    return (
      <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12, opacity: 0.6 }}>
        No headings in this file
      </div>
    )
  }

  return (
    <div style={{ padding: '12px 0', fontSize: 13 }}>
      {headings.map((h) => (
        <div
          key={h.index}
          onClick={() => scrollToHeading(h.index)}
          title={h.text}
          style={{
            paddingLeft: 16 + (h.level - 1) * 12,
            paddingRight: 16,
            paddingTop: 6,
            paddingBottom: 6,
            cursor: 'pointer',
            color: h.level === 1 ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: h.level === 1 ? 13 : 12,
            fontWeight: h.level === 1 ? 600 : 400,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            borderLeft: `3px solid ${h.level === 1 ? 'var(--accent-color)' : 'transparent'}`,
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)'
            e.currentTarget.style.background = 'var(--bg-surface)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = h.level === 1 ? 'var(--text-primary)' : 'var(--text-secondary)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          {h.text}
        </div>
      ))}
    </div>
  )
}
