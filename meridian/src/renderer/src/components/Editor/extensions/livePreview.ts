import { Extension, RangeSetBuilder } from '@codemirror/state'
import {
  ViewPlugin,
  DecorationSet,
  Decoration,
  ViewUpdate,
  EditorView,
  WidgetType
} from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'

// ---------- Widget for Horizontal Rules ----------
class HRWidget extends WidgetType {
  toDOM(): HTMLElement {
    const hr = document.createElement('hr')
    hr.className = 'cm-lp-hr-widget'
    return hr
  }
  ignoreEvent(): boolean {
    return false
  }
}

// ---------- Helper: get all line numbers where any cursor sits ----------
function getCursorLines(state: import('@codemirror/state').EditorState): Set<number> {
  const lines = new Set<number>()
  for (const range of state.selection.ranges) {
    const fromLine = state.doc.lineAt(range.from).number
    const toLine = state.doc.lineAt(range.to).number
    for (let l = fromLine; l <= toLine; l++) {
      lines.add(l)
    }
  }
  return lines
}

// ---------- Build decorations from the Lezer syntax tree ----------

interface DecoItem {
  from: number
  to: number
  deco: Decoration
}

export function buildLivePreviewDecorations(view: EditorView): DecorationSet {
  console.log('[buildLivePreviewDecorations] building decorations for document...')
  const state = view.state
  const cursorLines = getCursorLines(state)
  const decos: DecoItem[] = []
  const lineDecoLines = new Set<number>() // track which lines already have a line-level deco

  for (const { from: visFrom, to: visTo } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from: visFrom,
      to: visTo,
      enter(node) {
        const nodeFrom = node.from
        const nodeTo = node.to
        const nodeName = node.name

        // --- ATX Headings (h1-h6) ---
        if (/^ATXHeading([1-6])$/.test(nodeName)) {
          const level = parseInt(RegExp.$1, 10)
          const lineNum = state.doc.lineAt(nodeFrom).number
          const lineObj = state.doc.lineAt(nodeFrom)
          const isCursorLine = cursorLines.has(lineNum)
          const classMap: Record<number, string> = {
            1: 'cm-lp-h1',
            2: 'cm-lp-h2',
            3: 'cm-lp-h3',
            4: 'cm-lp-h4',
            5: 'cm-lp-h5',
            6: 'cm-lp-h6'
          }
          // Add line decoration for heading styling
          if (!lineDecoLines.has(lineNum)) {
            lineDecoLines.add(lineNum)
            decos.push({
              from: lineObj.from,
              to: lineObj.from,
              deco: Decoration.line({ class: classMap[level] || 'cm-lp-h6' })
            })
          }
          // Hide HeaderMark (the # characters) if cursor not on this line
          if (!isCursorLine) {
            // Walk children to find HeaderMark
            const cursor = node.node.cursor()
            if (cursor.firstChild()) {
              do {
                if (cursor.name === 'HeaderMark') {
                  // Hide the mark plus any trailing space
                  const markEnd = cursor.to
                  const lineText = state.doc.sliceString(lineObj.from, lineObj.to)
                  const markLocalEnd = markEnd - lineObj.from
                  // Find the end of whitespace after the mark
                  let hideEnd = markEnd
                  if (markLocalEnd < lineText.length && lineText[markLocalEnd] === ' ') {
                    hideEnd = markEnd + 1
                  }
                  decos.push({
                    from: cursor.from,
                    to: hideEnd,
                    deco: Decoration.replace({})
                  })
                }
              } while (cursor.nextSibling())
            }
          }
          return false // don't enter heading children at top level
        }

        // --- Strong Emphasis (bold) **text** ---
        if (nodeName === 'StrongEmphasis') {
          const lineNum = state.doc.lineAt(nodeFrom).number
          const isCursorLine = cursorLines.has(lineNum)

          // Style the whole span as bold
          decos.push({
            from: nodeFrom,
            to: nodeTo,
            deco: Decoration.mark({ class: 'cm-lp-bold' })
          })

          if (!isCursorLine) {
            // Hide the ** markers
            const cursor = node.node.cursor()
            if (cursor.firstChild()) {
              do {
                if (cursor.name === 'EmphasisMark') {
                  decos.push({
                    from: cursor.from,
                    to: cursor.to,
                    deco: Decoration.replace({})
                  })
                }
              } while (cursor.nextSibling())
            }
          }
          return false
        }

        // --- Emphasis (italic) *text* ---
        if (nodeName === 'Emphasis') {
          const lineNum = state.doc.lineAt(nodeFrom).number
          const isCursorLine = cursorLines.has(lineNum)

          decos.push({
            from: nodeFrom,
            to: nodeTo,
            deco: Decoration.mark({ class: 'cm-lp-italic' })
          })

          if (!isCursorLine) {
            const cursor = node.node.cursor()
            if (cursor.firstChild()) {
              do {
                if (cursor.name === 'EmphasisMark') {
                  decos.push({
                    from: cursor.from,
                    to: cursor.to,
                    deco: Decoration.replace({})
                  })
                }
              } while (cursor.nextSibling())
            }
          }
          return false
        }

        // --- Inline Code `code` ---
        if (nodeName === 'InlineCode') {
          const lineNum = state.doc.lineAt(nodeFrom).number
          const isCursorLine = cursorLines.has(lineNum)

          decos.push({
            from: nodeFrom,
            to: nodeTo,
            deco: Decoration.mark({ class: 'cm-lp-code' })
          })

          if (!isCursorLine) {
            const cursor = node.node.cursor()
            if (cursor.firstChild()) {
              do {
                if (cursor.name === 'CodeMark') {
                  decos.push({
                    from: cursor.from,
                    to: cursor.to,
                    deco: Decoration.replace({})
                  })
                }
              } while (cursor.nextSibling())
            }
          }
          return false
        }

        // --- Fenced Code Blocks ---
        if (nodeName === 'FencedCode') {
          // Add background to each line of the code block
          for (let pos = nodeFrom; pos <= nodeTo; ) {
            const line = state.doc.lineAt(pos)
            const lineNum = line.number
            if (!lineDecoLines.has(lineNum)) {
              lineDecoLines.add(lineNum)
              decos.push({
                from: line.from,
                to: line.from,
                deco: Decoration.line({ class: 'cm-lp-codeblock-line' })
              })
            }
            // Move to next line
            if (line.to >= nodeTo) break
            pos = line.to + 1
          }

          // Hide the fence markers (``` lines) if cursor is not on them
          const cursor = node.node.cursor()
          if (cursor.firstChild()) {
            do {
              if (cursor.name === 'CodeMark') {
                const markLine = state.doc.lineAt(cursor.from).number
                if (!cursorLines.has(markLine)) {
                  decos.push({
                    from: cursor.from,
                    to: cursor.to,
                    deco: Decoration.replace({})
                  })
                }
              }
              if (cursor.name === 'CodeInfo') {
                const infoLine = state.doc.lineAt(cursor.from).number
                if (!cursorLines.has(infoLine)) {
                  decos.push({
                    from: cursor.from,
                    to: cursor.to,
                    deco: Decoration.replace({})
                  })
                }
              }
            } while (cursor.nextSibling())
          }
          return false
        }

        // --- Horizontal Rule ---
        if (nodeName === 'HorizontalRule') {
          const lineNum = state.doc.lineAt(nodeFrom).number
          const isCursorLine = cursorLines.has(lineNum)
          if (!isCursorLine) {
            decos.push({
              from: nodeFrom,
              to: nodeTo,
              deco: Decoration.replace({ widget: new HRWidget() })
            })
          }
        }

        // --- Blockquote marker ---
        if (nodeName === 'QuoteMark') {
          const lineNum = state.doc.lineAt(nodeFrom).number
          const lineObj = state.doc.lineAt(nodeFrom)
          if (!lineDecoLines.has(lineNum)) {
            lineDecoLines.add(lineNum)
            decos.push({
              from: lineObj.from,
              to: lineObj.from,
              deco: Decoration.line({ class: 'cm-lp-blockquote-line' })
            })
          }
        }

        return true
      }
    })
  }

  // Sort by from position, then startSide (required by CodeMirror), then to descending (larger/outer spans first)
  decos.sort((a, b) => a.from - b.from || a.deco.startSide - b.deco.startSide || b.to - a.to)

  // Build RangeSet
  const builder = new RangeSetBuilder<Decoration>()
  for (const d of decos) {
    builder.add(d.from, d.to, d.deco)
  }
  return builder.finish()
}

