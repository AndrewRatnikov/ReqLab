# The proxy exposes every relayed upstream header to the page

- **Status:** Accepted
- **Date:** 2026-10-06
- **Source:** orchestrator run `run_20261006_204152` (response headers in the response panel)
- **Code:** `backend/src/index.js` (`buildRelayedResponseHeaders`), `tests/backend-cors-proxy-headers.test.ts`

## Context

ReqLab started showing response headers. A page can read a cross-origin response's headers only if they are CORS-safelisted (`Cache-Control`, `Content-Type`, …) or listed in `Access-Control-Expose-Headers`. The Worker sent no `Access-Control-Expose-Headers`, so on the proxy path the panel could show only two or three headers. A header list that silently shows two or three headers for a typical API is a product bug, not an edge case.

The first plan kept the Worker unchanged and showed only a "some headers may be hidden" note. The architect showed that on the proxy path this would display almost nothing. On 2026-10-06 the user chose to change the Worker instead.

## Decision

After building the relayed response headers, the Worker sets `Access-Control-Expose-Headers` to an **explicit, de-duplicated, lower-cased list of every header name in the response**, joined with `", "`. This includes the `x-upstream-*` copies from [2026-10-06-set-cookie-relayed-as-x-upstream-set-cookie](2026-10-06-set-cookie-relayed-as-x-upstream-set-cookie.md) and [2026-10-06-upstream-cors-headers-relayed-under-x-upstream](2026-10-06-upstream-cors-headers-relayed-under-x-upstream.md). The upstream's own `Access-Control-Expose-Headers` is replaced; its value is preserved as `X-Upstream-Access-Control-Expose-Headers`. `set-cookie` and `access-control-expose-headers` itself are never listed.

## Alternatives considered

- **Leave the Worker unchanged and only show a note.** Rejected: the proxy path would show almost nothing.
- **`Access-Control-Expose-Headers: *`.** Rejected. The wildcard does not work for credentialed requests, and explicit names keep working if the client ever sends credentials.
- **Cap or truncate the list.** Rejected: a cap silently hides headers, which is exactly the bug being fixed. The list grows linearly with the upstream's own headers, well within Cloudflare's header-size limits for realistic APIs.

## Consequences

- On the proxy path the panel shows the upstream's full header set.
- The Worker must be deployed before, or together with, the web app. If the web app ships first, proxied requests show only safelisted headers.
- Direct (non-proxied) requests are still limited by what the target server exposes. [2026-10-06-response-headers-collapsible-section](2026-10-06-response-headers-collapsible-section.md) covers how the UI explains that.
