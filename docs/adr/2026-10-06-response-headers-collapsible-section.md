# Response headers appear in a collapsed native `<details>` under the status bar, with a different note per path

- **Status:** Accepted
- **Date:** 2026-10-06
- **Source:** orchestrator run `run_20261006_204152` (user's answers to decisions 1 and 4 and to the note question)
- **Code:** `apps/web/src/components/response/ResponseHeaders.vue`, `ResponsePanel.vue`, `apps/web/src/utils/responseHeaders.ts` (`DIRECT_HEADERS_NOTE`, `PROXY_HEADERS_NOTE`)

## Context

Response headers had to be added to the response panel without disturbing the status bar, the JSON body, the non-JSON message or the five error states. On direct requests, the browser may hide headers the server didn't expose ([2026-10-06-proxy-exposes-all-relayed-headers](2026-10-06-proxy-exposes-all-relayed-headers.md)), and the UI must say so rather than pretend the list is complete.

## Decision

- **Layout:** a collapsible section between `StatusBar` and `JsonViewer`, built with native `<details>`/`<summary>` (no PrimeVue component). It is **collapsed by default** and collapses again on every new response, because `send()` clears `response` and the section remounts. The title is `Response headers (N)`.
- **When shown:** for any HTTP response, including non-2xx. Never in the loading, error or idle states.
- **Note, always shown first inside the section:**
  - Direct path: "Some headers may be hidden by the browser (CORS). Only headers the server exposes to the page are shown."
  - Proxy path: headers were relayed through the CORS proxy, Set-Cookie comes from `X-Upstream-Set-Cookie`, and `Access-Control-*`/`Vary` are the target server's values, not the proxy's.

## Alternatives considered

- **A Body/Headers tab pair, like the request panel.** The user picked the collapsible section instead.
- **No note** (silent), or **the same note on both paths.** Rejected. After [2026-10-06-proxy-exposes-all-relayed-headers](2026-10-06-proxy-exposes-all-relayed-headers.md) the proxy path is complete while the direct path may not be, so each path gets its own wording.

## Consequences

- The default view of a response is unchanged until the user expands the section.
- `useFetchClient` now records `viaProxy` and the full header list on `ResponseResult`. All fetch and state logic stays in the composable, as `CLAUDE.md` requires.
