import { KeyBinding, EditorView } from '@codemirror/view'

function wrapSelection(view: EditorView, before: string, after: string, placeholder: string): boolean {
  const { state, dispatch } = view
  // Only the primary selection range is processed; multiple cursors are not supported.
  const sel = state.selection.main
  const hasSelection = sel.from !== sel.to

  // Check if selection (or cursor) is already inside markers
  const beforeStart = Math.max(0, sel.from - before.length)
  const afterEnd = Math.min(state.doc.length, sel.to + after.length)
  const already =
    state.sliceDoc(beforeStart, sel.from) === before &&
    state.sliceDoc(sel.to, afterEnd) === after

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
  } else {
    const selectedText = hasSelection ? state.sliceDoc(sel.from, sel.to) : placeholder
    const insert = `${before}${selectedText}${after}`
    dispatch(
      state.update({
        changes: { from: sel.from, to: sel.to, insert },
        selection: { anchor: sel.from + before.length, head: sel.from + before.length + selectedText.length },
        scrollIntoView: true
      })
    )
  }
  return true
}

export const markdownKeymap: KeyBinding[] = [
  { key: 'Mod-b', run: (view) => wrapSelection(view, '**', '**', 'bold text') },
  { key: 'Mod-i', run: (view) => wrapSelection(view, '*', '*', 'italic text') },
  { key: 'Mod-`', run: (view) => wrapSelection(view, '`', '`', 'code') },
  { key: 'Mod-Shift-k', run: (view) => wrapSelection(view, '[[', ']]', 'Note Name') }
]
