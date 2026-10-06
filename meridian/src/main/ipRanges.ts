import { isIP } from 'net'

/** Which IP addresses and host names count as local or private (used to keep server-side fetches public). */

function ipv4Octets(ip: string): number[] | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  const nums = parts.map((x) => (/^\d{1,3}$/.test(x) ? Number(x) : NaN))
  return nums.every((n) => n >= 0 && n <= 255) ? nums : null
}

function isPrivateIPv4(o: number[]): boolean {
  const [a, b, c] = o
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) || // IETF protocol assignments, TEST-NET-1
    (a === 192 && b === 88 && c === 99) || // 6to4 relay anycast
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    (a === 198 && b === 51 && c === 100) || // TEST-NET-2
    (a === 203 && b === 0 && c === 113) || // TEST-NET-3
    a >= 224 // multicast and reserved
  )
}

/** Expand an IPv6 address into eight 16-bit groups, or null if it is malformed. */
function ipv6Groups(ip: string): number[] | null {
  let text = ip.split('%')[0]
  const v4 = /(\d+\.\d+\.\d+\.\d+)$/.exec(text)
  if (v4) {
    const o = ipv4Octets(v4[1])
    if (!o) return null
    text =
      text.slice(0, -v4[1].length) +
      ((o[0] << 8) | o[1]).toString(16) +
      ':' +
      ((o[2] << 8) | o[3]).toString(16)
  }
  const halves = text.split('::')
  if (halves.length > 2) return null
  const head = halves[0] ? halves[0].split(':') : []
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : []
  const missing = 8 - head.length - tail.length
  if ((halves.length === 1 && missing !== 0) || missing < 0) return null
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill('0'), ...tail]
  if (groups.length !== 8 || !groups.every((g) => /^[0-9a-fA-F]{1,4}$/.test(g))) return null
  return groups.map((g) => parseInt(g, 16))
}

/** Loopback, private, link-local, multicast, reserved and unspecified addresses. */
export function isPrivateAddress(ip: string): boolean {
  const kind = isIP(ip)
  if (kind === 4) {
    const o = ipv4Octets(ip)
    return !o || isPrivateIPv4(o)
  }
  if (kind === 6) {
    const g = ipv6Groups(ip)
    if (!g) return true
    if (g.every((x) => x === 0)) return true // ::
    if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return true // ::1
    // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible: judge by the embedded IPv4 address
    if (g.slice(0, 5).every((x) => x === 0) && (g[5] === 0xffff || g[5] === 0)) {
      return isPrivateIPv4([g[6] >> 8, g[6] & 255, g[7] >> 8, g[7] & 255])
    }
    // NAT64 64:ff9b::/96
    if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) {
      return isPrivateIPv4([g[6] >> 8, g[6] & 255, g[7] >> 8, g[7] & 255])
    }
    // 6to4 2002::/16 embeds an IPv4 address in the next 32 bits
    if (g[0] === 0x2002) return isPrivateIPv4([g[1] >> 8, g[1] & 255, g[2] >> 8, g[2] & 255])
    if (g[0] === 0x2001 && g[1] === 0) return true // Teredo 2001::/32: tunnels to arbitrary hosts
    if ((g[0] & 0xfe00) === 0xfc00) return true // fc00::/7 unique local
    if ((g[0] & 0xffc0) === 0xfe80) return true // fe80::/10 link-local
    if ((g[0] & 0xffc0) === 0xfec0) return true // fec0::/10 deprecated site-local
    if ((g[0] & 0xff00) === 0xff00) return true // multicast
    if (g[0] === 0x2001 && g[1] === 0x0db8) return true // documentation
    return false
  }
  return true // not an IP address at all
}

/** Host names that are local by convention, whatever DNS says. */
export function isLocalHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, '')
  return (
    h === 'localhost' ||
    h.endsWith('.localhost') ||
    h.endsWith('.local') ||
    h.endsWith('.internal') ||
    h.endsWith('.lan') ||
    h.endsWith('.home.arpa') ||
    !h.includes('.') // single-label names resolve through the local network
  )
}
