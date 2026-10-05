import { memo, useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { looksLikeUrl } from '@shared/clipboardNote'
import { shortAge, type ClipboardRowData } from './clipboardRows'

interface Props {
  row: ClipboardRowData
  selected: boolean
  onSelect: (key: string) => void
  onActivate: (key: string) => void
}

const badge: CSSProperties = {
  flex: '0 0 auto',
  width: 38,
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.04em',
  textAlign: 'center',
  padding: '2px 0',
  borderRadius: 4,
  background: 'var(--bg-tertiary, rgba(255,255,255,0.06))',
  color: 'var(--text-secondary, #888)'
}

function badgeLabel(row: ClipboardRowData): string {
  if (row.type === 'snippet') return 'SNIP'
  const { entry } = row
  if (entry.kind === 'image') return 'IMG'
  if (entry.kind === 'files') return 'FILE'
  if (entry.kind === 'html') return 'RICH'
  return looksLikeUrl(entry.preview) ? 'URL' : 'TXT'
}

function Thumbnail({ id }: { id: string }): React.ReactElement | null {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    void window.clipboardHistory.getImage(id).then((url) => alive && setSrc(url))
    return () => {
      alive = false
    }
  }, [id])
  if (!src) return null
  return (
    <img
      src={src}
      alt=""
      style={{ height: 44, maxWidth: 120, objectFit: 'cover', borderRadius: 4, flex: '0 0 auto' }}
    />
  )
}

export const ClipboardRow = memo(function ClipboardRow({
  row,
  selected,
  onSelect,
  onActivate
}: Props): React.ReactElement {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selected) ref.current?.scrollIntoView?.({ block: 'nearest' })
  }, [selected])

  const isEntry = row.type === 'entry'
  const preview = isEntry ? row.entry.preview : row.snippet.name
  const secondary = isEntry ? null : row.snippet.preview

  return (
    <div
      ref={ref}
      role="option"
      aria-selected={selected}
      data-key={row.key}
      onMouseMove={() => !selected && onSelect(row.key)}
      onClick={() => onActivate(row.key)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '7px 12px',
        cursor: 'pointer',
        background: selected ? 'var(--accent-glow, rgba(124,106,247,0.18))' : 'transparent',
        borderLeft: `2px solid ${selected ? 'var(--accent-color, #7c6af7)' : 'transparent'}`
      }}
    >
      <span style={badge}>{badgeLabel(row)}</span>
      {isEntry && row.entry.kind === 'image' && <Thumbnail id={row.entry.id} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          title={isEntry && row.entry.sensitive ? t('clipboard.sensitive') : undefined}
          style={{
            fontSize: 13,
            color: 'var(--text-primary, #ccc)',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            letterSpacing: isEntry && row.entry.sensitive ? '0.15em' : undefined
          }}
        >
          {preview}
        </div>
        {secondary && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-secondary, #888)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {secondary}
          </div>
        )}
      </div>
      {isEntry && row.entry.pinned && (
        <span aria-label={t('clipboard.pinned')} style={{ color: 'var(--accent-color, #7c6af7)' }}>
          ★
        </span>
      )}
      {isEntry && (
        <span style={{ fontSize: 11, color: 'var(--text-secondary, #888)', flex: '0 0 auto' }}>
          {shortAge(row.entry.lastUsedAt)}
        </span>
      )}
    </div>
  )
})
