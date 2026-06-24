# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**ReqLab** — a browser-based HTTP client (Postman alternative) built as a Vue 3 learning project by an experienced React developer.

## Tech Stack

- **Framework:** Vue 3 SPA via Vite, `<script setup lang="ts">`
- **Styling:** Tailwind CSS + scoped SCSS (`<style lang="scss" scoped>`)
- **Component library:** PrimeVue (Unstyled/Tailwind mode) or shadcn-vue
- **State:** Native Vue 3 `reactive`/`ref` only — no Pinia
- **HTTP:** Native browser `fetch` API

## Commands

```bash
npm install          # install deps
npm run dev          # dev server
npm run build        # production build
npm run preview      # preview production build
npm run type-check   # TypeScript check
npm run lint         # lint
```

## Architecture

### Key Composable

All fetch logic, loading state, error state, and latency tracking must live in `src/composables/useFetchClient.ts` — not in components. This is an explicit architectural requirement (NFR-1).

### Component Structure (planned)

The app is a single-page layout with two regions:

**Request panel (top/left):**

- Method dropdown (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`) with REST color coding per method
- URL bar with validation; submits on `Cmd/Ctrl+Enter`
- Send button that transitions to loading/cancel during in-flight requests
- Tabs below the URL bar:
  - **Headers tab:** key-value grid, "Add Row" appends empty inputs, empty rows ignored on send
  - **Body tab:** raw textarea; disabled + blocked when method is `GET`; validates JSON before dispatch

**Response panel (bottom/right):**

- Status bar: HTTP status code + text (2xx green, 4xx/5xx red) + round-trip latency in ms
- Body: pretty-printed JSON in monospace font; if response is not JSON, show inline message (no non-JSON rendering in MVP)
- Error states replace response body content (red, inline — no modals):
  - Network failure, CORS block, request timeout (30s auto-abort)
  - Invalid URL → field-level error, request blocked
  - Invalid JSON body → textarea-level error, request blocked

### Theme

MVP uses `prefers-color-scheme` CSS media query to mirror OS setting — no toggle. Post-release (v1.1): add a toggle button that overrides system preference and persists to `localStorage`.

### CORS Constraint

The app runs entirely in the browser, so target APIs must support CORS. The UI must show a permanent alert: _"Browser Security Alert: Outbound target APIs must support CORS for direct browser clients."_ An info icon opens a modal with Chrome `--disable-web-security` workaround instructions.

### Vue Patterns to Follow

- Use `v-model` for form fields, headers grid, and URL input — not one-way binding with `@input`/`onChange`
- Use `<style lang="scss" scoped>` for component styles
- Keep composables decoupled from template markup
