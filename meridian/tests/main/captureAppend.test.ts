import { describe, it, expect } from 'vitest'
import { formatCaptureLine, buildInboxContent } from '../../src/shared/capture'

describe('formatCaptureLine', () => {
  it('formats with zero-padded HH:MM', () => {
    const date = new Date(2024, 0, 1, 14, 5, 0)
    expect(formatCaptureLine('идея', date)).toBe('- 14:05 идея')
  })

  it('formats midnight correctly', () => {
    const date = new Date(2024, 0, 1, 0, 0, 0)
    expect(formatCaptureLine('test', date)).toBe('- 00:00 test')
  })

  it('formats noon with single-digit minute', () => {
    const date = new Date(2024, 0, 1, 12, 3, 0)
    expect(formatCaptureLine('note', date)).toBe('- 12:03 note')
  })

  it('zero-pads both hour and minute', () => {
    const date = new Date(2024, 0, 1, 9, 7, 0)
    expect(formatCaptureLine('quick', date)).toBe('- 09:07 quick')
  })
})

describe('buildInboxContent', () => {
  it('creates heading when existing is null', () => {
    const line = '- 14:05 идея'
    expect(buildInboxContent(null, line)).toBe('# Inbox\n\n' + line + '\n')
  })

  it('creates heading when existing is empty string', () => {
    const line = '- 09:00 test'
    expect(buildInboxContent('', line)).toBe('# Inbox\n\n' + line + '\n')
  })

  it('appends to existing content with single trailing newline', () => {
    const existing = '# Inbox\n\n- 10:00 first\n'
    const line = '- 11:00 second'
    expect(buildInboxContent(existing, line)).toBe('# Inbox\n\n- 10:00 first\n- 11:00 second\n')
  })

  it('handles existing content without trailing newline', () => {
    const existing = '# Inbox\n\n- 10:00 first'
    const line = '- 11:00 second'
    expect(buildInboxContent(existing, line)).toBe('# Inbox\n\n- 10:00 first\n- 11:00 second\n')
  })

  it('handles multiple trailing newlines by normalizing to single', () => {
    const existing = '# Inbox\n\n- 10:00 first\n\n'
    const line = '- 11:00 second'
    const result = buildInboxContent(existing, line)
    // Trailing newlines are stripped; new line appended with single trailing newline
    expect(result).toBe('# Inbox\n\n- 10:00 first\n- 11:00 second\n')
  })
})
