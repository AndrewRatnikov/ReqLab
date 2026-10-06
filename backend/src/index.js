export const ALLOWED_ORIGINS = [
  'https://andrewratnikov.github.io',
  'http://localhost:3000',
  'http://localhost:5173',
]

const ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
const ALLOWED_HEADERS = 'Content-Type, Authorization'

export const ALLOWED_PROTOCOLS = ['http:', 'https:']
export const STRIPPED_REQUEST_HEADERS = ['host', 'origin', 'referer', 'cookie']
export const STRIPPED_HEADER_PREFIX = 'cf-'
export const VARY_DEFAULT = 'Origin'
export const VARY_PREFLIGHT = 'Origin, Access-Control-Request-Headers'
export const UPSTREAM_HEADER_PREFIX = 'X-Upstream-'
export const UPSTREAM_SET_COOKIE_HEADER = 'X-Upstream-Set-Cookie'

const RESERVED_SET_COOKIE = UPSTREAM_SET_COOKIE_HEADER.toLowerCase()
const RESERVED_VARY = `${UPSTREAM_HEADER_PREFIX}Vary`.toLowerCase()
const RESERVED_ACCESS_CONTROL_PREFIX = `${UPSTREAM_HEADER_PREFIX}Access-Control-`.toLowerCase()

export function isAllowedOrigin(origin) {
  return typeof origin === 'string' && ALLOWED_ORIGINS.includes(origin)
}

export function corsHeadersFor(origin, requestedHeaders) {
  if (!isAllowedOrigin(origin)) {
    return {}
  }
  const allowHeaders =
    typeof requestedHeaders === 'string' && requestedHeaders.length > 0
      ? requestedHeaders
      : ALLOWED_HEADERS
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': ALLOWED_METHODS,
    'Access-Control-Allow-Headers': allowHeaders,
  }
}

export function extractTargetUrl(request) {
  const requestUrl = new URL(request.url)
  const target = requestUrl.searchParams.get('url')
  if (!target) {
    return null
  }
  try {
    return new URL(target)
  } catch {
    return null
  }
}

export function isAllowedProtocol(targetUrl) {
  let parsed
  try {
    parsed = new URL(targetUrl)
  } catch {
    return false
  }
  return ALLOWED_PROTOCOLS.includes(parsed.protocol)
}

export function isSelfTarget(targetUrl, requestUrl) {
  let target
  let self
  try {
    target = new URL(targetUrl)
    self = new URL(requestUrl)
  } catch {
    return false
  }
  return target.hostname.toLowerCase() === self.hostname.toLowerCase()
}

export function buildForwardHeaders(request) {
  const headers = new Headers(request.headers)
  for (const name of STRIPPED_REQUEST_HEADERS) {
    headers.delete(name)
  }
  // Materialize the key list first: deleting while iterating a live
  // Headers iterator would skip entries.
  for (const name of [...headers.keys()]) {
    if (name.toLowerCase().startsWith(STRIPPED_HEADER_PREFIX)) {
      headers.delete(name)
    }
  }
  return headers
}

/*
 * Response header relay. This is a security trade-off, accepted by the user
 * on 2026-10-06: the browser never
 * lets page JavaScript read a Set-Cookie response header. To show upstream
 * cookies in ReqLab's response panel, this Worker drops the real Set-Cookie
 * and re-emits every upstream cookie as a JSON array in X-Upstream-Set-Cookie,
 * which IS exposed to the page. That makes upstream session cookies readable
 * by JavaScript on the allow-listed origins. It also means no upstream cookie
 * is ever stored by the browser for the proxy's domain.
 *
 * The upstream's own Access-Control-* and Vary values are copied to
 * X-Upstream-* names before the Worker applies its own CORS headers, and
 * every resulting header name is listed in Access-Control-Expose-Headers so
 * the page can read the full upstream header set.
 */
function isReservedRelayName(lowerName) {
  return (
    lowerName === RESERVED_SET_COOKIE ||
    lowerName === RESERVED_VARY ||
    lowerName.startsWith(RESERVED_ACCESS_CONTROL_PREFIX)
  )
}

function isUpstreamCorsOrVary(lowerName) {
  return lowerName.startsWith('access-control-') || lowerName === 'vary'
}

export function buildRelayedResponseHeaders(upstreamHeaders, cors) {
  const headers = new Headers(upstreamHeaders)

  let cookies
  if (typeof upstreamHeaders.getSetCookie === 'function') {
    cookies = upstreamHeaders.getSetCookie()
  } else {
    const single = upstreamHeaders.get('set-cookie')
    cookies = single ? [single] : []
  }
  headers.delete('set-cookie')

  // Anti-spoof: an upstream must not be able to forge the relay names the UI
  // re-labels as "the upstream's" values. Materialize keys before deleting.
  for (const name of [...headers.keys()]) {
    if (isReservedRelayName(name.toLowerCase())) {
      headers.delete(name)
    }
  }

  upstreamHeaders.forEach((value, name) => {
    if (isUpstreamCorsOrVary(name.toLowerCase())) {
      headers.set(UPSTREAM_HEADER_PREFIX + name, value)
    }
  })

  if (cookies.length > 0) {
    headers.set(UPSTREAM_SET_COOKIE_HEADER, JSON.stringify(cookies))
  }

  for (const [key, value] of Object.entries(cors)) {
    headers.set(key, value)
  }
  headers.set('Vary', VARY_DEFAULT)

  headers.delete('Access-Control-Expose-Headers')
  const exposed = []
  for (const name of headers.keys()) {
    const lower = name.toLowerCase()
    if (lower === 'set-cookie' || lower === 'access-control-expose-headers') continue
    if (!exposed.includes(lower)) exposed.push(lower)
  }
  if (exposed.length > 0) {
    headers.set('Access-Control-Expose-Headers', exposed.join(', '))
  }

  return headers
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin')

    if (request.method === 'OPTIONS') {
      const requestedHeaders = request.headers.get('Access-Control-Request-Headers')
      const preflightCors = corsHeadersFor(origin, requestedHeaders)
      return new Response(null, {
        status: 204,
        headers: { ...preflightCors, Vary: VARY_PREFLIGHT },
      })
    }

    if (!isAllowedOrigin(origin)) {
      return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', Vary: VARY_DEFAULT },
      })
    }

    const cors = corsHeadersFor(origin)
    const errorHeaders = {
      'Content-Type': 'application/json',
      Vary: VARY_DEFAULT,
      ...cors,
    }

    const targetUrl = extractTargetUrl(request)
    if (!targetUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid "url" query parameter' }),
        { status: 400, headers: errorHeaders },
      )
    }

    if (!isAllowedProtocol(targetUrl)) {
      return new Response(
        JSON.stringify({ error: 'Target URL protocol must be http or https' }),
        { status: 400, headers: errorHeaders },
      )
    }

    if (isSelfTarget(targetUrl, request.url)) {
      return new Response(
        JSON.stringify({ error: 'Target URL must not point at the proxy itself' }),
        { status: 400, headers: errorHeaders },
      )
    }

    const method = request.method
    const forwardHeaders = buildForwardHeaders(request)
    const body = method === 'GET' || method === 'HEAD' ? undefined : request.body

    const upstreamResponse = await fetch(targetUrl.toString(), {
      method,
      headers: forwardHeaders,
      body,
    })

    const responseHeaders = buildRelayedResponseHeaders(upstreamResponse.headers, cors)

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    })
  },
}
