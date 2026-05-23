import { describe, it, expect } from 'vitest'

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
  {
    label: '/Table',
    apply: '| Col 1 | Col 2 |\n|---|---|\n| Cell | Cell |',
    detail: 'markdown table'
  },
  { label: '/Divider', apply: '\n---\n', detail: 'horizontal rule' },
  { label: '/Quote', apply: '> ', detail: 'blockquote' },
  { label: '/Callout Note', apply: '> [!NOTE]\n> ', detail: 'info callout' },
  { label: '/Callout Warning', apply: '> [!WARNING]\n> ', detail: 'warning callout' },
  { label: '/Callout Tip', apply: '> [!TIP]\n> ', detail: 'tip callout' }
]

function filterCommands(query: string): SlashCommand[] {
  if (!query) return SLASH_COMMANDS
  const q = query.toLowerCase()
  return SLASH_COMMANDS.filter((c) => c.label.toLowerCase().includes(q))
}

describe('slash command filtering', () => {
  it('returns all commands for empty query', () => {
    expect(filterCommands('')).toHaveLength(SLASH_COMMANDS.length)
  })

  it('filters by label substring', () => {
    const results = filterCommands('heading')
    expect(results).toHaveLength(3)
    expect(results.map((r) => r.label)).toContain('/Heading 1')
    expect(results.map((r) => r.label)).toContain('/Heading 2')
    expect(results.map((r) => r.label)).toContain('/Heading 3')
  })

  it('is case-insensitive', () => {
    const results = filterCommands('CODE')
    expect(results.length).toBeGreaterThanOrEqual(2) // /Code and /Code Block
  })

  it('returns empty array for no match', () => {
    expect(filterCommands('xyznonexistent')).toHaveLength(0)
  })

  it('each command has label starting with /', () => {
    SLASH_COMMANDS.forEach((cmd) => {
      expect(cmd.label.startsWith('/')).toBe(true)
    })
  })
})
