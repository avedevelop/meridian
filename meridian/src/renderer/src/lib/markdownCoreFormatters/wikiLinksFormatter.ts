import type { EditorView } from '@codemirror/view'
import { Decoration } from '@codemirror/view'
import type { VaultFile } from '@shared/types'
import type { MarkdownFormatter, CmEntry } from '../markdownCore'
import { postprocessWikiLinks } from '../../components/Editor/markdownUtils'

function cmDecorations(view: EditorView): CmEntry[] {
  const { state } = view
  const entries: CmEntry[] = []
  const re = /!?\[\[([^\]]+)\]\]/g
  const text = state.doc.toString()
  let m: RegExpExecArray | null

  while ((m = re.exec(text)) !== null) {
    const isEmbed = m[0].startsWith('!')
    if (isEmbed) continue
    const from = m.index
    const to = from + m[0].length
    entries.push({ from, to, deco: Decoration.mark({ class: 'cm-lp-wikilink' }) })
  }

  return entries
}

export const wikiLinksFormatter: MarkdownFormatter = {
  name: 'wikiLinks',
  postprocessHtml: (html: string, files: VaultFile[]) => postprocessWikiLinks(html, files),
  cmDecorations,
}
