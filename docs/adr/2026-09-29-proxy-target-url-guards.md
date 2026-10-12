# The proxy only relays to http(s) targets and never to itself

- **Status:** Accepted
- **Date:** 2026-09-29
- **Source:** orchestrator run `run_20260929_212417`
- **Code:** `backend/src/index.js` (`isAllowedProtocol`, `isSelfTarget`, `ALLOWED_PROTOCOLS`)

## Context

`new URL()` happily parses `file:///etc/passwd`, `ftp://…` and `data:…`, so `extractTargetUrl` alone does not stop unsafe schemes. A target pointing back at the Worker's own host creates a proxy loop.

## Decision

After the origin gate and URL parsing, two guards run before any upstream call. Each returns `400` with the usual `{"error": string}` shape:

1. **Protocol:** only `http:` and `https:` (`ALLOWED_PROTOCOLS`).
2. **Self-target:** reject when the target's `hostname` equals the incoming request's `hostname`, compared case-insensitively. **Port is ignored** (`hostname`, not `host`).

## Alternatives considered

- **Compare `host` (with port).** Rejected: a loop on a different port would slip through.
- **Block private and internal IP ranges (full SSRF protection) and DNS rebinding.** Explicitly out of scope. Only the same-host loop and non-http(s) schemes are covered.

## Consequences

- During local `wrangler dev`, `http://localhost:8787` proxying to `http://localhost:3000` is rejected as a loop. This was accepted because the deployed Worker is never on localhost.
- The proxy can still reach internal or private addresses that resolve from Cloudflare's network. Revisit if the proxy's audience grows beyond the allow-listed origins.
