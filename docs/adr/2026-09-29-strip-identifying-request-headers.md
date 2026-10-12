# Identifying headers are stripped before the proxy forwards a request

- **Status:** Accepted
- **Date:** 2026-09-29
- **Source:** orchestrator run `run_20260929_212417`
- **Code:** `backend/src/index.js` (`buildForwardHeaders`, `STRIPPED_REQUEST_HEADERS`, `STRIPPED_HEADER_PREFIX`)

## Context

Originally the Worker removed only `Host` before forwarding. The browser-set `Origin`, `Referer` and `Cookie`, and Cloudflare's own `cf-*` headers (such as `CF-Connecting-IP`), reached arbitrary third-party servers.

## Decision

`buildForwardHeaders` copies the request headers, then deletes `host`, `origin`, `referer`, `cookie` and every header whose lower-cased name starts with `cf-`. Every other header, including custom ones like `X-Api-Key`, passes through unchanged.

## Consequences

- Upstream APIs never see the user's origin, referrer, cookies or Cloudflare client IP.
- Targets that make their own CORS decisions based on `Origin` now see no `Origin`, so a few APIs may answer differently through the proxy than directly. This is intended.
- The `cf-*` strip applies only to the forwarded request, not to response headers relayed back.
