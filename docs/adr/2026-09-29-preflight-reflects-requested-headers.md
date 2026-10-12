# The preflight response reflects the requested headers, and `Vary` is always set

- **Status:** Accepted
- **Date:** 2026-09-29
- **Source:** orchestrator run `run_20260929_212417`
- **Code:** `backend/src/index.js` (`corsHeadersFor(origin, requestedHeaders)`, `VARY_DEFAULT`, `VARY_PREFLIGHT`)

## Context

The preflight always answered `Access-Control-Allow-Headers: Content-Type, Authorization`. Any custom header a user added in the Headers tab (for example `X-Api-Key`) made the browser block the real request, which defeated the point of the proxy. Responses also carried no `Vary`, so a cache could serve one origin's response to another.

## Decision

- For an allowed origin, `corsHeadersFor` takes an optional second argument. When the preflight carries a non-empty `Access-Control-Request-Headers`, its value is echoed verbatim as `Access-Control-Allow-Headers`. Otherwise it falls back to `Content-Type, Authorization`. A disallowed origin still gets `{}`.
- Every response carries `Vary: Origin`: relayed responses, the 400s and the 403. Preflight responses carry `Vary: Origin, Access-Control-Request-Headers`.
- `Vary` is **set (overwritten), not appended**, including on relayed upstream responses.

## Alternatives considered

- **Append to the upstream's `Vary`.** Rejected for now. It makes the value order-dependent and harder to assert, and no real caching problem has been seen. The cost is that an upstream `Vary: Accept-Encoding` is lost on the proxied response.

## Consequences

- Custom request headers work through the proxy.
- Reflecting requested headers is safe only because the origin gate ([2026-09-29-proxy-rejects-disallowed-origins](2026-09-29-proxy-rejects-disallowed-origins.md)) limits who can use the proxy.
- Revisit appending to `Vary` if a cache in front of the Worker misbehaves. See also [2026-10-06-upstream-cors-headers-relayed-under-x-upstream](2026-10-06-upstream-cors-headers-relayed-under-x-upstream.md), which keeps a copy of the upstream's `Vary` for the UI.
