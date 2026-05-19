import { CompletionContext, CompletionResult, autocompletion, Completion } from '@codemirror/autocomplete'
import { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

export function wikiLinkCompletion(getFileNames: () => string[]): Extension {
  return autocompletion({
    override: [
      (context: CompletionContext): CompletionResult | null => {
        const match = context.matchBefore(/\[\[[^\]]*/);
        if (!match) return null
        if (match.from === match.to && !context.explicit) return null

        const query = match.text.slice(2).toLowerCase()
        const names = getFileNames()
        const options = names
          .filter(n => n.toLowerCase().replace(/\.md$/, '').includes(query))
          .map(n => {
            const label = n.replace(/\.md$/, '')
            return {
              label,
              apply: (view: EditorView, _completion: Completion, from: number, to: number) => {
                const linkStart = match.from
                view.dispatch({
                  changes: { from: linkStart, to, insert: `[[${label}]]` },
                })
              },
            }
          })

        return { from: match.from, options }
      },
    ],
  })
}
