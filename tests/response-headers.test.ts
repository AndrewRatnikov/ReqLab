/**
 * Tests for: pure response-header functions (apps/web/src/utils/responseHeaders.ts)
 * Contract source: runs/run_20261006_204152/plan.md § Interface Contract
 * Covers PRD criteria 3, 4, 5, 6, 8, 14.
 *
 * CONTRACT_GAPS: none.
 */

import { describe, it, expect } from 'vitest'
import {
  DIRECT_HEADERS_NOTE,
  PROXY_HEADERS_NOTE,
  NO_HEADERS_MESSAGE,
  headersToEntries,
  parseUpstreamSetCookie,
  toDisplayHeaders,
  headersNote,
  formatHeadersTitle,
} from '../apps/web/src/utils/responseHeaders'

describe('headersToEntries', () => {
  it('returns an empty list for empty headers', () => {
    expect(headersToEntries(new Headers())).toEqual([])
  })

  it('lower-cases names, keeps values verbatim, one entry per header', () => {
    const headers = new Headers({ 'X-Request-ID': 'Abc', 'Content-Type': 'application/json' })
    const entries = headersToEntries(headers)
    expect(entries).toHaveLength(2)
    expect(entries).toEqual(expect.arrayContaining([
      { name: 'x-request-id', value: 'Abc' },
      { name: 'content-type', value: 'application/json' },
    ]))
  })

  it('follows the Headers iteration order', () => {
    const headers = new Headers({ 'B-Header': '2', 'A-Header': '1', 'C-Header': '3' })
    const expected: { name: string; value: string }[] = []
    headers.forEach((value, name) => expected.push({ name, value }))
    expect(headersToEntries(headers)).toEqual(expected)
  })

  it('different inputs give different outputs', () => {
    expect(headersToEntries(new Headers({ a: '1' }))).not.toEqual(headersToEntries(new Headers({ a: '2' })))
  })
})

describe('parseUpstreamSetCookie', () => {
  it('decodes a JSON array of cookies, including Expires with a comma', () => {
    const value = '["a=1; Path=/","b=2; Expires=Wed, 21 Oct 2026 07:28:00 GMT"]'
    expect(parseUpstreamSetCookie(value)).toEqual([
      'a=1; Path=/',
      'b=2; Expires=Wed, 21 Oct 2026 07:28:00 GMT',
    ])
  })

  it('returns an empty list for []', () => {
    expect(parseUpstreamSetCookie('[]')).toEqual([])
  })

  it('falls back to [value] for non-JSON input', () => {
    expect(parseUpstreamSetCookie('a=1; Path=/')).toEqual(['a=1; Path=/'])
  })

  it('falls back to [value] for JSON that is not an array of strings', () => {
    expect(parseUpstreamSetCookie('{"a":1}')).toEqual(['{"a":1}'])
    expect(parseUpstreamSetCookie('[1,2]')).toEqual(['[1,2]'])
  })
})

describe('toDisplayHeaders: direct path', () => {
  const entries = [
    { name: 'access-control-allow-origin', value: '*' },
    { name: 'content-type', value: 'application/json' },
    { name: 'x-upstream-set-cookie', value: '["a=1"]' },
    { name: 'vary', value: 'Origin' },
  ]

  it('returns a deep-equal copy with no mapping', () => {
    const result = toDisplayHeaders(entries, false)
    expect(result).toEqual(entries)
    expect(result).not.toBe(entries)
  })

  it('does not hide or relabel anything', () => {
    const names = toDisplayHeaders(entries, false).map((e) => e.name)
    expect(names).toContain('x-upstream-set-cookie')
    expect(names).toContain('access-control-allow-origin')
    expect(names).toContain('vary')
  })
})

