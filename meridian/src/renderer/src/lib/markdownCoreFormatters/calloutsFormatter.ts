import type { EditorView } from '@codemirror/view'
import { Decoration } from '@codemirror/view'
import type { MarkdownFormatter, CmEntry } from '../markdownCore'
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

function cmDecorations(view: EditorView): CmEntry[] {
  const { state } = view
  const head = state.selection.main.head
  const entries: CmEntry[] = []
  const calloutStart = /^> \[!([\w]+)\](.*)/

  for (let i = 1; i <= state.doc.lines; i++) {
    const line = state.doc.line(i)
    const m = line.text.match(calloutStart)
    if (!m) continue

    const typeKey = m[1].toLowerCase()
    const info = CALLOUT_TYPES[typeKey] ?? { icon: '📝', color: '#6b7280' }
    const onCursor = head >= line.from && head <= line.to

    entries.push({
      from: line.from, to: line.from,
      deco: Decoration.line({ class: `cm-lp-callout cm-lp-callout-${typeKey}`, attributes: { style: `--callout-color:${info.color}` } })
    })

    if (!onCursor) {
      const prefixEnd = line.from + m[0].length
      entries.push({ from: line.from, to: prefixEnd, deco: Decoration.replace({}) })
    }

    let j = i + 1
    while (j <= state.doc.lines) {
      const bodyLine = state.doc.line(j)
      if (!bodyLine.text.startsWith('> ') && bodyLine.text !== '>') break
      const onBodyCursor = head >= bodyLine.from && head <= bodyLine.to
      entries.push({
        from: bodyLine.from, to: bodyLine.from,
        deco: Decoration.line({ class: 'cm-lp-callout-body', attributes: { style: `--callout-color:${info.color}` } })
      })
      if (!onBodyCursor) {
        const gtEnd = bodyLine.text.startsWith('> ') ? bodyLine.from + 2 : bodyLine.from + 1
        entries.push({ from: bodyLine.from, to: gtEnd, deco: Decoration.replace({}) })
      }
      j++
    }
    i = j - 1
  }

  return entries
}

export const calloutsFormatter: MarkdownFormatter = {
  name: 'callouts',
  preprocessMd,
  cmDecorations,
}
