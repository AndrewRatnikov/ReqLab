export const ALLOWED_ORIGINS = [
  'https://andrewratnikov.github.io',
  'http://localhost:3000',
  'http://localhost:5173',
]

const ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
const ALLOWED_HEADERS = 'Content-Type, Authorization'
const HOP_BY_HOP_REQUEST_HEADERS = ['host']

export function isAllowedOrigin(origin) {
  return typeof origin === 'string' && ALLOWED_ORIGINS.includes(origin)
}

export function corsHeadersFor(origin) {
  if (!isAllowedOrigin(origin)) {
    return {}
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': ALLOWED_METHODS,
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
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

function buildForwardHeaders(request) {
  const headers = new Headers(request.headers)
  for (const name of HOP_BY_HOP_REQUEST_HEADERS) {
    headers.delete(name)
  }
  return headers
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin')
    const cors = corsHeadersFor(origin)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    const targetUrl = extractTargetUrl(request)
    if (!targetUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid "url" query parameter' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...cors },
        },
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

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    })
  },
}