describe('toDisplayHeaders: proxy path', () => {
  it('maps x-upstream-set-cookie to one set-cookie row per cookie, in order', () => {
    const result = toDisplayHeaders(
      [{ name: 'x-upstream-set-cookie', value: '["a=1; Path=/","b=2; Expires=Wed, 21 Oct 2026 07:28:00 GMT"]' }],
      true,
    )
    expect(result).toEqual([
      { name: 'set-cookie', value: 'a=1; Path=/' },
      { name: 'set-cookie', value: 'b=2; Expires=Wed, 21 Oct 2026 07:28:00 GMT' },
    ])
  })

  it('de-prefixes x-upstream-access-control-* and x-upstream-vary with upstream values', () => {
    const result = toDisplayHeaders(
      [
        { name: 'x-upstream-access-control-allow-origin', value: 'https://up.example' },
        { name: 'x-upstream-vary', value: 'Accept-Encoding' },
      ],
      true,
    )
    expect(result).toEqual([
      { name: 'access-control-allow-origin', value: 'https://up.example' },
      { name: 'vary', value: 'Accept-Encoding' },
    ])
  })

  it('drops the Worker own access-control-* and vary rows', () => {
    const result = toDisplayHeaders(
      [
        { name: 'access-control-allow-origin', value: 'https://andrewratnikov.github.io' },
        { name: 'access-control-expose-headers', value: 'content-type' },
        { name: 'vary', value: 'Origin' },
        { name: 'content-type', value: 'application/json' },
      ],
      true,
    )
    expect(result).toEqual([{ name: 'content-type', value: 'application/json' }])
  })

  it('shows the upstream value, not the Worker value, when both exist', () => {
    const result = toDisplayHeaders(
      [
        { name: 'vary', value: 'Origin' },
        { name: 'x-upstream-vary', value: 'Accept-Encoding' },
      ],
      true,
    )
    expect(result).toEqual([{ name: 'vary', value: 'Accept-Encoding' }])
  })

  it('keeps other headers unchanged, including other x-upstream-* names', () => {
    const result = toDisplayHeaders(
      [
        { name: 'x-request-id', value: 'Abc' },
        { name: 'x-upstream-latency', value: '5' },
      ],
      true,
    )
    expect(result).toEqual([
      { name: 'x-request-id', value: 'Abc' },
      { name: 'x-upstream-latency', value: '5' },
    ])
  })

  it('matches case-insensitively and outputs lower-case names', () => {
    const result = toDisplayHeaders(
      [
        { name: 'X-Upstream-Vary', value: 'Accept' },
        { name: 'X-Upstream-Set-Cookie', value: '["a=1"]' },
        { name: 'X-Upstream-Access-Control-Max-Age', value: '10' },
        { name: 'Access-Control-Allow-Origin', value: 'x' },
        { name: 'VARY', value: 'Origin' },
      ],
      true,
    )
    expect(result).toEqual([
      { name: 'access-control-max-age', value: '10' },
      { name: 'set-cookie', value: 'a=1' },
      { name: 'vary', value: 'Accept' },
    ])
  })

  it('sorts ascending by name and keeps set-cookie rows in cookie order', () => {
    const result = toDisplayHeaders(
      [
        { name: 'x-request-id', value: '1' },
        { name: 'x-upstream-set-cookie', value: '["z=1","a=2"]' },
        { name: 'content-type', value: 'text/plain' },
        { name: 'x-upstream-vary', value: 'Accept' },
      ],
      true,
    )
    expect(result.map((e) => e.name)).toEqual(['content-type', 'set-cookie', 'set-cookie', 'vary', 'x-request-id'])
    expect(result.filter((e) => e.name === 'set-cookie').map((e) => e.value)).toEqual(['z=1', 'a=2'])
  })

  it('does not mutate the input entries', () => {
    const entries = [
      { name: 'x-upstream-vary', value: 'Accept' },
      { name: 'vary', value: 'Origin' },
    ]
    const snapshot = JSON.parse(JSON.stringify(entries))
    toDisplayHeaders(entries, true)
    expect(entries).toEqual(snapshot)
  })

  it('returns an empty list for no entries', () => {
    expect(toDisplayHeaders([], true)).toEqual([])
  })
})

describe('headersNote', () => {
  it('returns the direct note when not proxied', () => {
    expect(headersNote(false)).toBe(DIRECT_HEADERS_NOTE)
  })

  it('returns the proxy note when proxied, and it differs from the direct note', () => {
    expect(headersNote(true)).toBe(PROXY_HEADERS_NOTE)
    expect(PROXY_HEADERS_NOTE).not.toBe(DIRECT_HEADERS_NOTE)
  })

  it('direct note mentions the browser hiding headers; proxy note mentions the proxy and X-Upstream-Set-Cookie', () => {
    expect(DIRECT_HEADERS_NOTE).toMatch(/hidden by the browser/)
    expect(PROXY_HEADERS_NOTE).toMatch(/CORS proxy/)
    expect(PROXY_HEADERS_NOTE).toMatch(/X-Upstream-Set-Cookie/)
  })
})

describe('formatHeadersTitle and empty message', () => {
  it('formats the count', () => {
    expect(formatHeadersTitle(3)).toBe('Response headers (3)')
    expect(formatHeadersTitle(0)).toBe('Response headers (0)')
    expect(formatHeadersTitle(12)).toBe('Response headers (12)')
  })

  it('exposes a non-empty empty-state message', () => {
    expect(NO_HEADERS_MESSAGE).toBe('No response headers to show.')
  })
})
