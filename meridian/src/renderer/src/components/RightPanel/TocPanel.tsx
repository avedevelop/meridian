import { useMemo } from 'react'
import { useVaultStore } from '../../store/useVaultStore'

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
  const activeTab = openTabs.find(t => t.path === activeTabPath)

  const headings = useMemo(
    () => parseHeadings(activeTab?.content ?? ''),
    [activeTab?.content]
  )

  if (!activeTab) {
    return <div style={{ padding: 12, color: '#444', fontSize: 12 }}>No note open.</div>
  }

  if (headings.length === 0) {
    return (
      <div style={{ padding: 12, color: '#444', fontSize: 12 }}>
        No headings found. Use # Heading in your note.
      </div>
    )
  }

  return (
    <div style={{ padding: '8px 0', fontSize: 12 }}>
      {headings.map(h => (
        <div
          key={h.index}
          onClick={() => scrollToHeading(h.index)}
          title={h.text}
          style={{
            paddingLeft: 8 + (h.level - 1) * 12,
            paddingRight: 12,
            paddingTop: 4,
            paddingBottom: 4,
            cursor: 'pointer',
            color: h.level === 1 ? '#ccc' : h.level === 2 ? '#aaa' : '#777',
            fontSize: h.level === 1 ? 12 : 11,
            fontWeight: h.level === 1 ? 600 : 400,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            borderLeft: `2px solid ${h.level === 1 ? '#7c6af7' : 'transparent'}`,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = h.level === 1 ? '#ccc' : h.level === 2 ? '#aaa' : '#777')}
        >
          {h.text}
        </div>
      ))}
    </div>
  )
}
