# ReqLab

A browser-based HTTP client — a lightweight, zero-install alternative to Postman. Built with Vue 3 as a hands-on learning project.

## Features

- **Method selector** — GET, POST, PUT, DELETE, PATCH with REST color coding
- **URL bar** — validation + `Cmd/Ctrl+Enter` to send
- **Request headers** — dynamic key/value grid
- **Request body** — raw JSON textarea (disabled for GET), validated before dispatch
- **Response viewer** — pretty-printed JSON, HTTP status, round-trip latency
- **Error handling** — network failure, CORS block, invalid URL, invalid JSON, 30s timeout; all inline, no modals
- **OS theme** — follows `prefers-color-scheme` automatically

> **Browser limitation:** target APIs must support CORS. The app displays a permanent alert with a Chrome `--disable-web-security` workaround guide.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Vue 3 + Vite + TypeScript (`<script setup lang="ts">`) |
| Styling | Tailwind CSS + scoped SCSS |
| Components | PrimeVue (Unstyled/Tailwind mode) |
| State | Native `reactive` / `ref` — no Pinia |
| HTTP | Browser `fetch` API |

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Scripts

```bash
npm run dev          # dev server
npm run build        # production build
npm run preview      # preview production build
npm run type-check   # TypeScript check
npm run lint         # lint
```

## Architecture

All fetch logic, loading state, error state, and latency tracking live in `src/composables/useFetchClient.ts` — never in components.

```
src/
├── composables/
│   └── useFetchClient.ts       # fetch engine: send, cancel, errors, latency
├── components/
│   ├── request/                # MethodSelect, UrlBar, SendButton, HeadersTab, BodyTab
│   ├── response/               # StatusBar, JsonViewer, ErrorMessage
│   └── cors/                   # CorsAlertBanner, CorsWorkaroundModal
├── types/
│   └── http.ts                 # HttpMethod, HeaderEntry, RequestConfig, ResponseResult
└── utils/
    ├── validateUrl.ts
    └── validateJson.ts
```

## License

[MIT](LICENSE)
