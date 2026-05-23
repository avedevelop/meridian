import { KeyBinding, EditorView } from '@codemirror/view'

function wrapSelection(view: EditorView, before: string, after: string): boolean {
  const { state, dispatch } = view
  // Only the primary selection range is processed; multiple cursors are not supported.
  const sel = state.selection.main
  const hasSelection = sel.from !== sel.to

  // Check if selection (or cursor) is already inside markers — toggle off
  const beforeStart = Math.max(0, sel.from - before.length)
  const afterEnd = Math.min(state.doc.length, sel.to + after.length)
  const already =
    state.sliceDoc(beforeStart, sel.from) === before && state.sliceDoc(sel.to, afterEnd) === after

  if (already) {
    dispatch(
      state.update({
        changes: [
          { from: beforeStart, to: sel.from, insert: '' },
          { from: sel.to, to: afterEnd, insert: '' }
        ],
        selection: { anchor: beforeStart, head: sel.to - before.length },
        scrollIntoView: true
      })
    )
  } else if (hasSelection) {
    const selectedText = state.sliceDoc(sel.from, sel.to)
    const insert = `${before}${selectedText}${after}`
    dispatch(
      state.update({
        changes: { from: sel.from, to: sel.to, insert },
        selection: {
          anchor: sel.from + before.length,
          head: sel.from + before.length + selectedText.length
        },
        scrollIntoView: true
      })
    )
  } else {
    // No selection: insert markers and place cursor between them
    dispatch(
      state.update({
        changes: { from: sel.from, insert: `${before}${after}` },
        selection: { anchor: sel.from + before.length },
        scrollIntoView: true
      })
    )
  }
  return true
}

export const markdownKeymap: KeyBinding[] = [
  { key: 'Mod-b', run: (view) => wrapSelection(view, '**', '**') },
  { key: 'Mod-i', run: (view) => wrapSelection(view, '*', '*') },
  { key: 'Mod-`', run: (view) => wrapSelection(view, '`', '`') },
  { key: 'Mod-Shift-k', run: (view) => wrapSelection(view, '[[', ']]') }
]
