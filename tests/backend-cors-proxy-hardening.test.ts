/**
 * Tests for: CORS Proxy Worker hardening (backend/src/index.js)
 * Contract source: runs/run_20260929_212417/plan.md § Interface Contract
 * Covers PRD acceptance criteria: #1-#11 (open-relay gate, preflight header
 * reflection, Vary headers, target-URL guards, forwarded-header stripping).
 *
 * CONTRACT_GAPS: none. Every export, constant and header value asserted
 * below appears verbatim in plan.md's Interface Contract.
 *
 * Mocking note (per memory.md's known check-contract false positive): the
 * Worker's outbound use of the global `fetch` is intercepted with
 * `vi.stubGlobal('fetch', ...)` in each test that needs it, restored via
 * `vi.unstubAllGlobals()` in afterEach below. That's the correct Vitest
 * approach for a runtime global — `vi.mock(...)` targets module imports, and
 * this Worker has zero npm imports per the contract ("Dependencies: none").
 * No real network call is ever made; every `fetch` invocation in this file
 * is either the mocked global or a call to the Worker's own `.fetch(...)`
 * entrypoint under test. No filesystem access is used in this file.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import worker, {
  corsHeadersFor,
  isAllowedProtocol,
  isSelfTarget,
  buildForwardHeaders,
  STRIPPED_REQUEST_HEADERS,
  VARY_DEFAULT,
  VARY_PREFLIGHT,
} from '../backend/src/index.js'

const ALLOWED_ORIGIN = 'https://andrewratnikov.github.io'
const DISALLOWED_ORIGIN = 'https://evil.example.com'
const WORKER_BASE = 'https://proxy.example.com/'
const TARGET = 'https://api.example.com/data'
const TARGET_QS = `?url=${encodeURIComponent(TARGET)}`
const SELF_TARGET = 'https://proxy.example.com/loop'

// Literal values pinned by the Interface Contract (unchanged from before this
// task), reused so assertions can be exact rather than merely truthy.
const ALLOWED_METHODS_VALUE = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
const ALLOWED_HEADERS_FALLBACK = 'Content-Type, Authorization'

function normalizeForwardedCall(args: unknown[]): {
  url: string
  method: string
  headers: Headers
} {
  const [first, second] = args as [Request | string | URL, RequestInit | undefined]
  if (first instanceof Request) {
    return { url: first.url, method: first.method, headers: first.headers }
  }
  return {
    url: first.toString(),
    method: (second?.method as string) ?? 'GET',
    headers: new Headers(second?.headers ?? {}),
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('criterion 1: no Origin header on a non-OPTIONS request -> 403, no upstream fetch', () => {
  it('returns 403 with the exact JSON error body and Content-Type, and never calls fetch', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    const request = new Request(`${WORKER_BASE}${TARGET_QS}`, { method: 'GET' })
    const response = await worker.fetch(request, {}, {})

    expect(response.status).toBe(403)
    expect(response.headers.get('Content-Type')).toBe('application/json')
    const body = await response.json()
    expect(body).toEqual({ error: 'Origin not allowed' })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('carries no Access-Control-* headers', async () => {
    vi.stubGlobal('fetch', vi.fn())

    const request = new Request(`${WORKER_BASE}${TARGET_QS}`, { method: 'POST' })
    const response = await worker.fetch(request, {}, {})

    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
    expect(response.headers.get('Access-Control-Allow-Methods')).toBeNull()
    expect(response.headers.get('Access-Control-Allow-Headers')).toBeNull()
  })
})

describe('criterion 2: disallowed Origin on a non-OPTIONS request -> same 403, no upstream fetch', () => {
  it('returns 403 with the exact JSON error body and never calls fetch', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    const request = new Request(`${WORKER_BASE}${TARGET_QS}`, {
      method: 'GET',
      headers: { Origin: DISALLOWED_ORIGIN },
    })
    const response = await worker.fetch(request, {}, {})

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body).toEqual({ error: 'Origin not allowed' })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('HEAD is a non-OPTIONS method and is subject to the same gate', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    const request = new Request(`${WORKER_BASE}${TARGET_QS}`, {
      method: 'HEAD',
      headers: { Origin: DISALLOWED_ORIGIN },
    })
    const response = await worker.fetch(request, {}, {})

    expect(response.status).toBe(403)
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe('criterion 3: allowed-Origin non-OPTIONS requests still forward upstream', () => {
  it('calls fetch with the target URL and method, and relays the upstream status + CORS headers', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', mockFetch)

    const request = new Request(`${WORKER_BASE}${TARGET_QS}`, {
      method: 'GET',
      headers: { Origin: ALLOWED_ORIGIN },
    })
    const response = await worker.fetch(request, {}, {})

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const forwarded = normalizeForwardedCall(mockFetch.mock.calls[0])
    expect(forwarded.url).toBe(TARGET)
    expect(forwarded.method).toBe('GET')

    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ALLOWED_ORIGIN)
    expect(await response.json()).toEqual({ ok: true })
  })
})

describe('criterion 4: preflight reflects Access-Control-Request-Headers verbatim', () => {
  it('reflects a multi-value requested-headers string exactly, with no normalization', async () => {
    vi.stubGlobal('fetch', vi.fn())

    const request = new Request(`${WORKER_BASE}${TARGET_QS}`, {
      method: 'OPTIONS',
      headers: {
        Origin: ALLOWED_ORIGIN,
        'Access-Control-Request-Headers': 'X-Api-Key, X-Custom',
      },
    })
    const response = await worker.fetch(request, {}, {})

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ALLOWED_ORIGIN)
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe(ALLOWED_METHODS_VALUE)
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('X-Api-Key, X-Custom')
  })

  it('reflects a different requested-headers value differently (falsifies a hard-coded return)', async () => {
    vi.stubGlobal('fetch', vi.fn())

    const request = new Request(`${WORKER_BASE}${TARGET_QS}`, {
      method: 'OPTIONS',
      headers: {
        Origin: ALLOWED_ORIGIN,
        'Access-Control-Request-Headers': 'X-Api-Key',
      },
    })
    const response = await worker.fetch(request, {}, {})

    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('X-Api-Key')
  })
})

describe('criterion 5: preflight without Access-Control-Request-Headers falls back to the fixed list', () => {
  it('omitted header -> falls back to "Content-Type, Authorization"', async () => {
    vi.stubGlobal('fetch', vi.fn())

    const request = new Request(`${WORKER_BASE}${TARGET_QS}`, {
      method: 'OPTIONS',
      headers: { Origin: ALLOWED_ORIGIN },
    })
    const response = await worker.fetch(request, {}, {})

    expect(response.headers.get('Access-Control-Allow-Headers')).toBe(ALLOWED_HEADERS_FALLBACK)
  })

  it('empty-string header value also falls back (non-empty-string check, not truthiness)', async () => {
    vi.stubGlobal('fetch', vi.fn())

    const request = new Request(`${WORKER_BASE}${TARGET_QS}`, {
      method: 'OPTIONS',
      headers: {
        Origin: ALLOWED_ORIGIN,
        'Access-Control-Request-Headers': '',
      },
    })
    const response = await worker.fetch(request, {}, {})

    expect(response.headers.get('Access-Control-Allow-Headers')).toBe(ALLOWED_HEADERS_FALLBACK)
  })

  it('corsHeadersFor(origin) with the second argument omitted returns the fixed list directly', () => {
    const headers = corsHeadersFor(ALLOWED_ORIGIN)
    expect(headers['Access-Control-Allow-Headers']).toBe(ALLOWED_HEADERS_FALLBACK)
  })
})

describe('criterion 6: preflight from a missing/disallowed origin is still 204 with no CORS headers and no 403', () => {
  it('missing Origin on OPTIONS -> 204, no Access-Control-* headers, not a 403', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    const request = new Request(`${WORKER_BASE}${TARGET_QS}`, { method: 'OPTIONS' })
    const response = await worker.fetch(request, {}, {})

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('disallowed Origin on OPTIONS -> 204, no Access-Control-* headers, not a 403', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    const request = new Request(`${WORKER_BASE}${TARGET_QS}`, {
      method: 'OPTIONS',
      headers: {
        Origin: DISALLOWED_ORIGIN,
        'Access-Control-Request-Headers': 'X-Api-Key',
      },
    })
    const response = await worker.fetch(request, {}, {})

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
    expect(response.headers.get('Access-Control-Allow-Headers')).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe('criterion 7: Vary: Origin appears on every response the worker returns', () => {
  it('is set on the 403 (missing Origin)', async () => {
    vi.stubGlobal('fetch', vi.fn())
    const request = new Request(`${WORKER_BASE}${TARGET_QS}`, { method: 'GET' })
    const response = await worker.fetch(request, {}, {})
    expect(response.headers.get('Vary')).toBe(VARY_DEFAULT)
  })

  it('is set on the 400 (missing ?url=)', async () => {
    vi.stubGlobal('fetch', vi.fn())
    const request = new Request(WORKER_BASE, {
      method: 'GET',
      headers: { Origin: ALLOWED_ORIGIN },
    })
    const response = await worker.fetch(request, {}, {})
    expect(response.status).toBe(400)
    expect(response.headers.get('Vary')).toBe(VARY_DEFAULT)
  })

  it('is set on the 400 (disallowed protocol)', async () => {
    vi.stubGlobal('fetch', vi.fn())
    const request = new Request(
      `${WORKER_BASE}?url=${encodeURIComponent('ftp://x.com/a')}`,
      { method: 'GET', headers: { Origin: ALLOWED_ORIGIN } },
    )
    const response = await worker.fetch(request, {}, {})
    expect(response.status).toBe(400)
    expect(response.headers.get('Vary')).toBe(VARY_DEFAULT)
  })

  it('is set on the 400 (self-target)', async () => {
    vi.stubGlobal('fetch', vi.fn())
    const request = new Request(
      `${SELF_TARGET}?url=${encodeURIComponent(SELF_TARGET)}`,
      { method: 'GET', headers: { Origin: ALLOWED_ORIGIN } },
    )
    const response = await worker.fetch(request, {}, {})
    expect(response.status).toBe(400)
    expect(response.headers.get('Vary')).toBe(VARY_DEFAULT)
  })

  it('is set (overwritten, not appended) on a relayed upstream response, even when upstream sent its own Vary', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response('{}', {
        status: 200,
        headers: { 'Content-Type': 'application/json', Vary: 'Accept-Encoding' },
      }),
    )
    vi.stubGlobal('fetch', mockFetch)

    const request = new Request(`${WORKER_BASE}${TARGET_QS}`, {
      method: 'GET',
      headers: { Origin: ALLOWED_ORIGIN },
    })
    const response = await worker.fetch(request, {}, {})

    expect(response.headers.get('Vary')).toBe(VARY_DEFAULT)
    expect(response.headers.get('Vary')).not.toContain('Accept-Encoding')
  })

  it('is set on the OPTIONS 204 too (as the VARY_PREFLIGHT value, which starts with Origin)', async () => {
    vi.stubGlobal('fetch', vi.fn())
    const request = new Request(`${WORKER_BASE}${TARGET_QS}`, {
      method: 'OPTIONS',
      headers: { Origin: ALLOWED_ORIGIN },
    })
    const response = await worker.fetch(request, {}, {})
    expect(response.headers.get('Vary')).toBe(VARY_PREFLIGHT)
    expect(response.headers.get('Vary')?.startsWith('Origin')).toBe(true)
  })
})

describe('criterion 8: preflight Vary additionally lists Access-Control-Request-Headers', () => {
  it('VARY_PREFLIGHT constant is exactly "Origin, Access-Control-Request-Headers"', () => {
    expect(VARY_PREFLIGHT).toBe('Origin, Access-Control-Request-Headers')
  })

  it('an allowed-origin OPTIONS response carries exactly that Vary value', async () => {
    vi.stubGlobal('fetch', vi.fn())
    const request = new Request(`${WORKER_BASE}${TARGET_QS}`, {
      method: 'OPTIONS',
      headers: { Origin: ALLOWED_ORIGIN, 'Access-Control-Request-Headers': 'X-Api-Key' },
    })
    const response = await worker.fetch(request, {}, {})
    expect(response.headers.get('Vary')).toBe('Origin, Access-Control-Request-Headers')
  })

  it('a disallowed-origin OPTIONS response still carries that Vary value (per criterion 6)', async () => {
    vi.stubGlobal('fetch', vi.fn())
    const request = new Request(`${WORKER_BASE}${TARGET_QS}`, {
      method: 'OPTIONS',
      headers: { Origin: DISALLOWED_ORIGIN },
    })
    const response = await worker.fetch(request, {}, {})
    expect(response.headers.get('Vary')).toBe('Origin, Access-Control-Request-Headers')
  })
})

describe('criterion 9: non-http(s) target protocol -> 400, no upstream fetch', () => {
  it.each([
    ['file:///etc/passwd', 'file:'],
    ['ftp://x.com/a', 'ftp:'],
    ['data:text/plain,hi', 'data:'],
  ])('rejects a %s target (%s protocol)', async (targetUrl) => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    const request = new Request(`${WORKER_BASE}?url=${encodeURIComponent(targetUrl)}`, {
      method: 'GET',
      headers: { Origin: ALLOWED_ORIGIN },
    })
    const response = await worker.fetch(request, {}, {})

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(typeof body.error).toBe('string')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('isAllowedProtocol is true for http: and https:, false for non-http(s) schemes (falsifiable both ways)', () => {
    expect(isAllowedProtocol('https://api.example.com/data')).toBe(true)
    expect(isAllowedProtocol('http://api.example.com/data')).toBe(true)
    expect(isAllowedProtocol('ftp://x.com/a')).toBe(false)
    expect(isAllowedProtocol('file:///etc/passwd')).toBe(false)
    expect(isAllowedProtocol('data:text/plain,hi')).toBe(false)
  })
})

describe('criterion 10: self-host target -> 400, no upstream fetch', () => {
  it('a target whose hostname equals the request hostname is rejected', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    const request = new Request(
      `${SELF_TARGET}?url=${encodeURIComponent('https://proxy.example.com/anything')}`,
      { method: 'GET', headers: { Origin: ALLOWED_ORIGIN } },
    )
    const response = await worker.fetch(request, {}, {})

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(typeof body.error).toBe('string')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('a target with a different hostname is not rejected as self (forwards upstream)', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', mockFetch)

    const request = new Request(`${WORKER_BASE}${TARGET_QS}`, {
      method: 'GET',
      headers: { Origin: ALLOWED_ORIGIN },
    })
    const response = await worker.fetch(request, {}, {})

    expect(response.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('isSelfTarget is case-insensitive on hostname and ignores port (two differing cases both true, one differing host false)', () => {
    expect(isSelfTarget('https://proxy.example.com/loop', 'https://proxy.example.com/other')).toBe(
      true,
    )
    expect(
      isSelfTarget('HTTPS://PROXY.EXAMPLE.COM/loop', 'https://proxy.example.com/other'),
    ).toBe(true)
    expect(
      isSelfTarget('https://proxy.example.com:8443/loop', 'https://proxy.example.com/other'),
    ).toBe(true)
    expect(isSelfTarget('https://api.example.com/data', 'https://proxy.example.com/other')).toBe(
      false,
    )
  })
})

describe('criterion 11: forwarded headers strip Origin/Referer/Cookie/Host/cf-* and pass everything else through', () => {
  it('STRIPPED_REQUEST_HEADERS is exactly the contract-specified list', () => {
    expect(STRIPPED_REQUEST_HEADERS).toEqual(['host', 'origin', 'referer', 'cookie'])
  })

  it('buildForwardHeaders removes the stripped names and all cf-* names, case-insensitively, and keeps others', () => {
    const request = new Request(`${WORKER_BASE}${TARGET_QS}`, {
      method: 'GET',
      headers: {
        Origin: ALLOWED_ORIGIN,
        Referer: 'https://andrewratnikov.github.io/app',
        Cookie: 'session=abc123',
        Host: 'proxy.example.com',
        'CF-Connecting-IP': '203.0.113.1',
        'cf-ray': 'abc123-SJC',
        'X-Api-Key': 'super-secret-key',
        'Content-Type': 'application/json',
      },
    })

    const forwarded = buildForwardHeaders(request)

    expect(forwarded.has('origin')).toBe(false)
    expect(forwarded.has('referer')).toBe(false)
    expect(forwarded.has('cookie')).toBe(false)
    expect(forwarded.has('host')).toBe(false)
    expect(forwarded.has('cf-connecting-ip')).toBe(false)
    expect(forwarded.has('cf-ray')).toBe(false)
    expect(forwarded.get('x-api-key')).toBe('super-secret-key')
    expect(forwarded.get('content-type')).toBe('application/json')
  })

  it('the stripping is applied end-to-end: the mocked upstream fetch call never sees the stripped headers but does see X-Api-Key', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', mockFetch)

    const request = new Request(`${WORKER_BASE}${TARGET_QS}`, {
      method: 'POST',
      headers: {
        Origin: ALLOWED_ORIGIN,
        Referer: 'https://andrewratnikov.github.io/app',
        Cookie: 'session=abc123',
        Host: 'proxy.example.com',
        'CF-Connecting-IP': '203.0.113.1',
        'X-Api-Key': 'super-secret-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ foo: 'bar' }),
    })
    await worker.fetch(request, {}, {})

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const forwarded = normalizeForwardedCall(mockFetch.mock.calls[0])
    expect(forwarded.headers.has('origin')).toBe(false)
    expect(forwarded.headers.has('referer')).toBe(false)
    expect(forwarded.headers.has('cookie')).toBe(false)
    expect(forwarded.headers.has('host')).toBe(false)
    expect(forwarded.headers.has('cf-connecting-ip')).toBe(false)
    expect(forwarded.headers.get('x-api-key')).toBe('super-secret-key')
  })
})

describe('changed export: corsHeadersFor(origin, requestedHeaders) stays backward compatible', () => {
  it('disallowed/missing origin -> {} regardless of the second argument', () => {
    expect(corsHeadersFor(DISALLOWED_ORIGIN, 'X-Api-Key')).toEqual({})
    expect(corsHeadersFor(null, 'X-Api-Key')).toEqual({})
    expect(corsHeadersFor(undefined)).toEqual({})
  })

  it('allowed origin with a non-empty requestedHeaders returns it verbatim, unnormalized', () => {
    const headers = corsHeadersFor(ALLOWED_ORIGIN, 'x-api-key,   X-Custom')
    expect(headers['Access-Control-Allow-Headers']).toBe('x-api-key,   X-Custom')
    expect(headers['Access-Control-Allow-Origin']).toBe(ALLOWED_ORIGIN)
    expect(headers['Access-Control-Allow-Methods']).toBe(ALLOWED_METHODS_VALUE)
  })
})
