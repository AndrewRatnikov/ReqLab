# Backlog: ReqLab

Derived from [prd.md](./prd.md). Organized into sequential build options (milestones), each shippable/demoable on its own. Build in order — later options depend on composables and components from earlier ones.

---

## Option 0 — Project Scaffold

Goal: a running Vue 3 + TS + Vite app with the tooling the rest of the work depends on.

### 0.0 — Git init
- [ ] `git init`
- [ ] Add a `.gitignore` (node_modules, dist, .env, editor/OS cruft)
- [ ] Initial commit with `CLAUDE.md` and `docs/`

### 0.1 — Vite + Vue 3 + TypeScript init
- [ ] `npm create vite@latest` with `vue-ts` template
- [ ] Verify `<script setup lang="ts">` works in a placeholder `App.vue`
- [ ] Commit baseline `package.json`, `tsconfig.json`, `vite.config.ts`

### 0.2 — Tailwind CSS setup
- [ ] Install Tailwind, PostCSS, Autoprefixer
- [ ] `tailwind.config.ts` with content globs for `src/**/*.vue`
- [ ] Import Tailwind layers in `src/assets/styles/main.scss`

### 0.3 — Component library install (PrimeVue, Unstyled mode)
- [ ] Install `primevue` (+ `primeicons` if icons needed for Option 4's info icon)
- [ ] Configure in Unstyled mode (no default themed CSS — Tailwind drives all styling)
- [ ] Register only the primitives needed: `Select`/`Dropdown`, `Button`, `Dialog`, `Tabs`/`TabView`, `InputText`, `Textarea`
- [ ] Smoke-test one primitive (e.g. a Button) renders unstyled-but-functional

### 0.4 — Lint & type-check tooling
- [ ] ESLint config (`@vue/eslint-config-typescript` or equivalent) + Prettier if desired
- [ ] Wire `npm run lint` and `npm run type-check` scripts
- [ ] Confirm both pass on the scaffold with zero errors

### 0.5 — Base layout shell
- [ ] `App.vue` with two-region split (request panel left/top, response panel right/bottom)
- [ ] CSS grid/flex breakpoint: side-by-side on `lg+`, stacked below
- [ ] Reserve a slot at the top for the future CORS banner (Option 4)

### 0.6 — Theme baseline (NFR-4)
- [ ] `prefers-color-scheme` media query driving CSS variables (background/text/border colors)
- [ ] No toggle yet — OS-driven only

**Exit criteria:** `npm run dev` shows an empty two-pane layout that respects OS theme; lint/type-check are clean.

> **Decision made:** Component library is **PrimeVue (Unstyled mode)**. `MethodSelect.vue` (2.1) uses PrimeVue `Select`, `SendButton.vue` (2.3) uses `Button`, `CorsWorkaroundModal.vue` (4.2) uses `Dialog`, tab container (2.6) uses `TabView`/`Tabs`.

---

## Option 1 — Core Request Composable (NFR-1)

Goal: the fetch/loading/error/latency engine, with zero UI coupling.

### 1.1 — Shared types
- [ ] `src/types/http.ts`: `HttpMethod`, `HeaderEntry`, `RequestConfig`, `ResponseResult`, `ClientError` (discriminated union: `network | cors | timeout | invalid-url | invalid-json`)

### 1.2 — Validation utils
- [ ] `src/utils/validateUrl.ts` — must start with `http://`/`https://` (FR-4.3)
- [ ] `src/utils/validateJson.ts` — `JSON.parse` guard returning ok/error (FR-4.4)

### 1.3 — `useFetchClient` reactive state
- [ ] `method`, `url`, `headers` (array of `{key, value}`), `body` refs
- [ ] `loading`, `response`, `error`, `latencyMs` refs
- [ ] Empty-header-row filtering before building the request (FR-2.1)

### 1.4 — `send()` core
- [ ] Builds `fetch` call from current state, strips body only for `GET` (body allowed for `DELETE`/`POST`/`PUT`/`PATCH`), starts latency timer (`performance.now()`)
- [ ] Sets `loading = true` / resets `error`/`response` on dispatch

### 1.5 — Timeout & cancel
- [ ] `AbortController` wired to `send()`; 30s auto-abort → `timeout` error (FR-4.5)
- [ ] Manual `cancel()` method exposed for the future Send/Cancel button (FR-1.3)

### 1.6 — Error classification
- [ ] Map fetch rejection reasons to `network` vs `cors` vs `timeout` vs generic (FR-4.1, FR-4.2, FR-4.5)
- [ ] Note: browsers don't expose a distinct "CORS" error — classify via heuristic (TypeError with opaque response / no status) and document the limitation

### 1.7 — Manual verification harness
- [ ] Temporary scratch component or `console.log` driver (deleted before Option 2 lands) hitting a real public API to confirm all paths fire correctly

**Exit criteria:** composable can hit a real endpoint, return status/body/latency, and surface each error type distinctly, independent of any component.

---

## Option 2 — Request Panel UI

Goal: user can configure and fire a request.

### 2.1 — `MethodSelect.vue`
- [ ] Dropdown for `GET/POST/PUT/DELETE/PATCH`, `v-model` bound (FR-1.1)
- [ ] Per-method color token (GET green, POST blue, PUT yellow, DELETE red, PATCH purple/orange)

### 2.2 — `UrlBar.vue`
- [ ] Text input, `v-model` bound (FR-1.2)
- [ ] Red border + inline message on invalid URL using `validateUrl` from 1.2 (FR-4.3)
- [ ] `Cmd/Ctrl+Enter` keybinding to trigger send from this field

### 2.3 — `SendButton.vue`
- [ ] Idle → loading (spinner) → cancel-clickable state machine, driven by `useFetchClient.loading` (FR-1.3)
- [ ] Calls `send()` / `cancel()` from the composable

### 2.4 — `HeadersTab.vue`
- [ ] Key/value grid, each row `v-model`-bound to a `HeaderEntry`
- [ ] "Add Row" appends an empty pair; rows with empty key are filtered out on send (FR-2.1)
- [ ] Delete-row affordance per row

### 2.5 — `BodyTab.vue`
- [ ] Raw textarea, `v-model` bound
- [ ] Fully disabled (input + visual dimming) only when `method === 'GET'`; enabled for `DELETE`/`POST`/`PUT`/`PATCH` (FR-2.2)
- [ ] On send attempt: red border + inline message via `validateJson` if malformed (FR-4.4)

### 2.6 — Tab container
- [ ] Simple tab switcher (Headers / Body) below the URL bar, no extra state library — local `ref<'headers' | 'body'>`

### 2.7 — `RequestPanel.vue` composition
- [ ] Wires 2.1–2.6 together against a single `useFetchClient()` instance
- [ ] Global Cmd/Ctrl+Enter listener scoped to the request panel (not just the URL bar)

**Exit criteria:** can configure and send a GET/POST request to a public CORS-enabled API and see `loading` flip correctly; invalid URL/body block dispatch with inline errors.

---

## Option 3 — Response Panel UI

Goal: visualize what came back.

### 3.1 — `StatusBar.vue`
- [ ] HTTP status code + text, color-coded (2xx green, 4xx/5xx red) (FR-3.1)
- [ ] Latency in ms, sourced from `useFetchClient.latencyMs`
- [ ] Hidden/empty state before first send

### 3.2 — `JsonViewer.vue`
- [ ] Pretty-print (`JSON.stringify(_, null, 2)`) in monospace font, in a plain scrollable container — no virtualization for MVP, even for large payloads (FR-3.2)
- [ ] Detect non-JSON (`Content-Type` check + parse fallback) → render: _"Response is not JSON. Non-JSON rendering is not supported in MVP."_ (FR-3.2)

### 3.3 — `ErrorMessage.vue`
- [ ] Single component rendering the right copy per `ClientError` variant from 1.1:
  - network (FR-4.1), cors (FR-4.2), timeout (FR-4.5)
- [ ] Red, inline, replaces response body area entirely — no modal

### 3.4 — `ResponsePanel.vue` composition
- [ ] Switches between: empty state / loading state / `StatusBar` + `JsonViewer` / `ErrorMessage`
- [ ] Single source of truth: `useFetchClient` instance shared with `RequestPanel` (likely via a parent-level composable instance passed down, or provide/inject)

### 3.5 — End-to-end manual pass
- [ ] Success (JSON), success (non-JSON, e.g. an HTML-returning endpoint), network failure (bad host), CORS block (known non-CORS API), timeout (slow/hanging endpoint or mock)

**Exit criteria:** full request → response loop works end-to-end through the UI for success, non-JSON, and all 4 error categories.

---

## Option 4 — CORS Guidance (Section 6.2)

Goal: set user expectations and give a workaround path.

### 4.1 — `CorsAlertBanner.vue`
- [ ] Permanent, non-dismissible banner pinned at the top of the viewport, above the request panel
- [ ] Exact copy: _"Browser Security Alert: Outbound target APIs must support CORS for direct browser clients."_
- [ ] Info icon affordance that opens 4.2's modal

### 4.2 — `CorsWorkaroundModal.vue`
- [ ] Step-by-step instructions for launching Chrome with `--disable-web-security --user-data-dir=...`
- [ ] Close on overlay click / Esc / explicit close button

### 4.3 — Cross-link from error state
- [ ] `ErrorMessage.vue`'s CORS variant (3.3) includes a "see workaround guide above" reference/anchor link back to the banner's info icon (FR-4.2 copy)

**Exit criteria:** banner always visible; modal opens/closes; CORS failures visibly point users to it.

---

## Option 5 — Polish & Hardening

Goal: MVP-ready.

### 5.1 — Responsive pass
- [ ] Verify split-pane → stacked transition at the breakpoint set in 0.5 across realistic viewport widths
- [ ] Headers/body tabs remain usable on small screens (no horizontal scroll traps)

### 5.2 — Keyboard-friendliness pass
- [ ] Tab order through method → URL → send → tabs → grid rows
- [ ] Visible focus states on all interactive elements
- [ ] `Cmd/Ctrl+Enter` fires send from any focused field inside the request panel, not just the URL bar

### 5.3 — Response panel empty/initial states
- [ ] First-load placeholder before any request has been sent
- [ ] Distinct from "loading" and "error" states

### 5.4 — Static checks clean
- [ ] `npm run type-check` zero errors
- [ ] `npm run lint` zero errors/warnings

### 5.5 — FR-4.x regression matrix
- [ ] Manually re-verify all 5 error states (network, CORS, invalid URL, invalid JSON, timeout) against real and/or mocked endpoints after all UI wiring is in place
- [ ] Confirm no regressions introduced by 5.1/5.2 styling changes

**Exit criteria:** PRD §4 and §6 fully satisfied; ready to call MVP "Approved" status shipped.

---

## Explicitly Out of Scope (do not build, per PRD §7 / §6.3)

- Auth, accounts, session recovery
- Multi-tenant sync, history/logging
- Shared workspaces
- Environment variables / `{{baseUrl}}` templating
- Pinia, or any state library beyond native `reactive`/`ref`
- Node/Express proxy server (Phase 2 roadmap — not MVP)

## Post-MVP (v1.1, mentioned in PRD but deferred)

- Theme toggle button overriding `prefers-color-scheme`, persisted to `localStorage` (NFR-4)
- Virtualized rendering in `JsonViewer.vue` for large response payloads (MVP uses plain scroll) (NFR-5)
- Display of response headers, in addition to status/latency/body (NFR-5)

---

## Folder Structure

```
reqlab/
├── CLAUDE.md
├── docs/
│   ├── prd.md
│   └── backlog.md
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── package.json
└── src/
    ├── main.ts
    ├── App.vue                      # two-region layout shell + CORS banner
    ├── assets/
    │   └── styles/
    │       └── main.scss            # global scoped-free styles, theme vars
    ├── composables/
    │   └── useFetchClient.ts        # NFR-1: all fetch/loading/error/latency logic
    ├── components/
    │   ├── request/
    │   │   ├── RequestPanel.vue     # composes method/url/send + tabs
    │   │   ├── MethodSelect.vue     # FR-1.1
    │   │   ├── UrlBar.vue           # FR-1.2, FR-4.3
    │   │   ├── SendButton.vue       # FR-1.3
    │   │   ├── HeadersTab.vue       # FR-2.1
    │   │   └── BodyTab.vue          # FR-2.2, FR-4.4
    │   ├── response/
    │   │   ├── ResponsePanel.vue    # composes status bar + body/error
    │   │   ├── StatusBar.vue        # FR-3.1
    │   │   ├── JsonViewer.vue       # FR-3.2
    │   │   └── ErrorMessage.vue     # FR-4.1/4.2/4.5 rendering
    │   └── cors/
    │       ├── CorsAlertBanner.vue  # §6.2 permanent alert
    │       └── CorsWorkaroundModal.vue
    ├── types/
    │   └── http.ts                  # Method, Header, RequestState, ResponseState types
    └── utils/
        ├── validateUrl.ts           # FR-4.3
        └── validateJson.ts          # FR-4.4
```

Notes:
- Each `.vue` component pairs with `<style lang="scss" scoped>` per NFR-3 — no separate stylesheet files per component.
- `types/` and `utils/` are plain `.ts`, no Vue dependency, kept testable in isolation.
- No `store/` directory — state lives in `useFetchClient` and local component `reactive`/`ref` per NFR (no Pinia).
