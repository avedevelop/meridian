import { describe, it, expect } from 'vitest'

function findHeadingAbove(lines: string[], lineIndex: number): string | null {
  for (let i = lineIndex; i >= 0; i--) {
    const match = lines[i].match(/^#{1,6}\s+(.+)/)
    if (match) return match[1].trim()
  }
  return null
}

describe('findHeadingAbove', () => {
  it('returns the heading on the current line', () => {
    const lines = ['## Hello World', 'some text']
    expect(findHeadingAbove(lines, 0)).toBe('Hello World')
  })

  it('returns the nearest heading above the current line', () => {
    const lines = ['# Top', 'text', '## Section', 'more text', 'cursor here']
    expect(findHeadingAbove(lines, 4)).toBe('Section')
  })

  it('returns null when no heading exists above', () => {
    const lines = ['plain text', 'more text']
    expect(findHeadingAbove(lines, 1)).toBeNull()
  })

  it('returns the heading when cursor is on it', () => {
    const lines = ['intro', '## My Section', 'body']
    expect(findHeadingAbove(lines, 1)).toBe('My Section')
  })
})
