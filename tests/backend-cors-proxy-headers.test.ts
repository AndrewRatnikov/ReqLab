/**
 * Tests for: Worker response header relay (backend/src/index.js)
 * Contract source: runs/run_20261006_204152/plan.md § Interface Contract
 * Covers PRD criteria 9, 10, 11, 12, 13.
 *
 * CONTRACT_GAPS: none.
 *
 * Mocking: the Worker's outbound global `fetch` is stubbed with
 * vi.stubGlobal and restored in afterEach. No real network or filesystem.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import worker, {
  buildRelayedResponseHeaders,
  UPSTREAM_HEADER_PREFIX,
  UPSTREAM_SET_COOKIE_HEADER,
  VARY_DEFAULT,
  buildForwardHeaders,
} from '../backend/src/index.js'

const ALLOWED_ORIGIN = 'https://andrewratnikov.github.io'
const DISALLOWED_ORIGIN = 'https://evil.example.com'
const WORKER_BASE = 'https://proxy.example.com/'
const TARGET = 'https://api.example.com/data'
const TARGET_QS = `?url=${encodeURIComponent(TARGET)}`

const COOKIE_A = 'a=1; Path=/'
const COOKIE_B = 'b=2; Expires=Wed, 21 Oct 2026 07:28:00 GMT; HttpOnly'

const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST',
}

function exposed(headers: Headers): string[] {
  const value = headers.get('access-control-expose-headers') ?? ''
  return value.split(/\s*,\s*/).filter(Boolean)
}

function upstreamHeaders(): Headers {
  const h = new Headers()
  h.append('Content-Type', 'application/json')
  h.append('X-Request-ID', 'abc')
  h.append('Set-Cookie', COOKIE_A)
  h.append('Set-Cookie', COOKIE_B)
  h.append('Access-Control-Allow-Origin', '*')
  h.append('Vary', 'Accept-Encoding')
  return h
}

