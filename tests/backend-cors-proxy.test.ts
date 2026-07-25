/**
 * Tests for: CORS Proxy Worker (backend/src/index.js)
 * Contract source: runs/run_20260717_221635/plan.md § Interface Contract
 * Covers criteria: #1, #2, #3, #4, #5, #6, #7, #8, #9, #10 (from prd.md)
 *
 * CONTRACT_GAP: the Interface Contract describes forwarding in prose
 * ("forward request.method, headers except Host, and body to the target
 * URL via global fetch") but does not pin whether the Coder calls
 * `fetch(url, init)` or `fetch(new Request(url, init))`. The tests below
 * normalize both call shapes via `normalizeForwardedCall` so either
 * implementation choice satisfies criterion #5 — this is not guessed
 * behavior, it's tolerance for an implementation detail the contract
 * intentionally left open (see plan.md § Risks).
 *
 * Mocking note (retry 1/2 — mechanical contract gate feedback): the Worker's
 * outbound use of the global `fetch` is intercepted with
 * `vi.stubGlobal('fetch', ...)` in each test that needs it, restored via
 * `vi.unstubAllGlobals()` in afterEach below. That's the correct Vitest
 * approach for a runtime global — `vi.mock(...)` targets module imports, and
 * this Worker has zero npm imports per the contract ("Dependencies: none").
 * No real network call is ever made; every `fetch` invocation in this file
 * is either the mocked global or a call to the Worker's own `.fetch(...)`
 * entrypoint under test.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import worker, {
  ALLOWED_ORIGINS,
  isAllowedOrigin,
  corsHeadersFor,
  extractTargetUrl,
} from '../backend/src/index.js'

const ROOT = resolve(__dirname, '..')
const ALLOWED_ORIGIN = 'https://andrewratnikov.github.io'
const LOCALHOST_3000 = 'http://localhost:3000'
const LOCALHOST_5173 = 'http://localhost:5173'
const DISALLOWED_ORIGIN = 'https://evil.example.com'
const TARGET = 'https://api.example.com/data'

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

describe('criterion 1: standalone npm package with wrangler devDependency', () => {
  it('backend/package.json declares wrangler as a devDependency', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'backend/package.json'), 'utf-8'))
    expect(pkg.devDependencies).toHaveProperty('wrangler')
  })

  it('is not registered as a pnpm workspace member (stays standalone)', () => {
    const workspace = readFileSync(resolve(ROOT, 'pnpm-workspace.yaml'), 'utf-8')
    expect(workspace).not.toMatch(/backend/)
  })
})

describe('criterion 2: extractTargetUrl reads the ?url= query parameter', () => {
  it('returns a URL matching the ?url= value when present and valid', () => {
    const request = new Request(`https://proxy.example.com/?url=${encodeURIComponent(TARGET)}`)
    const result = extractTargetUrl(request)
    expect(result).toBeInstanceOf(URL)
    expect((result as URL).toString()).toBe(TARGET)
  })
})

describe('criterion 3: missing or invalid ?url= yields 400 with CORS applied', () => {
  it('extractTargetUrl returns null when the url param is absent', () => {
    const request = new Request('https://proxy.example.com/')
    expect(extractTargetUrl(request)).toBeNull()
  })

  it('extractTargetUrl returns null when the url param is not a valid absolute URL', () => {
    const request = new Request('https://proxy.example.com/?url=not-a-valid-url')
    expect(extractTargetUrl(request)).toBeNull()
  })

  it('fetch() returns 400 with CORS headers when ?url= is missing', async () => {
    const request = new Request('https://proxy.example.com/', {
      headers: { Origin: ALLOWED_ORIGIN },
    })
    const response = await worker.fetch(request, {}, {})
    expect(response.status).toBe(400)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ALLOWED_ORIGIN)
    const body = await response.json()
    expect(typeof body.error).toBe('string')
  })

  it('fetch() returns 400 with CORS headers when ?url= is invalid', async () => {
    const request = new Request('https://proxy.example.com/?url=not-a-valid-url', {
      headers: { Origin: ALLOWED_ORIGIN },
    })
    const response = await worker.fetch(request, {}, {})
    expect(response.status).toBe(400)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ALLOWED_ORIGIN)
  })
})

describe('criterion 4: OPTIONS preflight short-circuits before any upstream fetch', () => {
  it('returns 204 with CORS headers for an allowed origin, without calling fetch', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    const request = new Request(`https://proxy.example.com/?url=${encodeURIComponent(TARGET)}`, {
      method: 'OPTIONS',
      headers: { Origin: ALLOWED_ORIGIN },
    })
    const response = await worker.fetch(request, {}, {})

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ALLOWED_ORIGIN)
    expect(response.headers.get('Access-Control-Allow-Methods')).toBeTruthy()
    expect(response.headers.get('Access-Control-Allow-Headers')).toBeTruthy()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns 204 without Access-Control-Allow-Origin for a disallowed origin', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    const request = new Request('https://proxy.example.com/', {
      method: 'OPTIONS',
      headers: { Origin: DISALLOWED_ORIGIN },
    })
    const response = await worker.fetch(request, {}, {})

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe('criterion 5: non-OPTIONS requests are forwarded and the response relayed', () => {
  it('forwards method, headers (minus Host), and body; relays upstream response + CORS', async () => {
    const upstreamBody = JSON.stringify({ ok: true })
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(upstreamBody, {
        status: 201,
        headers: { 'Content-Type': 'application/json', 'X-Upstream': 'yes' },
      }),
    )
    vi.stubGlobal('fetch', mockFetch)

    const request = new Request(`https://proxy.example.com/?url=${encodeURIComponent(TARGET)}`, {
      method: 'POST',
      headers: {
        Origin: ALLOWED_ORIGIN,
        Host: 'proxy.example.com',
        'X-Custom': 'value',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ foo: 'bar' }),
    })
    const response = await worker.fetch(request, {}, {})

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const forwarded = normalizeForwardedCall(mockFetch.mock.calls[0])
    expect(forwarded.url).toBe(TARGET)
    expect(forwarded.method).toBe('POST')
    expect(forwarded.headers.has('host')).toBe(false)
    expect(forwarded.headers.get('x-custom')).toBe('value')

    expect(response.status).toBe(201)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ALLOWED_ORIGIN)
    expect(response.headers.get('X-Upstream')).toBe('yes')
    expect(await response.json()).toEqual({ ok: true })
  })

  it('omits the body when forwarding a GET request', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', mockFetch)

    const request = new Request(`https://proxy.example.com/?url=${encodeURIComponent(TARGET)}`, {
      method: 'GET',
      headers: { Origin: ALLOWED_ORIGIN },
    })
    await worker.fetch(request, {}, {})

    const [first, second] = mockFetch.mock.calls[0] as [Request | string, RequestInit | undefined]
    const body = first instanceof Request ? first.body : second?.body
    expect(body == null).toBe(true)
  })
})

describe('criterion 6: Access-Control-Allow-Origin allowlist is exactly 3 origins', () => {
  it('ALLOWED_ORIGINS contains exactly the 3 specified origins', () => {
    expect(ALLOWED_ORIGINS).toEqual([ALLOWED_ORIGIN, LOCALHOST_3000, LOCALHOST_5173])
  })

  it.each([ALLOWED_ORIGIN, LOCALHOST_3000, LOCALHOST_5173])(
    'isAllowedOrigin(%s) is true and corsHeadersFor sets Access-Control-Allow-Origin',
    (origin) => {
      expect(isAllowedOrigin(origin)).toBe(true)
      const headers = corsHeadersFor(origin)
      expect(headers['Access-Control-Allow-Origin']).toBe(origin)
    },
  )

  it('isAllowedOrigin is false and corsHeadersFor has no CORS headers for a disallowed origin', () => {
    expect(isAllowedOrigin(DISALLOWED_ORIGIN)).toBe(false)
    expect(corsHeadersFor(DISALLOWED_ORIGIN)).toEqual({})
  })

  it('isAllowedOrigin is false for a null/undefined origin', () => {
    expect(isAllowedOrigin(null)).toBe(false)
    expect(isAllowedOrigin(undefined)).toBe(false)
  })
})

describe('criterion 7: backend/wrangler.json points to src/index.js', () => {
  it('has main set to src/index.js', () => {
    const config = JSON.parse(readFileSync(resolve(ROOT, 'backend/wrangler.json'), 'utf-8'))
    expect(config.main).toBe('src/index.js')
  })
})

describe('criterion 8: backend/package.json has dev and deploy scripts', () => {
  it('scripts.dev and scripts.deploy are defined', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'backend/package.json'), 'utf-8'))
    expect(pkg.scripts).toMatchObject({
      dev: expect.any(String),
      deploy: expect.any(String),
    })
  })
})

describe('criterion 9: GitHub Actions workflow deploys via wrangler-action@v3', () => {
  it('deploy-proxy.yml exists and is wired up correctly', () => {
    const path = resolve(ROOT, '.github/workflows/deploy-proxy.yml')
    expect(existsSync(path)).toBe(true)
    const workflow = readFileSync(path, 'utf-8')
    expect(workflow).toMatch(/cloudflare\/wrangler-action@v3/)
    expect(workflow).toMatch(/workingDirectory:\s*backend/)
    expect(workflow).toMatch(/secrets\.CLOUDFLARE_API_TOKEN/)
    expect(workflow).toMatch(/branches:\s*'?main'?/)
  })
})

describe('criterion 10: root test command is unaffected by the new backend package', () => {
  it('backend is excluded from the pnpm workspace member globs', () => {
    const workspace = readFileSync(resolve(ROOT, 'pnpm-workspace.yaml'), 'utf-8')
    expect(workspace).not.toMatch(/backend\/\*/)
    expect(workspace).not.toMatch(/^\s*-\s*['"]?backend['"]?\s*$/m)
  })
})
