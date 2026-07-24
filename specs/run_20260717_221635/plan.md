# Technical Plan: Cloudflare Workers CORS Proxy Backend

**Run:** run_20260717_221635
**Date:** 2026-07-17

## Summary

Add a standalone `backend/` npm package (outside the pnpm workspace, per PRD) containing a single-file Cloudflare Worker that proxies arbitrary HTTP requests to a `?url=` target and returns the response with CORS headers scoped to an explicit origin allowlist. Ship a `wrangler.json` config and a GitHub Actions workflow that deploys the worker via `cloudflare/wrangler-action@v3` on every push to `main`.

## Approach

- `backend/` is a plain npm project, not added to `pnpm-workspace.yaml` — root tooling (pnpm, the root `vitest run`) is untouched.
- `backend/src/index.js` exports small, independently-testable named functions (origin check, CORS header builder, target-URL parser) plus the Worker's required `default.fetch` entrypoint, so tests can exercise the logic without needing a running Worker.
- CORS handling: `Access-Control-Allow-Origin` is only set when the request's `Origin` header exactly matches one of the 3 allowlisted origins. `OPTIONS` requests short-circuit before any upstream `fetch` call.
- Proxying: for non-OPTIONS requests, the target URL is parsed from `?url=`; the `Host` header is stripped before forwarding (every other header/method/body passes through unmodified); the upstream response is returned with CORS headers merged in.
- Edge case: missing/invalid `url` param returns `400` with a JSON error body — never attempts a `fetch` with a bad URL.
- Tests live at `tests/backend-cors-proxy.test.ts` (matches the existing root-level `tests/` convention, picked up by the unmodified `vitest run` command) and import `backend/src/index.js` directly — no `backend/node_modules` needed since the source file has zero runtime dependencies (only Workers/Fetch API globals, available natively in the Vitest Node environment).
- `backend/package.json`'s `wrangler` devDependency is declared but the plan does not require `npm install` to succeed inside the sandbox (no network guarantee there) — this is a discretionary Coder step, not a tested acceptance criterion.

## Files changed

| File | Action | Purpose |
|------|--------|---------|
| `backend/package.json` | CREATE | Standalone npm manifest; `wrangler` devDependency; `dev`/`deploy` scripts |
| `backend/src/index.js` | CREATE | Worker fetch handler + CORS/proxy logic (named exports + default export) |
| `backend/wrangler.json` | CREATE | Wrangler config, `main: src/index.js`, worker name, compatibility date |
| `backend/.gitignore` | CREATE | Ignore `node_modules`, `.wrangler/`, `.dev.vars` (not covered by root `.gitignore`) |
| `.github/workflows/deploy-proxy.yml` | CREATE | Auto-deploy via `cloudflare/wrangler-action@v3` on push to `main`, `workingDirectory: backend` |
| `tests/backend-cors-proxy.test.ts` | CREATE (by Tester) | Unit tests for CORS allowlist, preflight, proxy forwarding, error handling |

## Interface Contract

This section is the single source of truth for all names. The Tester and Coder read this; neither invents anything independently.

### Module: CORS Proxy Worker
- **File:** `backend/src/index.js`
- **Named exports:**
  ```js
  export const ALLOWED_ORIGINS = [
    'https://andrewratnikov.github.io',
    'http://localhost:3000',
    'http://localhost:5173',
  ]

  // Returns true only if `origin` is exactly one of ALLOWED_ORIGINS.
  export function isAllowedOrigin(origin) { /* ... */ }

  // Returns a plain header object. Includes 'Access-Control-Allow-Origin'
  // only when isAllowedOrigin(origin) is true. Always includes
  // 'Access-Control-Allow-Methods' and 'Access-Control-Allow-Headers'
  // (static, not reflected from the request) when origin is allowed.
  // Returns {} (no CORS headers) when origin is not allowed or is null/undefined.
  export function corsHeadersFor(origin) { /* ... */ }

  // Reads the `url` query parameter from `request`. Returns a URL instance
  // if it is present and a valid absolute URL, otherwise returns null.
  export function extractTargetUrl(request) { /* ... */ }
  ```
