import { request as httpRequest } from 'http'
import { request as httpsRequest } from 'https'
import { isIP } from 'net'
import { lookup as dnsLookup } from 'dns/promises'
import { isLocalHostname, isPrivateAddress } from './ipRanges'

export interface SafeFetchOptions {
  maxBytes?: number
  /** Covers everything: name resolution, every redirect hop and reading the body. */
  timeoutMs?: number
  maxRedirects?: number
  headers?: Record<string, string>
}

export interface RawResponse {
  status: number
  headers: Record<string, string | string[] | undefined>
  body: AsyncIterable<Uint8Array>
  destroy: () => void
}

export interface RequestTarget {
  /** The address that was checked. The connection must go to exactly this one. */
  address: string
  family: 4 | 6
  headers: Record<string, string>
  signal: AbortSignal
}

export type RequestImpl = (url: URL, target: RequestTarget) => Promise<RawResponse>

export interface SafeFetchDeps {
  request?: RequestImpl
  resolve?: (hostname: string) => Promise<string[]>
}

export class UnsafeUrlError extends Error {}

const defaultResolve = async (hostname: string): Promise<string[]> =>
  (await dnsLookup(hostname, { all: true })).map((r) => r.address)

export interface PublicTarget {
  url: URL
  address: string
  family: 4 | 6
}

/**
 * Throws unless `rawUrl` is http(s), has no credentials, and every address its host resolves to is
 * a public one. Returns one validated address: the request must connect to that address and not
 * resolve the name again, otherwise a DNS answer that changes in between (DNS rebinding) would
 * undo the check.
 */
export async function resolvePublicTarget(
  rawUrl: string,
  resolve: (hostname: string) => Promise<string[]> = defaultResolve
): Promise<PublicTarget> {
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
  const literal = isIP(host)
  if (literal) {
    if (isPrivateAddress(host)) throw new UnsafeUrlError('Private addresses are not allowed')
    return { url, address: host, family: literal as 4 | 6 }
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
  return { url, address: addresses[0], family: isIP(addresses[0]) as 4 | 6 }
}

/** Same check without the address, for callers that only need the verdict. */
export async function assertPublicHttpUrl(
  rawUrl: string,
  resolve?: (hostname: string) => Promise<string[]>
): Promise<URL> {
  return (await resolvePublicTarget(rawUrl, resolve)).url
}

/** HTTP GET that connects to the pre-validated address instead of resolving the name again. */
export const nodeRequest: RequestImpl = (url, target) =>
  new Promise((resolve, reject) => {
    const send = url.protocol === 'https:' ? httpsRequest : httpRequest
    const req = send(
      url,
      {
        method: 'GET',
        headers: { 'Accept-Encoding': 'identity', ...target.headers },
        signal: target.signal,
        agent: false, // a shared agent could reuse a socket that was opened to another address
        // Node calls this instead of DNS. TLS still validates the certificate against the host name.
        lookup: (_hostname, options, callback) => {
          const entry = { address: target.address, family: target.family }
          if (options && typeof options === 'object' && options.all) {
            ;(callback as unknown as (e: null, a: (typeof entry)[]) => void)(null, [entry])
          } else {
            callback(null, entry.address, entry.family)
          }
        }
      },
      (res) =>
        resolve({
          status: res.statusCode ?? 0,
          headers: res.headers,
          body: res,
          destroy: () => res.destroy()
        })
    )
    req.on('error', reject)
    req.end()
  })

/** Reject when `signal` aborts, so a hanging DNS lookup cannot outlive the deadline. */
function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(new Error('aborted'))
  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => reject(new Error('aborted'))
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort)
        resolve(value)
      },
      (error) => {
        signal.removeEventListener('abort', onAbort)
        reject(error)
      }
    )
  })
}

async function readCapped(response: RawResponse, maxBytes: number): Promise<string> {
  const chunks: Buffer[] = []
  let total = 0
  try {
    for await (const chunk of response.body) {
      const room = maxBytes - total
      // Keep what fits: page metadata lives at the top of the document.
      chunks.push(Buffer.from(room >= chunk.length ? chunk : chunk.subarray(0, room)))
      total += Math.min(chunk.length, room)
      if (total >= maxBytes) break
    }
  } finally {
    response.destroy()
  }
  return new TextDecoder('utf-8').decode(Buffer.concat(chunks))
}

/**
 * GET a public web page as text. The address of every hop (including redirects) is checked and
 * pinned, and the number of redirects, the total time and the size are capped.
 */
export async function fetchPublicText(
  rawUrl: string,
  options: SafeFetchOptions = {},
  deps: SafeFetchDeps = {}
): Promise<string> {
  const { maxBytes = 1_000_000, timeoutMs = 8000, maxRedirects = 3, headers = {} } = options
  const request = deps.request ?? nodeRequest
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const { signal } = controller
  try {
    let current = rawUrl
    for (let hop = 0; hop <= maxRedirects; hop++) {
      const target = await abortable(resolvePublicTarget(current, deps.resolve), signal)
      const response = await abortable(
        request(target.url, { address: target.address, family: target.family, headers, signal }),
        signal
      )
      if (response.status >= 300 && response.status < 400) {
        response.destroy() // do not leave the socket open while following the redirect
        const location = response.headers.location
        const next = Array.isArray(location) ? location[0] : location
        if (!next) throw new Error(`HTTP error ${response.status}`)
        current = new URL(next, target.url).toString()
        continue
      }
      if (response.status < 200 || response.status >= 300) {
        response.destroy()
        throw new Error(`HTTP error ${response.status}`)
      }
      return await abortable(readCapped(response, maxBytes), signal)
    }
    throw new Error('Too many redirects')
  } finally {
    clearTimeout(timer)
  }
}
