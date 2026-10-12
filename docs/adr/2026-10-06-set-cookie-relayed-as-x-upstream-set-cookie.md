# Upstream Set-Cookie is re-sent as `X-Upstream-Set-Cookie`, a JSON array

- **Status:** Accepted (with a known security trade-off)
- **Date:** 2026-10-06
- **Source:** orchestrator run `run_20261006_204152`
- **Code:** `backend/src/index.js` (`UPSTREAM_SET_COOKIE_HEADER`, `buildRelayedResponseHeaders`, trade-off comment above it), `apps/web/src/utils/responseHeaders.ts` (`parseUpstreamSetCookie`)

## Context

Browsers never let page JavaScript read `Set-Cookie`, even when it is listed in `Access-Control-Expose-Headers`. To show cookies for a proxied request, the Worker has to hand them over under a different name. A response can carry several `Set-Cookie` headers. If they are repeated under one name, the browser joins them with `", "`, which is ambiguous because `Expires=Wed, 21 Oct 2026 07:28:00 GMT` contains a comma.

## Decision

- The Worker reads the upstream cookies with `Headers.getSetCookie()`, falling back to `get('set-cookie')`. It deletes the real `Set-Cookie`, so the browser never stores upstream cookies for the proxy's domain. It then sets **one** `X-Upstream-Set-Cookie` header whose value is `JSON.stringify(cookies)`, in upstream order. With no cookies, the header is absent.
- The UI decodes it with `parseUpstreamSetCookie`. If the value is not a JSON array of strings, it shows the raw value as one cookie, so nothing is lost. Each cookie becomes its own `set-cookie` row.

## Alternatives considered

- **Repeat the header, one per cookie.** Rejected: the browser's comma join is ambiguous.
- **Don't show cookies on the proxy path.** Rejected by the user. Seeing cookies is part of debugging an API.

## Consequences

- **Security trade-off, accepted by the user on 2026-10-06:** upstream session cookies become readable by page JavaScript on the allow-listed origins, which browsers normally forbid. This is acceptable only because of the origin gate ([2026-09-29-proxy-rejects-disallowed-origins](2026-09-29-proxy-rejects-disallowed-origins.md)) and because ReqLab is a developer tool that shows the user their own responses. Revisit if the allow-list ever includes origins that run third-party scripts.
- JSON encoding also escapes control characters, so no CR/LF can end up in a header value.