// ---------- ViewPlugin ----------
export const livePreviewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = buildLivePreviewDecorations(view)
    }
    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.selectionSet ||
        syntaxTree(update.startState) !== syntaxTree(update.state)
      ) {
        this.decorations = buildLivePreviewDecorations(update.view)
      }
    }
  },
  { decorations: (v) => v.decorations }
)

// ---------- Base Theme ----------
const livePreviewTheme = EditorView.baseTheme({
  // Heading styles (line decorations)
  '.cm-lp-h1': {
    fontSize: '1.8em',
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: '1.3'
  },
  '.cm-lp-h2': {
    fontSize: '1.5em',
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: '1.35'
  },
  '.cm-lp-h3': {
    fontSize: '1.3em',
    fontWeight: '600',
    color: '#eeeeee',
    lineHeight: '1.4'
  },
  '.cm-lp-h4': {
    fontSize: '1.15em',
    fontWeight: '600',
    color: '#dddddd',
    lineHeight: '1.4'
  },
  '.cm-lp-h5': {
    fontSize: '1.05em',
    fontWeight: '600',
    color: '#cccccc'
  },
  '.cm-lp-h6': {
    fontSize: '1em',
    fontWeight: '600',
    color: '#bbbbbb'
  },
  // Inline styles
  '.cm-lp-bold': {
    fontWeight: '700'
  },
  '.cm-lp-italic': {
    fontStyle: 'italic'
  },
  '.cm-lp-code': {
    background: 'rgba(255, 255, 255, 0.06)',
    padding: '1px 4px',
    borderRadius: '3px',
    fontFamily: '"Fira Code", ui-monospace, SFMono-Regular, monospace',
    fontSize: '0.9em'
  },
  // Code block lines
  '.cm-lp-codeblock-line': {
    background: 'rgba(255, 255, 255, 0.03)',
    borderLeft: '2px solid rgba(124, 106, 247, 0.3)',
    paddingLeft: '8px'
  },
  // Horizontal rule widget
  '.cm-lp-hr-widget': {
    border: 'none',
    borderTop: '1px solid rgba(255, 255, 255, 0.12)',
    margin: '12px 0',
    display: 'block'
  },
  // Blockquote line
  '.cm-lp-blockquote-line': {
    borderLeft: '3px solid rgba(124, 106, 247, 0.5)',
    paddingLeft: '12px',
    color: 'rgba(255, 255, 255, 0.7)'
  }
})

// ---------- Export ----------
export function livePreviewExtension(): Extension[] {
  return [livePreviewPlugin, livePreviewTheme]
}
