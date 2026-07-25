# PRD: Migrate req-lab to a pnpm monorepo

**Run:** run_20260716_133354
**Date:** 2026-07-16

## Goal

req-lab is currently a single-package Vue app managed with npm (package-lock.json at the root). The maintainer wants to convert it into a pnpm-managed monorepo so the project can grow additional packages in the future without a second migration. The existing app moves into `apps/web`, a root `pnpm-workspace.yaml` is introduced, npm artifacts are replaced with pnpm equivalents, and CI is updated to install/build with pnpm. Success is verified with a small set of automated structural/build checks rather than a full test suite, since none exists today.

## User stories

- As the maintainer, I want the app moved into `apps/web` under a pnpm workspace so future packages (e.g. a shared UI kit or API) can be added alongside it without restructuring again.
- As the maintainer, I want npm's `package-lock.json` replaced by a pnpm lockfile so the whole team uses one package manager consistently.
- As a CI maintainer, I want `.github/workflows/deploy.yml` updated to install and build with pnpm so the pipeline doesn't break after the migration.
- As the maintainer, I want a minimal automated check that `pnpm install`, workspace package resolution, and the app's build/type-check scripts still succeed after the migration, so a regression is caught before merge.

## Acceptance criteria

1. A root `pnpm-workspace.yaml` exists declaring `apps/*` (and `packages/*` for future use) as workspace members.
2. The existing app's files (`src/`, `public/`, `index.html`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.ts`, `package.json`) are relocated under `apps/web/`, with import paths and relative config references (e.g. `tsconfig.json` references, `vite.config.ts` root) updated so the app still builds from its new location.
3. The root `package.json` is reduced to a workspace-level manifest (name, private:true, workspace scripts) with no app-specific dependencies; `apps/web/package.json` retains the app's own dependencies (vue, primevue, primeicons, sass, tailwindcss) and scripts (dev, build, preview, type-check, lint).
4. `package-lock.json` is removed and replaced by a `pnpm-lock.yaml` generated via `pnpm install`; `node_modules` is regenerated under pnpm.
5. A root-level `.npmrc` (or existing one updated) is compatible with pnpm workspaces (e.g. no npm-specific settings that conflict).
6. `.github/workflows/deploy.yml` is updated to set up pnpm (e.g. via `pnpm/action-setup`) and run install/build commands through pnpm instead of npm.
7. Root `package.json` scripts allow running the app's `dev`, `build`, `type-check`, and `lint` scripts from the repo root via pnpm workspace filtering (e.g. `pnpm --filter web build`).
8. Vitest is added as a dev dependency (at the root or in `apps/web`) with a new automated test suite that verifies: (a) `pnpm-workspace.yaml` lists `apps/web` as a member, (b) `apps/web/package.json` is valid and contains the expected scripts, (c) the app's `build` and `type-check` scripts complete successfully against the new layout.
9. `pnpm install` completes successfully from the repo root with no unresolved workspace dependencies.
10. `pnpm --filter web build` and `pnpm --filter web type-check` complete successfully after the migration.

## Out of scope

- Extracting any shared code (composables, utils, types) into a separate `packages/*` workspace package — the app moves as a single unit into `apps/web`.
- Adding a task orchestrator such as Turborepo or Nx — plain pnpm workspace commands (`pnpm -r`, `pnpm --filter`) are used instead.
- Writing unit tests for existing application logic (`validateJson`, `validateUrl`, `useFetchClient`, Vue components) — only migration/build verification tests are in scope.
- Any change to the app's runtime behavior, UI, or dependency versions beyond what's required to relocate it into the workspace.

## Open questions

None.
