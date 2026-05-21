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
import { CALLOUT_TYPES } from '../markdownUtils'

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

// ---------- Widget for Bullet List Dots ----------
class ListBulletWidget extends WidgetType {
  toDOM(): HTMLElement {
    const span = document.createElement('span')
    span.className = 'cm-lp-bullet'
    span.textContent = '•'
    return span
  }
  ignoreEvent(): boolean {
    return true
  }
}

// ---------- Widget for Task Checkboxes ----------
class TaskCheckboxWidget extends WidgetType {
  constructor(
    public checked: boolean,
    public from: number,
    public to: number
  ) {
    super()
  }

  toDOM(view: EditorView): HTMLElement {
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.checked = this.checked
    input.className = 'cm-lp-task-checkbox'

    input.addEventListener('click', (e) => {
      e.preventDefault()
      const newChar = this.checked ? ' ' : 'x'
      view.dispatch({
        changes: {
          from: this.from + 1,
          to: this.from + 2,
          insert: newChar
        }
      })
    })

    return input
  }

  ignoreEvent(): boolean {
    return true
  }
}

// ---------- Widget for Callout Headers ----------
class CalloutHeaderWidget extends WidgetType {
  constructor(
    public type: string,
    public hasCustomTitle: boolean
  ) {
    super()
  }

  toDOM(): HTMLElement {
    const header = document.createElement('span')
    header.className = 'cm-lp-callout-header-widget'

    const typeKey = this.type.toLowerCase()
    const info = CALLOUT_TYPES[typeKey] ?? { icon: '📝', color: '#6b7280' }

    const icon = document.createElement('span')
    icon.className = 'cm-lp-callout-icon'
    icon.textContent = info.icon
    header.appendChild(icon)

    if (!this.hasCustomTitle) {
      const title = document.createElement('span')
      title.className = 'cm-lp-callout-title'
      title.textContent = typeKey.charAt(0).toUpperCase() + typeKey.slice(1)
      title.style.color = info.color
      header.appendChild(title)
    }

    return header
  }