async function callWorker(upstream: Response, origin: string | null = ALLOWED_ORIGIN, qs = TARGET_QS) {
  const mockFetch = vi.fn().mockResolvedValue(upstream)
  vi.stubGlobal('fetch', mockFetch)
  const init: RequestInit = { method: 'GET', headers: origin ? { Origin: origin } : {} }
  const response = await worker.fetch(new Request(`${WORKER_BASE}${qs}`, init), {}, {})
  return { response, mockFetch }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('constants', () => {
  it('exports the relay header names', () => {
    expect(UPSTREAM_HEADER_PREFIX).toBe('X-Upstream-')
    expect(UPSTREAM_SET_COOKIE_HEADER).toBe('X-Upstream-Set-Cookie')
  })
})

describe('buildRelayedResponseHeaders: Set-Cookie (criterion 10)', () => {
  it('re-emits multiple cookies as a JSON array in order and no real set-cookie', () => {
    const result = buildRelayedResponseHeaders(upstreamHeaders(), CORS)
    expect(result.get('set-cookie')).toBeNull()
    expect(result.getSetCookie()).toEqual([])
    const value = result.get('x-upstream-set-cookie')
    expect(value).not.toBeNull()
    expect(JSON.parse(value as string)).toEqual([COOKIE_A, COOKIE_B])
  })

  it('a single cookie is still a one-element array', () => {
    const h = new Headers()
    h.append('Set-Cookie', 'only=1')
    const result = buildRelayedResponseHeaders(h, CORS)
    expect(JSON.parse(result.get('x-upstream-set-cookie') as string)).toEqual(['only=1'])
  })

  it('omits x-upstream-set-cookie when there are no cookies', () => {
    const result = buildRelayedResponseHeaders(new Headers({ 'Content-Type': 'text/plain' }), CORS)
    expect(result.has('x-upstream-set-cookie')).toBe(false)
    expect(result.get('set-cookie')).toBeNull()
  })
})

describe('buildRelayedResponseHeaders: upstream CORS and Vary copies (criterion 11)', () => {
  it('copies upstream access-control-* and vary to x-upstream-*', () => {
    const result = buildRelayedResponseHeaders(upstreamHeaders(), CORS)
    expect(result.get('x-upstream-access-control-allow-origin')).toBe('*')
    expect(result.get('x-upstream-vary')).toBe('Accept-Encoding')
  })

  it('real CORS headers carry the Worker values, vary is VARY_DEFAULT', () => {
    const result = buildRelayedResponseHeaders(upstreamHeaders(), CORS)
    expect(result.get('access-control-allow-origin')).toBe(ALLOWED_ORIGIN)
    expect(result.get('access-control-allow-methods')).toBe('GET, POST')
    expect(result.get('vary')).toBe(VARY_DEFAULT)
    expect(VARY_DEFAULT).toBe('Origin')
  })

  it('copies a different upstream value verbatim (not hard-coded)', () => {
    const h = new Headers({ 'Access-Control-Allow-Origin': 'https://other.example', Vary: 'Cookie' })
    const result = buildRelayedResponseHeaders(h, CORS)
    expect(result.get('x-upstream-access-control-allow-origin')).toBe('https://other.example')
    expect(result.get('x-upstream-vary')).toBe('Cookie')
  })

  it('does not add x-upstream-vary when upstream has no vary', () => {
    const result = buildRelayedResponseHeaders(new Headers({ 'X-Request-ID': '1' }), CORS)
    expect(result.has('x-upstream-vary')).toBe(false)
    expect(result.get('vary')).toBe(VARY_DEFAULT)
  })
})

describe('buildRelayedResponseHeaders: Access-Control-Expose-Headers (criterion 9)', () => {
  it('lists every header name including the x-upstream-* copies', () => {
    const names = exposed(buildRelayedResponseHeaders(upstreamHeaders(), CORS))
    expect(names).toEqual(expect.arrayContaining([
      'content-type',
      'x-request-id',
      'x-upstream-set-cookie',
      'x-upstream-vary',
      'x-upstream-access-control-allow-origin',
    ]))
  })

  it('never lists set-cookie or access-control-expose-headers', () => {
    const names = exposed(buildRelayedResponseHeaders(upstreamHeaders(), CORS))
    expect(names).not.toContain('set-cookie')
    expect(names).not.toContain('access-control-expose-headers')
  })

  it('has no duplicate names and all are lower-case', () => {
    const names = exposed(buildRelayedResponseHeaders(upstreamHeaders(), CORS))
    expect(new Set(names).size).toBe(names.length)
    names.forEach((n) => expect(n).toBe(n.toLowerCase()))
  })

  it('upstream own Expose-Headers value only appears under x-upstream-access-control-expose-headers', () => {
    const h = new Headers({ 'Access-Control-Expose-Headers': 'x-secret-thing', 'X-Request-ID': '1' })
    const result = buildRelayedResponseHeaders(h, CORS)
    expect(result.get('x-upstream-access-control-expose-headers')).toBe('x-secret-thing')
    expect(result.get('access-control-expose-headers')).not.toBe('x-secret-thing')
    const names = exposed(result)
    expect(names).toContain('x-request-id')
    expect(names).toContain('x-upstream-access-control-expose-headers')
  })

  it('reflects different upstream header sets', () => {
    const a = exposed(buildRelayedResponseHeaders(new Headers({ 'X-One': '1' }), CORS))
    const b = exposed(buildRelayedResponseHeaders(new Headers({ 'X-Two': '2' }), CORS))
    expect(a).toContain('x-one')
    expect(a).not.toContain('x-two')
    expect(b).toContain('x-two')
    expect(b).not.toContain('x-one')
  })
})

describe('buildRelayedResponseHeaders: anti-spoofing and pass-through', () => {
  it('drops upstream-sent reserved relay names that have no real counterpart', () => {
    const h = new Headers({
      'X-Upstream-Set-Cookie': '["evil=1"]',
      'X-Upstream-Vary': 'forged',
      'X-Upstream-Access-Control-Allow-Origin': 'https://forged.example',
    })
    const result = buildRelayedResponseHeaders(h, CORS)
    expect(result.has('x-upstream-set-cookie')).toBe(false)
    expect(result.has('x-upstream-vary')).toBe(false)
    expect(result.has('x-upstream-access-control-allow-origin')).toBe(false)
  })

  it('replaces forged relay values with the Worker copies of the real upstream headers', () => {
    const h = new Headers({
      'X-Upstream-Vary': 'forged',
      Vary: 'Accept-Encoding',
      'X-Upstream-Set-Cookie': '["evil=1"]',
    })
    h.append('Set-Cookie', 'real=1')
    const result = buildRelayedResponseHeaders(h, CORS)
    expect(result.get('x-upstream-vary')).toBe('Accept-Encoding')
    expect(JSON.parse(result.get('x-upstream-set-cookie') as string)).toEqual(['real=1'])
  })

  it('passes other x-upstream names through unchanged', () => {
    const h = new Headers({ 'X-Upstream': 'yes', 'X-Upstream-Latency': '5' })
    const result = buildRelayedResponseHeaders(h, CORS)
    expect(result.get('x-upstream')).toBe('yes')
    expect(result.get('x-upstream-latency')).toBe('5')
  })

  it('does not mutate the input headers', () => {
    const input = upstreamHeaders()
    const before: [string, string][] = []
    input.forEach((v, k) => before.push([k, v]))
    const cookiesBefore = input.getSetCookie()
    buildRelayedResponseHeaders(input, CORS)
    const after: [string, string][] = []
    input.forEach((v, k) => after.push([k, v]))
    expect(after).toEqual(before)
    expect(input.getSetCookie()).toEqual(cookiesBefore)
    expect(input.getSetCookie()).toHaveLength(2)
  })
})

describe('worker.fetch end-to-end relay', () => {
  it('relays cookies, copies and expose list on a proxied response', async () => {
    const { response } = await callWorker(
      new Response('{"ok":true}', { status: 200, headers: upstreamHeaders() }),
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('set-cookie')).toBeNull()
    expect(JSON.parse(response.headers.get('x-upstream-set-cookie') as string)).toEqual([COOKIE_A, COOKIE_B])
    expect(response.headers.get('x-upstream-access-control-allow-origin')).toBe('*')
    expect(response.headers.get('x-upstream-vary')).toBe('Accept-Encoding')
    expect(response.headers.get('access-control-allow-origin')).toBe(ALLOWED_ORIGIN)
    expect(response.headers.get('vary')).toBe(VARY_DEFAULT)
    const names = exposed(response.headers)
    expect(names).toEqual(expect.arrayContaining(['content-type', 'x-request-id', 'x-upstream-set-cookie']))
    expect(names).not.toContain('set-cookie')
    expect(await response.text()).toBe('{"ok":true}')
  })

  it('relays headers on non-2xx upstream responses too', async () => {
    const { response } = await callWorker(
      new Response('nope', { status: 503, headers: { 'X-Trace': 't1' } }),
    )
    expect(response.status).toBe(503)
    expect(exposed(response.headers)).toContain('x-trace')
  })
})

describe('protections still hold (criteria 12 and 13)', () => {
  it('missing Origin -> 403 and no upstream fetch', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
    const response = await worker.fetch(new Request(`${WORKER_BASE}${TARGET_QS}`, { method: 'GET' }), {}, {})
    expect(response.status).toBe(403)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('disallowed Origin -> 403 and no upstream fetch', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
    const response = await worker.fetch(
      new Request(`${WORKER_BASE}${TARGET_QS}`, { method: 'GET', headers: { Origin: DISALLOWED_ORIGIN } }),
      {},
      {},
    )
    expect(response.status).toBe(403)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('missing url -> 400 and no upstream fetch', async () => {
    const { response, mockFetch } = await callWorker(new Response('x'), ALLOWED_ORIGIN, '')
    expect(response.status).toBe(400)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('non-http(s) protocol -> 400 and no upstream fetch', async () => {
    const { response, mockFetch } = await callWorker(
      new Response('x'),
      ALLOWED_ORIGIN,
      `?url=${encodeURIComponent('ftp://files.example.com/a')}`,
    )
    expect(response.status).toBe(400)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('self-target -> 400 and no upstream fetch', async () => {
    const { response, mockFetch } = await callWorker(
      new Response('x'),
      ALLOWED_ORIGIN,
      `?url=${encodeURIComponent('https://proxy.example.com/loop')}`,
    )
    expect(response.status).toBe(400)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('buildForwardHeaders still strips host, origin, referer, cookie and cf-*', () => {
    const incoming = new Headers({
      Host: 'proxy.example.com',
      Origin: ALLOWED_ORIGIN,
      Referer: 'https://andrewratnikov.github.io/x',
      Cookie: 'session=1',
      'CF-Connecting-IP': '1.2.3.4',
      Authorization: 'Bearer t',
      'X-Custom': 'keep',
    })
    const out = buildForwardHeaders(incoming)
    for (const name of ['host', 'origin', 'referer', 'cookie', 'cf-connecting-ip']) {
      expect(out.has(name)).toBe(false)
    }
    expect(out.get('authorization')).toBe('Bearer t')
    expect(out.get('x-custom')).toBe('keep')
  })
})
