import {
  CompletionContext,
  CompletionResult,
  autocompletion,
  startCompletion
} from '@codemirror/autocomplete'
import { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

function wikiLinkSource(getFileNames: () => string[]) {
  return (context: CompletionContext): CompletionResult | null => {
    const match = context.matchBefore(/\[\[[^\]]*/)
    if (!match) return null

    const query = match.text.slice(2).toLowerCase()
    const names = getFileNames()
    const options = names
      .filter((n) => n.toLowerCase().replace(/\.md$/, '').includes(query))
      .map((n) => {
        const label = n.replace(/\.md$/, '')
        return {
          label,
          apply: (view: EditorView, _c: unknown, _from: number, to: number) => {
            // Look past cursor for auto-inserted ]] from closeBrackets
            const after = view.state.doc.sliceString(to, to + 2)
            const endPos = after === ']]' ? to + 2 : to
            view.dispatch({
              changes: { from: match.from, to: endPos, insert: `[[${label}]]` }
            })
          }
        }
      })

    return { from: match.from + 2, options, validFor: /^[^\]]*$/ }
  }
}

export function wikiLinkCompletion(getFileNames: () => string[]): Extension {
  return [
    autocompletion({ override: [wikiLinkSource(getFileNames)], activateOnTyping: true }),
    // Force-trigger completion whenever [[ is typed
    EditorView.updateListener.of((update) => {
      if (!update.docChanged) return
      const cursor = update.state.selection.main.head
      if (cursor >= 2) {
        const text = update.state.doc.sliceString(cursor - 2, cursor)
        if (text === '[[') startCompletion(update.view)
      }
    })
  ]
}
