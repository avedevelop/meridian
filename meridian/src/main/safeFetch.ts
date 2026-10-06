import { isIP } from 'net'
import { lookup as dnsLookup } from 'dns/promises'
import { isLocalHostname, isPrivateAddress } from './security'

export interface SafeFetchOptions {
  maxBytes?: number
  timeoutMs?: number
  maxRedirects?: number
  headers?: Record<string, string>
}

export interface SafeFetchDeps {
  fetchImpl?: typeof fetch
  resolve?: (hostname: string) => Promise<string[]>
}

export class UnsafeUrlError extends Error {}

const defaultResolve = async (hostname: string): Promise<string[]> =>
  (await dnsLookup(hostname, { all: true })).map((r) => r.address)

/**
 * Throws unless `url` is http(s), has no credentials, and every address its host resolves to is a
 * public one. A fetch made from the main process bypasses the renderer's CSP, so it must not be
 * usable to reach the user's local network or services on localhost.
 */
export async function assertPublicHttpUrl(
  rawUrl: string,
  resolve: (hostname: string) => Promise<string[]> = defaultResolve
): Promise<URL> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new UnsafeUrlError('Invalid URL')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnsafeUrlError('Only http and https URLs are allowed')
  }
  if (url.username || url.password)
    throw new UnsafeUrlError('URLs with credentials are not allowed')

  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new UnsafeUrlError('Private addresses are not allowed')
    return url
  }
  if (isLocalHostname(host)) throw new UnsafeUrlError('Local host names are not allowed')

  let addresses: string[]
  try {
    addresses = await resolve(host)
  } catch {
    throw new UnsafeUrlError('Could not resolve host')
  }
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new UnsafeUrlError('Host resolves to a private address')
  }
  return url
}

async function readCapped(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) return ''
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.length
    if (total > maxBytes) {
      await reader.cancel()
      break // keep what fits: page metadata lives at the top of the document
    }
    chunks.push(value)
  }
  return new TextDecoder('utf-8').decode(Buffer.concat(chunks))
}

/**
 * GET a public web page as text. Every hop (including redirects) is checked, the number of
 * redirects, the time and the size are capped.
 */
export async function fetchPublicText(
  rawUrl: string,
  options: SafeFetchOptions = {},
  deps: SafeFetchDeps = {}
): Promise<string> {
  const { maxBytes = 1_000_000, timeoutMs = 8000, maxRedirects = 3, headers = {} } = options
  const fetchImpl = deps.fetchImpl ?? fetch
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    let current = rawUrl
    for (let hop = 0; hop <= maxRedirects; hop++) {
      const url = await assertPublicHttpUrl(current, deps.resolve)
      const response = await fetchImpl(url.toString(), {
        headers,
        redirect: 'manual',
        signal: controller.signal
      })
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (!location) throw new Error(`HTTP error ${response.status}`)
        current = new URL(location, url).toString()
        continue
      }
      if (!response.ok) throw new Error(`HTTP error ${response.status}`)
      return await readCapped(response, maxBytes)
    }
    throw new Error('Too many redirects')
  } finally {
    clearTimeout(timer)
  }
}
