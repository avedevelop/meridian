import { Extension } from '@codemirror/state'
import { ViewPlugin, DecorationSet, Decoration, ViewUpdate, EditorView } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'

const wikiLinkMark = Decoration.mark({ class: 'cm-wiki-link' })

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const regex = /\[\[[^\]]+\]\]/g

  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to)
    let match: RegExpExecArray | null
    regex.lastIndex = 0
    while ((match = regex.exec(text)) !== null) {
      builder.add(from + match.index, from + match.index + match[0].length, wikiLinkMark)
    }
  }

  return builder.finish()
}

export const wikiLinkExtension = (onLinkClick: (linkText: string) => void): Extension => [
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet
      constructor(view: EditorView) {
        this.decorations = buildDecorations(view)
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildDecorations(update.view)
        }
      }
    },
    { decorations: (v) => v.decorations }
  ),
  EditorView.domEventHandlers({
    click(event, view) {
      // Only open link on Cmd+Click (Mac) or Ctrl+Click (Win/Linux)
      if (!event.metaKey && !event.ctrlKey) return false
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
      if (pos == null) return false
      const line = view.state.doc.lineAt(pos)
      const text = line.text
      const regex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g
      let match: RegExpExecArray | null
      while ((match = regex.exec(text)) !== null) {
        const start = line.from + match.index
        const end = start + match[0].length
        if (pos >= start && pos <= end) {
          onLinkClick(match[1].trim())
          return true
        }
      }
      return false
    }
  }),
  EditorView.baseTheme({
    '.cm-wiki-link': {
      color: '#7c6af7',
      textDecoration: 'underline',
      cursor: 'pointer'
    }
  })
]
