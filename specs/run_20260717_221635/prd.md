# PRD: Cloudflare Workers CORS Proxy Backend

**Run:** run_20260717_221635
**Date:** 2026-07-17

## Goal

The `apps/web` frontend needs to call third-party APIs that don't send permissive CORS headers, so requests fail in the browser. This task adds a `/backend` package — a Cloudflare Worker — that sits between the frontend and any target API: it accepts a request with a `?url=` query parameter, forwards the method/headers/body to that target, and returns the response with CORS headers scoped to the production GitHub Pages origin (and local dev origins). It also wires up automatic deployment via GitHub Actions so every push to `main` ships the latest Worker code without a manual `wrangler deploy`.

## User stories

- As the frontend developer, I want to send a request to the proxy with `?url=<target>` so that the browser is not blocked by the target API's missing CORS headers.
- As the frontend developer, I want the proxy to forward my request's method, headers, and body unmodified so that the proxied API sees the same request I intended to send.
- As a browser making a CORS preflight (`OPTIONS`) request, I want the proxy to respond immediately with the correct `Access-Control-*` headers so the actual request is allowed to proceed.
- As the project maintainer, I want `Access-Control-Allow-Origin` restricted to the production site and local dev ports so the proxy can't be used as an open relay from arbitrary origins.
- As the project maintainer, I want pushes to `main` to auto-deploy the Worker via GitHub Actions so I never have to run `wrangler deploy` by hand.

## Acceptance criteria

1. `/backend` contains a standalone Node/npm package (its own `package.json`, not managed by the root pnpm workspace) with `wrangler` listed under `devDependencies`.
2. `/backend/src/index.js` exports a Worker `fetch` handler that reads the target URL from the `url` query parameter of the incoming request.
3. If the `url` query parameter is missing or is not a valid absolute URL, the Worker returns a 400 response (with CORS headers still applied) instead of throwing or forwarding an empty request.
4. An incoming `OPTIONS` request returns a 204/200 response containing `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, and `Access-Control-Allow-Headers` before any upstream fetch is attempted.
5. For non-OPTIONS requests, the Worker forwards the original method, headers (minus hop-by-hop/host headers that must not be forwarded), and body to the target URL, and returns the upstream response body/status back to the client with CORS headers added.
6. `Access-Control-Allow-Origin` is computed per-request from an allowlist containing exactly: `https://andrewratnikov.github.io`, `http://localhost:3000`, `http://localhost:5173`. If the request's `Origin` header is not in the allowlist, no `Access-Control-Allow-Origin` header is set (request is not treated as CORS-allowed).
7. `/backend/wrangler.json` exists and sets `main` to `src/index.js` (plus a worker `name` and compatibility date).
8. `/backend/package.json` contains a `dev` script (`wrangler dev`) and a `deploy` script (`wrangler deploy`).
9. `.github/workflows/deploy-proxy.yml` exists, triggers on push to `main`, uses `cloudflare/wrangler-action@v3`, sets `workingDirectory: backend`, and passes `apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}`.
10. The existing root-level test command (`npm run test` / `vitest run`) continues to pass unmodified — this package must not break the existing `apps/web` test suite.

## Out of scope

- Actual deployment/registration of the Worker to a real Cloudflare account, or creation/validation of the `CLOUDFLARE_API_TOKEN` secret in GitHub — this task only creates the code and workflow, not live infrastructure.
- Rate limiting, authentication, or abuse protection on the proxy beyond the origin allowlist.
- Changing `apps/web` to actually call the new proxy (no frontend integration/consumption code in this task).
- Adding the `backend` package to the root pnpm workspace — it is a standalone npm project per requirement 1.
- Caching, retries, or streaming-body edge cases beyond a standard `fetch`-based forward.

## Open questions

None — requirements are fully specified.
