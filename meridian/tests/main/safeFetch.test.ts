// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { UnsafeUrlError, assertPublicHttpUrl, fetchPublicText } from '../../src/main/safeFetch'

const publicDns = async () => ['93.184.216.34']

const html = (text: string, init: ResponseInit = {}) =>
  new Response(text, { status: 200, headers: { 'content-type': 'text/html' }, ...init })

describe('assertPublicHttpUrl', () => {
  it('accepts public http and https URLs', async () => {
    await expect(
      assertPublicHttpUrl('https://example.com/page', publicDns)
    ).resolves.toBeInstanceOf(URL)
    await expect(assertPublicHttpUrl('http://example.com', publicDns)).resolves.toBeInstanceOf(URL)
    await expect(assertPublicHttpUrl('https://8.8.8.8/x', publicDns)).resolves.toBeInstanceOf(URL)
    await expect(
      assertPublicHttpUrl('https://[2606:4700:4700::1111]/', publicDns)
    ).resolves.toBeInstanceOf(URL)
  })

  it.each([
    'file:///etc/passwd',
    'ftp://example.com/x',
    'javascript:alert(1)',
    'data:text/html,hi',
    'not a url',
    '',
    'https://user:pass@example.com/',
    'http://localhost:3000/',
    'http://app.localhost/',
    'http://intranet/admin',
    'http://printer.local/',
    'http://127.0.0.1:8080/',
    'http://10.0.0.1/',
    'http://169.254.169.254/latest/meta-data/',
    'http://[::1]/',
    'http://[::ffff:127.0.0.1]/',
    'http://0.0.0.0/',
    'http://2130706433/' // 127.0.0.1 written as one number; URL parsing normalizes it
  ])('refuses %s', async (url) => {
    await expect(assertPublicHttpUrl(url, publicDns)).rejects.toBeInstanceOf(UnsafeUrlError)
  })

  it('refuses a public-looking name that resolves to a private address (DNS rebinding style)', async () => {
    await expect(
      assertPublicHttpUrl('https://evil.example.com/', async () => ['127.0.0.1'])
    ).rejects.toThrow(/private/)
    await expect(
      assertPublicHttpUrl('https://evil.example.com/', async () => ['93.184.216.34', '10.0.0.1'])
    ).rejects.toThrow(/private/)
  })

  it('refuses names that do not resolve', async () => {
    await expect(
      assertPublicHttpUrl('https://nope.example.com/', async () => {
        throw new Error('ENOTFOUND')
      })
    ).rejects.toThrow(/resolve/)
    await expect(
      assertPublicHttpUrl('https://empty.example.com/', async () => [])
    ).rejects.toBeInstanceOf(UnsafeUrlError)
  })
})

describe('fetchPublicText', () => {
  it('returns the page text and sends the requested headers', async () => {
    const fetchImpl = vi.fn(async () => html('<title>Hi</title>'))
    const text = await fetchPublicText(
      'https://example.com/',
      { headers: { 'User-Agent': 'X' } },
      { fetchImpl, resolve: publicDns }
    )
    expect(text).toBe('<title>Hi</title>')
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://example.com/',
      expect.objectContaining({ redirect: 'manual', headers: { 'User-Agent': 'X' } })
    )
  })

  it('follows a redirect to another public URL', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: '/final' } }))
      .mockResolvedValueOnce(html('done'))
    expect(
      await fetchPublicText('https://example.com/start', {}, { fetchImpl, resolve: publicDns })
    ).toBe('done')
    expect(fetchImpl.mock.calls[1][0]).toBe('https://example.com/final')
  })

  it('refuses a redirect to a private address and never requests it', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, { status: 301, headers: { location: 'http://169.254.169.254/latest' } })
      )
    await expect(
      fetchPublicText('https://example.com/', {}, { fetchImpl, resolve: publicDns })
    ).rejects.toBeInstanceOf(UnsafeUrlError)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('refuses a redirect to a non-http scheme', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, { status: 302, headers: { location: 'file:///etc/passwd' } })
      )
    await expect(
      fetchPublicText('https://example.com/', {}, { fetchImpl, resolve: publicDns })
    ).rejects.toBeInstanceOf(UnsafeUrlError)
  })

  it('stops after too many redirects', async () => {
    const fetchImpl = vi.fn(
      async () => new Response(null, { status: 302, headers: { location: '/again' } })
    )
    await expect(
      fetchPublicText(
        'https://example.com/',
        { maxRedirects: 2 },
        { fetchImpl, resolve: publicDns }
      )
    ).rejects.toThrow(/redirects/)
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })

  it('fails on HTTP errors and on redirects without a location', async () => {
    await expect(
      fetchPublicText(
        'https://example.com/',
        {},
        { fetchImpl: async () => new Response('x', { status: 500 }), resolve: publicDns }
      )
    ).rejects.toThrow(/500/)
    await expect(
      fetchPublicText(
        'https://example.com/',
        {},
        { fetchImpl: async () => new Response(null, { status: 302 }), resolve: publicDns }
      )
    ).rejects.toThrow(/302/)
  })

  it('caps the size of what it reads', async () => {
    const big = 'a'.repeat(5000)
    const text = await fetchPublicText(
      'https://example.com/',
      { maxBytes: 1000 },
      { fetchImpl: async () => html(big), resolve: publicDns }
    )
    expect(text.length).toBeLessThanOrEqual(5000)
    expect(text.length).toBeLessThan(big.length + 1)
  })

  it('aborts when the server is too slow', async () => {
    const fetchImpl = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
        })
    )
    await expect(
      fetchPublicText(
        'https://example.com/',
        { timeoutMs: 30 },
        { fetchImpl: fetchImpl as unknown as typeof fetch, resolve: publicDns }
      )
    ).rejects.toThrow(/aborted/)
  })
})
