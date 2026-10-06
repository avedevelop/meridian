// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createServer, type Server } from 'http'
import type { AddressInfo } from 'net'
import {
  UnsafeUrlError,
  assertPublicHttpUrl,
  fetchPublicText,
  nodeRequest,
  resolvePublicTarget,
  type RawResponse,
  type RequestImpl
} from '../../src/main/safeFetch'

const publicDns = async () => ['93.184.216.34']

function response(body: string | string[], status = 200, headers: RawResponse['headers'] = {}) {
  const parts = (Array.isArray(body) ? body : [body]).map((p) => new TextEncoder().encode(p))
  const destroy = vi.fn()
  const raw: RawResponse = {
    status,
    headers,
    destroy,
    body: (async function* () {
      for (const p of parts) yield p
    })()
  }
  return { raw, destroy }
}

const ok = (body: string) => async () => response(body).raw

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
    'http://[2002:7f00:1::1]/',
    'http://0.0.0.0/',
    'http://2130706433/' // 127.0.0.1 written as one number; URL parsing normalizes it
  ])('refuses %s', async (url) => {
    await expect(assertPublicHttpUrl(url, publicDns)).rejects.toBeInstanceOf(UnsafeUrlError)
  })

  it('refuses a public-looking name that resolves to a private address', async () => {
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

describe('resolvePublicTarget', () => {
  it('returns the validated address and its family', async () => {
    expect(
      await resolvePublicTarget('https://example.com/', async () => ['93.184.216.34'])
    ).toMatchObject({
      address: '93.184.216.34',
      family: 4
    })
    expect(
      await resolvePublicTarget('https://example.com/', async () => ['2606:4700::1111'])
    ).toMatchObject({
      family: 6
    })
    expect(await resolvePublicTarget('https://8.8.4.4/')).toMatchObject({
      address: '8.8.4.4',
      family: 4
    })
  })
})

describe('fetchPublicText', () => {
  it('returns the page text and passes the headers through', async () => {
    const request = vi.fn<RequestImpl>(ok('<title>Hi</title>'))
    const text = await fetchPublicText(
      'https://example.com/',
      { headers: { 'User-Agent': 'X' } },
      { request, resolve: publicDns }
    )
    expect(text).toBe('<title>Hi</title>')
    expect(request.mock.calls[0][1].headers).toEqual({ 'User-Agent': 'X' })
  })

  it('connects to the address that was validated, not to whatever the name resolves to later', async () => {
    let lookups = 0
    // First answer is public, any later answer would be the attacker's 127.0.0.1
    const resolve = async () => (++lookups === 1 ? ['93.184.216.34'] : ['127.0.0.1'])
    const request = vi.fn<RequestImpl>(ok('page'))
    await fetchPublicText('https://rebind.example.com/', {}, { request, resolve })
    expect(request.mock.calls[0][1].address).toBe('93.184.216.34')
    expect(lookups).toBe(1) // the name is resolved once; the request must not resolve it again
  })

  it('follows a redirect to another public URL and validates that hop too', async () => {
    const request = vi
      .fn<RequestImpl>()
      .mockResolvedValueOnce(response('', 302, { location: '/final' }).raw)
      .mockResolvedValueOnce(response('done').raw)
    const resolve = vi.fn(publicDns)
    expect(await fetchPublicText('https://example.com/start', {}, { request, resolve })).toBe(
      'done'
    )
    expect(request.mock.calls[1][0].toString()).toBe('https://example.com/final')
    expect(resolve).toHaveBeenCalledTimes(2)
  })

  it('refuses a redirect to a private address and never connects to it', async () => {
    const request = vi
      .fn<RequestImpl>()
      .mockResolvedValueOnce(response('', 301, { location: 'http://169.254.169.254/latest' }).raw)
    await expect(
      fetchPublicText('https://example.com/', {}, { request, resolve: publicDns })
    ).rejects.toBeInstanceOf(UnsafeUrlError)
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('refuses a redirect to a non-http scheme', async () => {
    const request = vi
      .fn<RequestImpl>()
      .mockResolvedValueOnce(response('', 302, { location: 'file:///etc/passwd' }).raw)
    await expect(
      fetchPublicText('https://example.com/', {}, { request, resolve: publicDns })
    ).rejects.toBeInstanceOf(UnsafeUrlError)
  })

  it('closes the connection of every redirect it follows', async () => {
    const first = response('', 302, { location: '/b' })
    const second = response('', 302, { location: '/c' })
    const last = response('end')
    const request = vi
      .fn<RequestImpl>()
      .mockResolvedValueOnce(first.raw)
      .mockResolvedValueOnce(second.raw)
      .mockResolvedValueOnce(last.raw)
    await fetchPublicText('https://example.com/', {}, { request, resolve: publicDns })
    expect(first.destroy).toHaveBeenCalled()
    expect(second.destroy).toHaveBeenCalled()
    expect(last.destroy).toHaveBeenCalled() // and the final one once it has been read
  })

  it('stops after too many redirects', async () => {
    const request = vi.fn<RequestImpl>(async () => response('', 302, { location: '/again' }).raw)
    await expect(
      fetchPublicText('https://example.com/', { maxRedirects: 2 }, { request, resolve: publicDns })
    ).rejects.toThrow(/redirects/)
    expect(request).toHaveBeenCalledTimes(3)
  })

  it('fails on HTTP errors and on redirects without a location, closing the connection', async () => {
    const bad = response('x', 500)
    await expect(
      fetchPublicText(
        'https://example.com/',
        {},
        { request: async () => bad.raw, resolve: publicDns }
      )
    ).rejects.toThrow(/500/)
    expect(bad.destroy).toHaveBeenCalled()
    await expect(
      fetchPublicText(
        'https://example.com/',
        {},
        { request: async () => response('', 302).raw, resolve: publicDns }
      )
    ).rejects.toThrow(/302/)
  })

  it('keeps exactly maxBytes, including part of a chunk that crosses the limit', async () => {
    const r = response(['a'.repeat(600), 'b'.repeat(600), 'c'.repeat(600)])
    const text = await fetchPublicText(
      'https://example.com/',
      { maxBytes: 1000 },
      { request: async () => r.raw, resolve: publicDns }
    )
    expect(text).toBe('a'.repeat(600) + 'b'.repeat(400))
    expect(r.destroy).toHaveBeenCalled()
  })

  it('does not return an empty page when the very first chunk is larger than the limit', async () => {
    const text = await fetchPublicText(
      'https://example.com/',
      { maxBytes: 100 },
      { request: async () => response('x'.repeat(5000)).raw, resolve: publicDns }
    )
    expect(text).toBe('x'.repeat(100))
  })

  it('aborts when the server is too slow', async () => {
    const request: RequestImpl = (_url, target) =>
      new Promise((_resolve, reject) =>
        target.signal.addEventListener('abort', () => reject(new Error('aborted')))
      )
    await expect(
      fetchPublicText('https://example.com/', { timeoutMs: 30 }, { request, resolve: publicDns })
    ).rejects.toThrow(/aborted/)
  })

  it('aborts when name resolution hangs: the deadline covers DNS', async () => {
    const request = vi.fn<RequestImpl>(ok('never'))
    await expect(
      fetchPublicText(
        'https://example.com/',
        { timeoutMs: 30 },
        { request, resolve: () => new Promise<string[]>(() => undefined) }
      )
    ).rejects.toThrow(/aborted/)
    expect(request).not.toHaveBeenCalled()
  })

  it('aborts when the body stalls part-way', async () => {
    const request: RequestImpl = async (_url, target) => ({
      status: 200,
      headers: {},
      destroy: () => undefined,
      body: (async function* () {
        yield new TextEncoder().encode('start')
        await new Promise((_r, reject) =>
          target.signal.addEventListener('abort', () => reject(new Error('aborted')))
        )
      })()
    })
    await expect(
      fetchPublicText('https://example.com/', { timeoutMs: 40 }, { request, resolve: publicDns })
    ).rejects.toThrow(/aborted/)
  })
})

describe('nodeRequest (real sockets)', () => {
  let server: Server | undefined
  afterEach(() => new Promise<void>((done) => (server ? server.close(() => done()) : done())))

  const start = async (handler: Parameters<typeof createServer>[1]): Promise<number> => {
    server = createServer(handler)
    await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve))
    return (server.address() as AddressInfo).port
  }

  it('connects to the pinned address even though the host name does not exist in DNS', async () => {
    const port = await start((req, res) => {
      res.setHeader('x-host', String(req.headers.host))
      res.end('pinned page')
    })
    const raw = await nodeRequest(new URL(`http://pinned.invalid:${port}/`), {
      address: '127.0.0.1',
      family: 4,
      headers: {},
      signal: new AbortController().signal
    })
    const chunks: Uint8Array[] = []
    for await (const c of raw.body) chunks.push(c)
    expect(Buffer.concat(chunks).toString()).toBe('pinned page')
    expect(raw.status).toBe(200)
    expect(raw.headers['x-host']).toBe(`pinned.invalid:${port}`) // the Host header still names the site
  })

  it('exposes redirect headers and can be aborted', async () => {
    const port = await start((_req, res) => {
      res.statusCode = 302
      res.setHeader('location', '/elsewhere')
      res.end()
    })
    const raw = await nodeRequest(new URL(`http://x.invalid:${port}/`), {
      address: '127.0.0.1',
      family: 4,
      headers: {},
      signal: new AbortController().signal
    })
    expect(raw.status).toBe(302)
    expect(raw.headers.location).toBe('/elsewhere')
    raw.destroy()

    const controller = new AbortController()
    controller.abort()
    await expect(
      nodeRequest(new URL(`http://x.invalid:${port}/`), {
        address: '127.0.0.1',
        family: 4,
        headers: {},
        signal: controller.signal
      })
    ).rejects.toBeDefined()
  })

  it('works end to end through fetchPublicText when the target check is satisfied by a stub resolver', async () => {
    const port = await start((_req, res) => res.end('<title>Real</title>'))
    // Loopback is refused by the real check, which is the point: prove it with the real resolver path
    await expect(fetchPublicText(`http://127.0.0.1:${port}/`)).rejects.toBeInstanceOf(
      UnsafeUrlError
    )
  })
})
