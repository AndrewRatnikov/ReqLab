# The CORS proxy rejects requests from origins outside the allow-list

- **Status:** Accepted
- **Date:** 2026-09-29
- **Source:** orchestrator run `run_20260929_212417` (Worker hardening)
- **Code:** `backend/src/index.js` (`default.fetch`, `isAllowedOrigin`), `tests/backend-cors-proxy-hardening.test.ts`

## Context

The Worker in `backend/` lets ReqLab retry CORS-blocked requests through a relay. Before this change, `ALLOWED_ORIGINS` only decided whether the Worker *added* CORS headers to its response. It forwarded every request upstream regardless of `Origin`. Any non-browser client (curl, a script, a server) could therefore use the Worker as a free open relay to any `http(s)` host.

## Decision

For every request except an `OPTIONS` preflight, the Worker checks `Origin` against `ALLOWED_ORIGINS` first. A missing or unlisted origin gets `403` with body `{"error":"Origin not allowed"}`, `Content-Type: application/json`, `Vary: Origin` and no `Access-Control-*` headers. This check runs before the target URL is parsed and before any upstream `fetch`.

The `OPTIONS` preflight branch runs *before* this gate. A preflight from a disallowed origin still gets `204` with no CORS headers, as before, so the browser blocks the real request itself.

## Alternatives considered

- **Keep the allow-list for response headers only** (the previous behaviour). Rejected: it leaves the open relay in place.
- **Rate limiting or API keys.** Out of scope for this change. The origin gate is the only access control.

## Consequences

- The proxy can no longer be used from curl or a server without forging an `Origin` header. `Origin` can still be forged outside a browser, so this stops casual abuse, not a determined attacker.
- Adding a new front-end origin (for example a preview deploy) means editing `ALLOWED_ORIGINS` and redeploying the Worker.
- Manual check after a deploy: `curl 'https://<worker-host>/?url=https://example.com'` with no `Origin` must return 403.
