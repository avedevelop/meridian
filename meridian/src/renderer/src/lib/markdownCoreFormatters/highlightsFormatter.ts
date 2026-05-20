import type { EditorView } from '@codemirror/view'
import { Decoration } from '@codemirror/view'
import type { MarkdownFormatter, CmEntry } from '../markdownCore'

function preprocessMd(md: string): string {
  return md.replace(/(`+[\s\S]*?`+)|==([^=\n]{1,300})==/g, (m, code, hl) => {
    if (code !== undefined) return m
    return `<mark style="background:rgba(255,220,0,0.3);border-radius:2px;padding:0 2px">${hl}</mark>`
  })
}

function cmDecorations(view: EditorView): CmEntry[] {
  const { state } = view
  const head = state.selection.main.head
  const entries: CmEntry[] = []
  const re = /==([^=\n]{1,300})==/g
  const text = state.doc.toString()
  let m: RegExpExecArray | null

  while ((m = re.exec(text)) !== null) {
    const from = m.index
    const to = from + m[0].length
    const innerFrom = from + 2
    const innerTo = to - 2
    const line = state.doc.lineAt(from)
    const onCursor = head >= line.from && head <= line.to

    entries.push({ from, to, deco: Decoration.mark({ class: 'cm-lp-highlight' }) })

    if (!onCursor) {
      entries.push({ from, to: innerFrom, deco: Decoration.replace({}) })
      entries.push({ from: innerTo, to, deco: Decoration.replace({}) })
    }
  }

  return entries
}

export const highlightsFormatter: MarkdownFormatter = {
  name: 'highlights',
  preprocessMd,
  cmDecorations,
}