  ignoreEvent(): boolean {
    return true
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
            const cursor = node.node.cursor()
            if (cursor.firstChild()) {
              do {
                if (cursor.name === 'HeaderMark') {
                  const markEnd = cursor.to
                  const lineText = state.doc.sliceString(lineObj.from, lineObj.to)
                  const markLocalEnd = markEnd - lineObj.from
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
          return false
        }

        // --- Strong Emphasis (bold) **text** ---
        if (nodeName === 'StrongEmphasis') {
          const lineNum = state.doc.lineAt(nodeFrom).number
          const isCursorLine = cursorLines.has(lineNum)

          decos.push({
            from: nodeFrom,
            to: nodeTo,
            deco: Decoration.mark({ class: 'cm-lp-bold' })
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

        // --- Strikethrough ~~text~~ ---
        if (nodeName === 'Strikethrough') {
          const lineNum = state.doc.lineAt(nodeFrom).number
          const isCursorLine = cursorLines.has(lineNum)

          decos.push({
            from: nodeFrom,
            to: nodeTo,
            deco: Decoration.mark({ class: 'cm-lp-strikethrough' })
          })

          if (!isCursorLine) {
            const cursor = node.node.cursor()
            if (cursor.firstChild()) {
              do {
                if (cursor.name === 'StrikethroughMark') {
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
            if (line.to >= nodeTo) break
            pos = line.to + 1
          }

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

        // --- Task list checkbox [ ] or [x] ---
        if (nodeName === 'TaskMarker') {
          const lineNum = state.doc.lineAt(nodeFrom).number
          const isCursorLine = cursorLines.has(lineNum)
          const markerText = state.doc.sliceString(nodeFrom, nodeTo)
          const checked = markerText.toLowerCase().includes('x')

          if (!isCursorLine) {
            decos.push({
              from: nodeFrom,
              to: nodeTo,
              deco: Decoration.replace({
                widget: new TaskCheckboxWidget(checked, nodeFrom, nodeTo)
              })
            })
          }
          return false
        }

        // --- List Markers (bullets/numbers) ---
        if (nodeName === 'ListMark') {
          const lineNum = state.doc.lineAt(nodeFrom).number
          const isCursorLine = cursorLines.has(lineNum)
          const lineText = state.doc.lineAt(nodeFrom).text
          const markText = state.doc.sliceString(nodeFrom, nodeTo)

          if (!isCursorLine) {
            if (/^\s*[-*+]\s+\[[ xX]\]/.test(lineText)) {
              decos.push({
                from: nodeFrom,
                to: nodeTo,
                deco: Decoration.replace({})
              })
            } else if (/^[-*+]$/.test(markText.trim())) {
              decos.push({
                from: nodeFrom,
                to: nodeTo,
                deco: Decoration.replace({
                  widget: new ListBulletWidget()
                })
              })
            }
          }
        }

        // --- Blockquote marker ---
        if (nodeName === 'QuoteMark') {
          let isCallout = false
          let curr = node.node.parent
          while (curr) {
            if (curr.name === 'Blockquote') {
              const parentFirstLineText = state.doc.lineAt(curr.from).text
              if (/^(\s*>\s*)\[!([\w-]+)\]/.test(parentFirstLineText)) {
                isCallout = true
                break
              }
            }
            curr = curr.parent
          }

          if (!isCallout) {
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
          return false
        }

        // --- Blockquote / Callout ---
        if (nodeName === 'Blockquote') {
          const firstLine = state.doc.lineAt(nodeFrom)
          const firstLineText = firstLine.text
          const calloutMatch = firstLineText.match(/^(\s*>\s*)\[!([\w-]+)\](.*)$/)

          if (calloutMatch) {
            const [, prefix, type, customTitle] = calloutMatch
            const typeKey = type.toLowerCase()
            const startLineNum = firstLine.number
            const endLineNum = state.doc.lineAt(nodeTo).number

            for (let l = startLineNum; l <= endLineNum; l++) {
              if (!lineDecoLines.has(l)) {
                lineDecoLines.add(l)
                const lineObj = state.doc.line(l)
                const classes = [
                  'cm-lp-callout-line',
                  `cm-lp-callout-${typeKey}`
                ]
                if (l === startLineNum) classes.push('cm-lp-callout-first')
                if (l === endLineNum) classes.push('cm-lp-callout-last')

                decos.push({
                  from: lineObj.from,
                  to: lineObj.from,
                  deco: Decoration.line({ class: classes.join(' ') })
                })
              }
            }

            const cursor = node.node.cursor()
            if (cursor.firstChild()) {
              do {
                if (cursor.name === 'QuoteMark') {
                  const qLine = state.doc.lineAt(cursor.from).number
                  if (!cursorLines.has(qLine)) {
                    const qEnd = cursor.to
                    const qLineObj = state.doc.lineAt(cursor.from)
                    const qLineText = qLineObj.text
                    const qLocalEnd = qEnd - qLineObj.from
                    let hideEnd = qEnd
                    if (qLocalEnd < qLineText.length && qLineText[qLocalEnd] === ' ') {
                      hideEnd = qEnd + 1
                    }
                    decos.push({
                      from: cursor.from,
                      to: hideEnd,
                      deco: Decoration.replace({})
                    })
                  }
                }
              } while (cursor.nextSibling())
            }

            const isFirstLineCursor = cursorLines.has(startLineNum)
            if (!isFirstLineCursor) {
              const markerStart = firstLine.from
              const markerEnd = firstLine.from + prefix.length + type.length + 3
              
              const hasCustomTitle = customTitle.trim().length > 0
              decos.push({
                from: markerStart,
                to: markerEnd,
                deco: Decoration.replace({
                  widget: new CalloutHeaderWidget(typeKey, hasCustomTitle)
                })
              })

              if (hasCustomTitle) {
                decos.push({
                  from: markerEnd,
                  to: firstLine.to,
                  deco: Decoration.mark({ class: `cm-lp-callout-title-text cm-lp-callout-title-${typeKey}` })
                })
              }
            }
            return true
          }
        }

        return true
      }
    })
  }

  // --- Highlight ==text== ---
  const highlightRegex = /==([^=\n]+)==/g
  for (const { from: visFrom, to: visTo } of view.visibleRanges) {
    const text = state.doc.sliceString(visFrom, visTo)
    highlightRegex.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = highlightRegex.exec(text)) !== null) {
      const matchStart = visFrom + match.index
      const matchEnd = matchStart + match[0].length

      let isCode = false
      let pos = matchStart
      let nodeAtPos = syntaxTree(state).resolveInner(pos, 1)
      let currNode: typeof nodeAtPos | null = nodeAtPos
      while (currNode) {
        if (
          currNode.name === 'InlineCode' ||
          currNode.name === 'FencedCode' ||
          currNode.name === 'CodeBlock' ||
          currNode.name === 'Comment' ||
          currNode.name === 'HTMLBlock'
        ) {
          isCode = true
          break
        }
        currNode = currNode.parent
      }

      if (isCode) continue

      const lineNum = state.doc.lineAt(matchStart).number
      const isCursorLine = cursorLines.has(lineNum)

      decos.push({
        from: matchStart,
        to: matchEnd,
        deco: Decoration.mark({ class: 'cm-lp-highlight' })
      })

      if (!isCursorLine) {
        decos.push({
          from: matchStart,
          to: matchStart + 2,
          deco: Decoration.replace({})
        })
        decos.push({
          from: matchEnd - 2,
          to: matchEnd,
          deco: Decoration.replace({})
        })
      }
    }
  }

  // Sort by from position, then startSide, then to descending
  decos.sort((a, b) => a.from - b.from || a.deco.startSide - b.deco.startSide || b.to - a.to)

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
  '.cm-lp-h1': { fontSize: '1.8em', fontWeight: '700', color: '#ffffff', lineHeight: '1.3' },
  '.cm-lp-h2': { fontSize: '1.5em', fontWeight: '700', color: '#ffffff', lineHeight: '1.35' },
  '.cm-lp-h3': { fontSize: '1.3em', fontWeight: '600', color: '#eeeeee', lineHeight: '1.4' },
  '.cm-lp-h4': { fontSize: '1.15em', fontWeight: '600', color: '#dddddd', lineHeight: '1.4' },
  '.cm-lp-h5': { fontSize: '1.05em', fontWeight: '600', color: '#cccccc' },
  '.cm-lp-h6': { fontSize: '1em', fontWeight: '600', color: '#bbbbbb' },
  '.cm-lp-bold': { fontWeight: '700' },
  '.cm-lp-italic': { fontStyle: 'italic' },
  '.cm-lp-strikethrough': { textDecoration: 'line-through' },
  '.cm-lp-highlight': { background: 'rgba(255, 220, 0, 0.25)', borderRadius: '2px', padding: '0 2px' },
  '.cm-lp-code': {
    background: 'rgba(255, 255, 255, 0.06)',
    padding: '1px 4px',
    borderRadius: '3px',
    fontFamily: '"Fira Code", ui-monospace, SFMono-Regular, monospace',
    fontSize: '0.9em'
  },
  '.cm-lp-codeblock-line': {
    background: 'rgba(255, 255, 255, 0.03)',
    borderLeft: '2px solid rgba(124, 106, 247, 0.3)',
    paddingLeft: '8px'
  },
  '.cm-lp-hr-widget': {
    border: 'none',
    borderTop: '1px solid rgba(255, 255, 255, 0.12)',
    margin: '12px 0',
    display: 'block'
  },
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

