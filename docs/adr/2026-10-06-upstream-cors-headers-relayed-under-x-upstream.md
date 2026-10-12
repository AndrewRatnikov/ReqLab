# Upstream `Access-Control-*` and `Vary` are kept under `X-Upstream-*` names

- **Status:** Accepted
- **Date:** 2026-10-06
- **Source:** orchestrator run `run_20261006_204152`
- **Code:** `backend/src/index.js` (`buildRelayedResponseHeaders`, `UPSTREAM_HEADER_PREFIX`), `apps/web/src/utils/responseHeaders.ts` (`toDisplayHeaders`)

## Context

The Worker overwrites `Access-Control-*` and `Vary` with its own values: they are the real CORS headers the browser enforces. Without anything else, the panel would show the proxy's CORS policy as if it were the target API's.

## Decision

**Worker.** In order:

1. Delete the reserved relay names if the upstream sent them: `x-upstream-set-cookie`, `x-upstream-vary`, and anything starting with `x-upstream-access-control-`. This is anti-spoofing.
2. Copy every upstream `access-control-*` header and `vary` to `X-Upstream-<name>`.
3. Apply the Worker's own CORS headers and `Vary: Origin`.

Upstream `Access-Control-*` headers the Worker doesn't set itself (for example `Access-Control-Max-Age`) also stay on the response as before. Other upstream `x-upstream-*` names pass through untouched.

**UI, proxy path only.** `toDisplayHeaders(entries, true)`:

- strips the `x-upstream-` prefix from the relay copies and shows them under the real names;
- drops the un-prefixed `access-control-*` and `vary`, which are the proxy's;
- expands `x-upstream-set-cookie` into `set-cookie` rows;
- sorts the result by name.

On the direct path the list is shown unchanged.

## Alternatives considered

- **Hide upstream CORS headers.** Rejected. They matter when debugging why a direct request was blocked.
- **Show both sets, labelled with a per-row "proxy" badge.** Dropped. The browser never exposed the Worker's `vary` and `access-control-*` to the page, so the badge would never have appeared.

## Consequences

- The "upstream's value" label is trustworthy. Only the Worker can produce the reserved relay names, so an upstream cannot forge "its own" CORS headers or cookies in the UI.
- If an upstream sends `X-Upstream-Vary` without `Vary`, that header disappears. This is the only filtering of upstream headers.
- An upstream header that happens to be called e.g. `x-upstream-latency` is shown as-is.
