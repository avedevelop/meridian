import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete'

interface SlashCommand {
  label: string
  apply: string
  detail: string
}

const SLASH_COMMANDS: SlashCommand[] = [
  { label: '/Heading 1', apply: '# ', detail: 'H1 heading' },
  { label: '/Heading 2', apply: '## ', detail: 'H2 heading' },
  { label: '/Heading 3', apply: '### ', detail: 'H3 heading' },
  { label: '/Bold', apply: '**bold**', detail: '**text**' },
  { label: '/Italic', apply: '*italic*', detail: '*text*' },
  { label: '/Code', apply: '`code`', detail: 'inline code' },
  { label: '/Code Block', apply: '```\n\n```', detail: 'fenced code block' },
  { label: '/Bullet List', apply: '- ', detail: 'unordered list' },
  { label: '/Numbered List', apply: '1. ', detail: 'ordered list' },
  { label: '/Task List', apply: '- [ ] ', detail: 'task checkbox' },
  { label: '/Table', apply: '| Col 1 | Col 2 |\n|---|---|\n| Cell | Cell |', detail: 'markdown table' },
  { label: '/Divider', apply: '\n---\n', detail: 'horizontal rule' },
  { label: '/Quote', apply: '> ', detail: 'blockquote' },
  { label: '/Callout Note', apply: '> [!NOTE]\n> ', detail: 'info callout' },
  { label: '/Callout Warning', apply: '> [!WARNING]\n> ', detail: 'warning callout' },
  { label: '/Callout Tip', apply: '> [!TIP]\n> ', detail: 'tip callout' },
]

function slashCompletion(context: CompletionContext): CompletionResult | null {
  const match = context.matchBefore(/\/[\w\s]*/)
  if (!match) return null

  // Only activate when the line before the '/' is empty or whitespace
  const lineStart = context.state.doc.lineAt(match.from).from
  const textBeforeSlash = context.state.doc.sliceString(lineStart, match.from)
  if (textBeforeSlash.trim() !== '') return null

  const query = match.text.slice(1).toLowerCase()
  const filtered = query
    ? SLASH_COMMANDS.filter((c) => c.label.toLowerCase().includes(query))
    : SLASH_COMMANDS

  if (filtered.length === 0) return null

  return {
    from: match.from,
    to: match.to,
    options: filtered.map((cmd) => ({
      label: cmd.label,
      detail: cmd.detail,
      type: 'keyword',
      apply: (view: import('@codemirror/view').EditorView, _completion: unknown, from: number, to: number) => {
        view.dispatch({
          changes: { from, to, insert: cmd.apply },
          selection: { anchor: from + cmd.apply.length }
        })
      }
    })),
    filter: false
  }
}

export function slashCommandExtension() {
  return autocompletion({
    override: [slashCompletion],
    closeOnBlur: true,
    maxRenderedOptions: 16,
    activateOnTyping: true
  })
}
