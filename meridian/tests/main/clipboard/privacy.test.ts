// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  looksSensitive,
  maskPreview,
  shouldSkipByFormat
} from '../../../src/main/clipboard/privacy'
import { FakeClipboard } from './fakes'

const dword = (n: number): Buffer => {
  const b = Buffer.alloc(4)
  b.writeUInt32LE(n)
  return b
}

describe('shouldSkipByFormat', () => {
  it('skips Windows content excluded from clipboard monitoring', () => {
    const c = new FakeClipboard()
    c.set({ text: 'hunter2', custom: { ExcludeClipboardContentFromMonitorProcessing: dword(1) } })
    expect(shouldSkipByFormat('win32', c)).toBe(true)
  })

  it('skips Windows content with CanIncludeInClipboardHistory = 0 but not = 1', () => {
    const c = new FakeClipboard()
    c.set({ text: 'x', custom: { CanIncludeInClipboardHistory: dword(0) } })
    expect(shouldSkipByFormat('win32', c)).toBe(true)
    c.set({ text: 'x', custom: { CanIncludeInClipboardHistory: dword(1) } })
    expect(shouldSkipByFormat('win32', c)).toBe(false)
  })

  it('skips macOS concealed and transient pasteboard types', () => {
    const c = new FakeClipboard()
    c.set({ text: 'x', custom: { 'org.nspasteboard.ConcealedType': Buffer.from('1') } })
    expect(shouldSkipByFormat('darwin', c)).toBe(true)
    c.set({ text: 'x', custom: { 'org.nspasteboard.TransientType': Buffer.from('1') } })
    expect(shouldSkipByFormat('darwin', c)).toBe(true)
  })

  it('does not apply another platform’s markers, and survives probe errors', () => {
    const c = new FakeClipboard()
    c.set({ text: 'x', custom: { 'org.nspasteboard.ConcealedType': Buffer.from('1') } })
    expect(shouldSkipByFormat('win32', c)).toBe(false)
    const throwing = {
      has: () => {
        throw new Error('bad format')
      },
      readBuffer: () => Buffer.alloc(0)
    }
    expect(shouldSkipByFormat('win32', throwing)).toBe(false)
  })
})

describe('looksSensitive', () => {
  it.each([
    '-----BEGIN OPENSSH PRIVATE KEY-----\nabc',
    'AKIAIOSFODNN7EXAMPLE',
    'ghp_abcdefghijklmnopqrstuvwxyz0123456789',
    'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
    '4111 1111 1111 1111',
    'Xk9$mQ2vL8pR4tYb7NcW1zAe5HgJd3Uf'
  ])('flags %s', (text) => {
    expect(looksSensitive(text)).toBe(true)
  })

  it.each([
    'Buy milk and eggs tomorrow',
    'https://example.com/a/very/long/path/that/goes/on/and/on/for/a/while',
    '1234 5678 9012 3456',
    'function calculateTotalPriceWithDiscount(items) {',
    'the-quick-brown-fox-jumps-over-the-lazy-dog-again',
    ''
  ])('does not flag %s', (text) => {
    expect(looksSensitive(text)).toBe(false)
  })

  it('masks previews', () => {
    expect(maskPreview('secret-value')).toBe('••••••••••••')
  })
})
