import type { EditorView } from '@codemirror/view'
import { Decoration, WidgetType } from '@codemirror/view'
import type { MarkdownFormatter, CmEntry } from '../markdownCore'

class CheckboxWidget extends WidgetType {
  constructor(private checked: boolean) { super() }
  toDOM() {
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.checked = this.checked
    input.disabled = true
    input.className = 'cm-lp-checkbox'
    input.style.cssText = 'margin-right:6px;vertical-align:middle;cursor:default;pointer-events:none'
    return input
  }
  eq(other: CheckboxWidget) { return other.checked === this.checked }
  ignoreEvent() { return true }
}

function cmDecorations(view: EditorView): CmEntry[] {
  const { state } = view
  const head = state.selection.main.head
  const entries: CmEntry[] = []

  for (let i = 1; i <= state.doc.lines; i++) {
    const line = state.doc.line(i)
    const m = line.text.match(/^(\s*[-*+]\s)(\[[ xX]\])(\s)/)
    if (!m) continue
    const onCursor = head >= line.from && head <= line.to
    if (onCursor) continue

    const checked = m[2] !== '[ ]'
    const boxFrom = line.from + m[1].length
    const boxTo = boxFrom + m[2].length

    entries.push({
      from: boxFrom,
      to: boxTo,
      deco: Decoration.replace({ widget: new CheckboxWidget(checked) })
    })
  }

  return entries
}

export const taskListFormatter: MarkdownFormatter = {
  name: 'taskList',
  cmDecorations,
}
