# Architecture Decision Records

Architecture Decision Records for ReqLab: one file per decision, named `YYYY-MM-DD-slug.md` after the date it was made.

The nine ADRs below were **backfilled on 2026-10-11** from the AI Orchestrator's run records (plan, PRD, questions and answers) for the two runs whose records never reached this repo:

- `run_20260929_212417` (Worker hardening)
- `run_20261006_204152` (response headers)

Each was checked against the code on `main` at `757d485`.

| Date | Decision | Status |
|---|---|---|
| [2026-09-29](2026-09-29-preflight-reflects-requested-headers.md) | The preflight response reflects the requested headers, and `Vary` is always set | Accepted |
| [2026-09-29](2026-09-29-proxy-rejects-disallowed-origins.md) | The CORS proxy rejects requests from origins outside the allow-list | Accepted |
| [2026-09-29](2026-09-29-proxy-target-url-guards.md) | The proxy only relays to http(s) targets and never to itself | Accepted |
| [2026-09-29](2026-09-29-strip-identifying-request-headers.md) | Identifying headers are stripped before the proxy forwards a request | Accepted |
| [2026-10-06](2026-10-06-proxy-exposes-all-relayed-headers.md) | The proxy exposes every relayed upstream header to the page | Accepted |
| [2026-10-06](2026-10-06-response-headers-collapsible-section.md) | Response headers appear in a collapsed native `<details>` under the status bar, with a different note per path | Accepted |
| [2026-10-06](2026-10-06-set-cookie-relayed-as-x-upstream-set-cookie.md) | Upstream Set-Cookie is re-sent as `X-Upstream-Set-Cookie`, a JSON array | Accepted (with a known security trade-off) |
| [2026-10-06](2026-10-06-ui-logic-in-pure-functions-tested-by-root-vitest.md) | Web UI logic is tested as pure functions by the root Vitest, not by component tests | Accepted |
| [2026-10-06](2026-10-06-upstream-cors-headers-relayed-under-x-upstream.md) | Upstream `Access-Control-*` and `Vary` are kept under `X-Upstream-*` names | Accepted |

## Earlier decisions

These are not written up as ADRs. Their plans are already in the repo:

- `specs/run_20260716_133354/`: move to a pnpm workspace with the Vue app in `apps/web` and `packages/*` reserved; `onlyBuiltDependencies` for esbuild and `@parcel/watcher`.
- `specs/run_20260717_221635/`: the CORS proxy is a standalone npm package in `backend/` (a Cloudflare Worker, outside the pnpm workspace), deployed by `.github/workflows/deploy-proxy.yml`.
- `docs/prd.md` and `CLAUDE.md`: product requirements and front-end architecture.

## Adding a new ADR

The orchestrator writes ADRs for its runs (stage 6d, `orch-adr-writer`). To add one by hand,
copy an existing file. Name it `YYYY-MM-DD-short-slug.md` (the date the decision was made,
lowercase kebab-case slug) and add a row to the table above.

```markdown
# <the decision, stated as a sentence>

- **Status:** Accepted | Superseded by [YYYY-MM-DD-slug](YYYY-MM-DD-slug.md)
- **Date:** YYYY-MM-DD
- **Source:** <run id, PR or discussion>
- **Code:** <main files>

## Context
## Decision
## Alternatives considered
## Consequences
```

Don't edit an accepted ADR's decision. Write a new ADR that supersedes it, and change only
the old one's Status line.