- **Default export (Worker entrypoint):**
  ```js
  export default {
    async fetch(request, env, ctx) { /* ... */ }
  }
  ```
  Behavior contract for `fetch`:
  1. `request.method === 'OPTIONS'` → return `new Response(null, { status: 204, headers: corsHeadersFor(origin) })` without calling `extractTargetUrl` or upstream `fetch`.
  2. `extractTargetUrl(request)` returns `null` → return `new Response(JSON.stringify({ error: <string> }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeadersFor(origin) } })`.
  3. Otherwise: forward `request.method`, all request headers except `Host`, and `request.body` (omitted for `GET`/`HEAD`) to the target URL via global `fetch`; return a `new Response(upstreamResponse.body, { status: upstreamResponse.status, headers: <upstream headers merged with corsHeadersFor(origin)> })`.
  4. `origin` in all cases above is `request.headers.get('Origin')`.
- **Test selectors (exact names the Tester must import/reference — nothing else is invented):**
  - `ALLOWED_ORIGINS`
  - `isAllowedOrigin`
  - `corsHeadersFor`
  - `extractTargetUrl`
  - `default` (the Worker object, call `.fetch(request, env, ctx)` — `env`/`ctx` can be passed as `{}` in tests since this Worker uses neither)
- **Dependencies:** none — pure Workers/Fetch API globals (`Request`, `Response`, `Headers`, `fetch`, `URL`), no npm imports at runtime.

### Config: `backend/wrangler.json`
```json
{
  "name": "req-lab-cors-proxy",
  "main": "src/index.js",
  "compatibility_date": "2026-07-17"
}
```

### Config: `backend/package.json` (scripts only — full contract)
```json
{
  "name": "req-lab-cors-proxy-backend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "devDependencies": {
    "wrangler": "^4.0.0"
  }
}
```

### Config: `.github/workflows/deploy-proxy.yml` (structural contract)
- Trigger: `on: push: branches: 'main'`
- Uses `actions/checkout@v4`, then `cloudflare/wrangler-action@v3`
- `wrangler-action` inputs: `apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}`, `workingDirectory: backend`
- Test assertion (from Tester) only checks the file exists, references `cloudflare/wrangler-action@v3`, `workingDirectory: backend` (or `working-directory` under `with:` — exact key is `workingDirectory` per the action's own input name), and `secrets.CLOUDFLARE_API_TOKEN` — it does not attempt to actually run the workflow.

## Acceptance criteria coverage

| Criterion | Satisfied by |
|-----------|-------------|
| 1. Standalone npm package with `wrangler` devDependency | `backend/package.json` |
| 2. `index.js` reads target URL from `?url=` | `extractTargetUrl`, used in `default.fetch` |
| 3. Missing/invalid `url` → 400, CORS headers still applied | `default.fetch` step 2 |
| 4. `OPTIONS` returns CORS headers before any upstream fetch | `default.fetch` step 1 |
| 5. Non-OPTIONS forwards method/headers(-Host)/body, returns upstream response + CORS | `default.fetch` step 3 |
| 6. `Access-Control-Allow-Origin` allowlist of exactly 3 origins, absent otherwise | `ALLOWED_ORIGINS`, `isAllowedOrigin`, `corsHeadersFor` |
| 7. `wrangler.json` with `main: src/index.js` | `backend/wrangler.json` |
| 8. `dev`/`deploy` scripts in `backend/package.json` | `backend/package.json` scripts block |
| 9. `.github/workflows/deploy-proxy.yml` using `wrangler-action@v3` | `.github/workflows/deploy-proxy.yml` |
| 10. Root test command (`npm run test` / `vitest run`) still passes | `backend/` is outside the pnpm workspace and has no runtime deps affecting root; new test file only adds passing tests |

## Risks and open questions

- `npm install` inside `backend/` is not guaranteed to run in the test sandbox (no network access assumption) — the Coder should still write `backend/package.json` correctly, but a missing `backend/package-lock.json` or `backend/node_modules` is not a test failure.
- The exact `wrangler` version pin (`^4.0.0`) is a reasonable current major version; the Coder may adjust the specifier if repo conventions elsewhere pin exact versions, without changing the contract's script names or config shape.
- Header-forwarding edge cases (e.g. duplicate headers, `Content-Length` mismatches after body passthrough) are left to the Coder's discretion beyond stripping `Host`; not separately covered by a numbered acceptance criterion.
