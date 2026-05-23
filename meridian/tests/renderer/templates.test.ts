import { describe, it, expect } from 'vitest'

function applyTemplatePlaceholders(template: string, title: string, date: string): string {
  return template.replace(/\{\{date\}\}/gi, date).replace(/\{\{title\}\}/gi, title)
}

function prependTemplate(templateContent: string, existingContent: string): string {
  if (!existingContent.trim()) return templateContent
  return templateContent + '\n\n' + existingContent
}

describe('template processing', () => {
  it('replaces {{date}} placeholder', () => {
    const result = applyTemplatePlaceholders('Date: {{date}}', 'My Note', '2026-05-20')
    expect(result).toBe('Date: 2026-05-20')
  })

  it('replaces {{title}} placeholder', () => {
    const result = applyTemplatePlaceholders('# {{title}}', 'My Note', '2026-05-20')
    expect(result).toBe('# My Note')
  })

  it('is case-insensitive for placeholders', () => {
    const result = applyTemplatePlaceholders('{{DATE}} {{TITLE}}', 'Note', '2026-01-01')
    expect(result).toBe('2026-01-01 Note')
  })

  it('prepends template to existing content', () => {
    const result = prependTemplate('# Template', 'Existing content')
    expect(result).toBe('# Template\n\nExisting content')
  })

  it('replaces empty content with template (no prepend)', () => {
    const result = prependTemplate('# Template', '')
    expect(result).toBe('# Template')
  })

  it('trims whitespace-only content', () => {
    const result = prependTemplate('# Template', '   ')
    expect(result).toBe('# Template')
  })
})
