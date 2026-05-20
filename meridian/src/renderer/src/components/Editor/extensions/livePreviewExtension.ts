import { ViewPlugin, ViewUpdate, Decoration, DecorationSet, WidgetType, EditorView } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
import { collectCmDecorations } from '../../../lib/markdownCore'
import '../../../lib/markdownCore'

class HRWidget extends WidgetType {
  toDOM() {
    const div = document.createElement('div')
    div.className = 'cm-lp-hr'
    return div
  }
  eq() { return true }
  ignoreEvent() { return false }
}

function cursorOnLine(view: EditorView, from: number): boolean {
  const head = view.state.selection.main.head
  const line = view.state.doc.lineAt(from)
  return head >= line.from && head <= line.to
}

type Entry = { from: number; to: number; deco: Decoration }

function buildDecos(view: EditorView): DecorationSet {
  const { state } = view
  const entries: Entry[] = []

  // Collect decorations from registered core formatters
  const coreEntries = collectCmDecorations(view)
  entries.push(...coreEntries)

  syntaxTree(state).iterate({
    enter(node) {
      const { from, to } = node

      switch (node.name) {
        // Heading line decorations
        case 'ATXHeading1': {
          const line = state.doc.lineAt(from)
          entries.push({ from: line.from, to: line.from, deco: Decoration.line({ class: 'cm-lp-h1' }) })
          break
        }
        case 'ATXHeading2': {
          const line = state.doc.lineAt(from)
          entries.push({ from: line.from, to: line.from, deco: Decoration.line({ class: 'cm-lp-h2' }) })
          break
        }
        case 'ATXHeading3': {
          const line = state.doc.lineAt(from)
          entries.push({ from: line.from, to: line.from, deco: Decoration.line({ class: 'cm-lp-h3' }) })
          break
        }
        case 'ATXHeading4':
        case 'ATXHeading5':
        case 'ATXHeading6': {
          const line = state.doc.lineAt(from)
          entries.push({ from: line.from, to: line.from, deco: Decoration.line({ class: 'cm-lp-h4' }) })
          break
        }

        // Hide # markers when cursor is not on that line
        case 'HeaderMark': {
          if (!cursorOnLine(view, from)) {
            // Hide the marker + trailing space
            const end = to < state.doc.length && state.doc.sliceString(to, to + 1) === ' ' ? to + 1 : to
            entries.push({ from, to: end, deco: Decoration.replace({}) })
          }
          break
        }

        // Bold — mark the full range, hide ** markers away from cursor
        case 'StrongEmphasis': {
          entries.push({ from, to, deco: Decoration.mark({ class: 'cm-lp-bold' }) })
          break
        }

        // Italic — mark the full range
        case 'Emphasis': {
          entries.push({ from, to, deco: Decoration.mark({ class: 'cm-lp-italic' }) })
          break
        }

        // EmphasisMark: hide * _ ** _ when not on cursor line
        case 'EmphasisMark': {
          if (!cursorOnLine(view, from)) {
            entries.push({ from, to, deco: Decoration.replace({}) })
          }
          break
        }

        // Strikethrough
        case 'Strikethrough': {
          entries.push({ from, to, deco: Decoration.mark({ class: 'cm-lp-strike' }) })
          break
        }

        // StrikethroughMark: hide ~~ when not on cursor line
        case 'StrikethroughMark': {
          if (!cursorOnLine(view, from)) {
            entries.push({ from, to, deco: Decoration.replace({}) })
          }
          break
        }

        // Horizontal rule — replace line with widget
        case 'HorizontalRule': {
          const line = state.doc.lineAt(from)
          if (!cursorOnLine(view, from)) {
            entries.push({
              from: line.from,
              to: line.to,
              deco: Decoration.replace({ widget: new HRWidget() })
            })
          }
          break
        }

        // Blockquote lines
        case 'Blockquote': {
          let pos = from
          while (pos <= to && pos < state.doc.length) {
            const line = state.doc.lineAt(pos)
            entries.push({ from: line.from, to: line.from, deco: Decoration.line({ class: 'cm-lp-blockquote' }) })
            pos = line.to + 1
          }
          break
        }

        // QuoteMark: hide > when not on cursor line
        case 'QuoteMark': {
          if (!cursorOnLine(view, from)) {
            const end = to < state.doc.length && state.doc.sliceString(to, to + 1) === ' ' ? to + 1 : to
            entries.push({ from, to: end, deco: Decoration.replace({}) })
          }
          break
        }

        // Inline code styling
        case 'InlineCode': {
          entries.push({ from, to, deco: Decoration.mark({ class: 'cm-lp-code' }) })
          break
        }
      }
    }
  })

  // Sort: by from ascending, then by to ascending (zero-length first for same from)
  entries.sort((a, b) => a.from !== b.from ? a.from - b.from : a.to - b.to)

  const builder = new RangeSetBuilder<Decoration>()
  let lastFrom = -1
  let lastTo = -1

  for (const { from, to, deco } of entries) {
    // Skip entries that would violate strictly increasing order
    if (from < lastFrom || (from === lastFrom && to < lastTo)) continue
    // Skip overlapping replace decorations (marks can overlap)
    if (deco.spec && (deco as any).startSide === -1 && from < lastTo && from > lastFrom) continue
    try {
      builder.add(from, to, deco)
      lastFrom = from
      lastTo = Math.max(lastTo, to)
    } catch {
      // skip conflicting range
    }
  }

  return builder.finish()
}

export const livePreviewExtension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildDecos(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = buildDecos(update.view)
      }
    }
  },
  { decorations: (v) => v.decorations }
)
