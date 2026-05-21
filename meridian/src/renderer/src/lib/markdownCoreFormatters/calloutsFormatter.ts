import type { MarkdownFormatter } from '../markdownCore'
import { CALLOUT_TYPES } from '../../components/Editor/markdownUtils'

function preprocessMd(md: string): string {
  return md.replace(
    /^(> \[!([\w]+)\][^\n]*(?:\n> [^\n]*)*)/gm,
    (block) => {
      const lines = block.split('\n')
      const firstLine = lines[0]
      const m = firstLine.match(/^> \[!([\w]+)\](.*)/)
      if (!m) return block
      const typeKey = m[1].toLowerCase()
      const info = CALLOUT_TYPES[typeKey] ?? { icon: '📝', color: '#6b7280' }
      const displayTitle = m[2].trim() || (typeKey.charAt(0).toUpperCase() + typeKey.slice(1))
      const body = lines.slice(1).map((l) => l.replace(/^> ?/, '')).join('\n').trim()
      return `<div class="callout callout-${typeKey}" style="border-left:4px solid ${info.color};background:${info.color}22;border-radius:6px;padding:12px 16px;margin:12px 0"><div class="callout-title" style="display:flex;align-items:center;gap:6px;font-weight:600;margin-bottom:${body ? '8px' : '0'};color:${info.color}"><span>${info.icon}</span><span>${displayTitle}</span></div>${body ? `<div class="callout-content">${body}</div>` : ''}</div>`
    }
  )
}

export const calloutsFormatter: MarkdownFormatter = {
  name: 'callouts',
  preprocessMd,
}
