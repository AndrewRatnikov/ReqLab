import type { ResponseHeaderEntry } from '../types/http'

export const DIRECT_HEADERS_NOTE =
  'Some headers may be hidden by the browser (CORS). Only headers the server exposes to the page are shown.'
export const PROXY_HEADERS_NOTE =
  "These headers were relayed through the CORS proxy. Set-Cookie is shown from X-Upstream-Set-Cookie, and Access-Control-* and Vary are the target server's own values, not the proxy's."
export const NO_HEADERS_MESSAGE = 'No response headers to show.'

const UPSTREAM_PREFIX = 'x-upstream-'
const UPSTREAM_SET_COOKIE = 'x-upstream-set-cookie'
const UPSTREAM_VARY = 'x-upstream-vary'
const UPSTREAM_ACCESS_CONTROL_PREFIX = 'x-upstream-access-control-'

export function headersToEntries(headers: Headers): ResponseHeaderEntry[] {
  const entries: ResponseHeaderEntry[] = []
  headers.forEach((value, name) => {
    entries.push({ name: name.toLowerCase(), value })
  })
  return entries
}

export function parseUpstreamSetCookie(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value)
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
      return parsed as string[]
    }
  } catch {
    // Not JSON: fall through so the raw value is still shown.
  }
  return [value]
}

function mapProxyEntry(entry: ResponseHeaderEntry): ResponseHeaderEntry[] {
  const name = entry.name.toLowerCase()
  if (name === UPSTREAM_SET_COOKIE) {
    return parseUpstreamSetCookie(entry.value).map((cookie) => ({
      name: 'set-cookie',
      value: cookie,
    }))
  }
  if (name.startsWith(UPSTREAM_ACCESS_CONTROL_PREFIX) || name === UPSTREAM_VARY) {
    return [{ name: name.slice(UPSTREAM_PREFIX.length), value: entry.value }]
  }
  if (name.startsWith('access-control-') || name === 'vary') {
    // The proxy's own CORS values, not the target server's.
    return []
  }
  return [{ name, value: entry.value }]
}

export function toDisplayHeaders(
  entries: ResponseHeaderEntry[],
  viaProxy: boolean,
): ResponseHeaderEntry[] {
  if (!viaProxy) {
    return entries.map((entry) => ({ ...entry }))
  }
  const mapped = entries.flatMap(mapProxyEntry)
  // Array.prototype.sort is stable, so set-cookie rows keep cookie order.
  return mapped.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
}

export function headersNote(viaProxy: boolean): string {
  return viaProxy ? PROXY_HEADERS_NOTE : DIRECT_HEADERS_NOTE
}

export function formatHeadersTitle(count: number): string {
  return `Response headers (${count})`
}
