# Web UI logic is tested as pure functions by the root Vitest, not by component tests

- **Status:** Accepted
- **Date:** 2026-10-06
- **Source:** orchestrator run `run_20261006_204152` (user's answer to decision 3)
- **Code:** `apps/web/src/utils/responseHeaders.ts`, `tests/response-headers.test.ts`

## Context

`apps/web` has no component test setup: no `test` script, no jsdom, no `@vue/test-utils`. The only tests are root-level Vitest files in `tests/`, covering the Worker and the monorepo layout. The response-headers feature needed tests for its client-side logic. The constraint was no new dependencies without a justification against testing pure functions.

## Decision

- Put the testable logic in a plain module, `apps/web/src/utils/responseHeaders.ts`: Headers to entries, Set-Cookie decoding, the proxy display mapping, note and title text.
- The module has **no Vue import and no `@/` alias import**. Its only import is a relative `import type`, so the root Vitest can import it as `../apps/web/src/utils/responseHeaders` with no config change. This was verified in a throwaway worktree.
- Components and composables (`ResponseHeaders.vue`, `useFetchClient.ts`) stay thin. They are covered by `pnpm type-check`, `pnpm build` and a manual check, not by unit tests.

## Alternatives considered

- **Add jsdom and `@vue/test-utils` to `apps/web`.** Rejected for now. It would add devDependencies and test config for a small amount of logic that is easier to test as pure functions.

## Consequences

- No new devDependencies, and the root `pnpm test` stays the single test command.
- Modules meant for root tests must avoid `@/` imports. The composable may keep using the alias.
- Component behaviour (rendering, collapse state) is not covered by automated tests. Revisit by adding a component test setup if UI regressions start slipping through.
