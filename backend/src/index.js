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

    const responseHeaders = new Headers(upstreamResponse.headers)
    for (const [key, value] of Object.entries(cors)) {
      responseHeaders.set(key, value)
    }
    responseHeaders.set('Vary', VARY_DEFAULT)

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    })
  },
}
